/**
 * 分析查询构建器 — 将分析 DSL 编译为参数化的 ClickHouse SQL
 *
 * 安全约束（重要）：
 * 1. **列名/维度名绝不参与字符串拼接**：标量列只能取自 `SCALAR_COLUMNS` 白名单，
 *    其余一律按属性键处理，并通过 `JSONExtractString(properties, {参数})` 传值；
 * 2. **所有取值一律走参数占位符**（`{name:Type}` + query_params），不拼接；
 * 3. **project_id 谓词由构建器强制注入**，调用方无法绕过（多租户隔离的底线）；
 * 4. 操作符取自 `OPERATORS` 白名单，非法操作符直接抛错。
 *
 * 表结构以 docker/clickhouse/init.sql 为准（表 `events`，时间列 `event_time`）。
 */

/** 事件表可直接查询的标量列白名单 */
export const SCALAR_COLUMNS = {
  event_name: 'String',
  device_type: 'String',
  os: 'String',
  browser: 'String',
  country: 'String',
  region: 'String',
} as const;

export type ScalarColumn = keyof typeof SCALAR_COLUMNS;

/** 支持的操作符白名单：DSL 操作符 → SQL 片段 */
export const OPERATORS = {
  eq: '=',
  neq: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  in: 'IN',
  not_in: 'NOT IN',
  like: 'LIKE',
  not_like: 'NOT LIKE',
} as const;

export type Operator = keyof typeof OPERATORS;

/** 时间粒度白名单：粒度 → 时间列表达式 */
const GRANULARITY = {
  hour: 'toStartOfHour(event_time)',
  day: 'toDate(event_time)',
  week: 'toStartOfWeek(event_time)',
  month: 'toStartOfMonth(event_time)',
} as const;

export type Granularity = keyof typeof GRANULARITY;

/** 指标白名单：指标 → SQL 聚合表达式 */
const METRIC_SQL = {
  count: 'count()',
  pv: 'count()',
  uv: 'uniqExact(user_id)',
} as const;

export type MetricType = keyof typeof METRIC_SQL;

export type AnalysisType = 'event' | 'funnel' | 'retention' | 'distribution' | 'path' | 'attribute';

export interface AnalysisFilter {
  field: string;
  op: string;
  value: unknown;
}

export interface AnalysisMetric {
  type: string;
  alias?: string;
}

export interface AnalysisInput {
  type: AnalysisType;
  project_id: number;
  event_name?: string;
  metrics?: AnalysisMetric[];
  dimensions?: string[];
  filters?: AnalysisFilter[];
  time_range: { start: string; end: string; granularity?: string };
  limit?: number;
  /** 漏斗步骤事件（按顺序） */
  funnel_events?: string[];
  /** 漏斗窗口（秒），默认 7 天 */
  funnel_window_seconds?: number;
  /** 留存：初始事件 */
  retention_event?: string;
  /** 留存：回访事件 */
  retention_return_event?: string;
  /** 归因：转化目标事件 */
  target_event?: string;
  /** 归因：渠道属性键，默认 channel */
  channel_property?: string;
  /** 路径分析：每用户保留的最大步数 */
  max_steps?: number;
}

export interface BuiltQuery {
  sql: string;
  params: Record<string, unknown>;
}

export class QueryBuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QueryBuildError';
  }
}

const MAX_LIMIT = 1000;
const DEFAULT_LIMIT = 100;

/**
 * 将输入时间归一化为 ClickHouse DateTime 可接受的格式。
 * 非法输入直接抛错，避免把原始字符串带进查询。
 */
function normalizeDateTime(value: string, field: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new QueryBuildError(`${field} 不是合法的日期时间: ${String(value).slice(0, 32)}`);
  }
  return parsed.toISOString().slice(0, 19).replace('T', ' ');
}

function resolveLimit(limit?: number): number {
  if (limit === undefined) return DEFAULT_LIMIT;
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new QueryBuildError('limit 必须是正整数');
  }
  return Math.min(Math.floor(limit), MAX_LIMIT);
}

/**
 * 解析筛选字段为 SQL 表达式。
 * 标量列走白名单；其余视为属性键，通过参数取值——两者都不做字符串拼接。
 */
function resolveFilterField(field: string, index: number, params: Record<string, unknown>): string {
  if (!field || typeof field !== 'string') {
    throw new QueryBuildError('筛选字段不能为空');
  }
  if (Object.hasOwn(SCALAR_COLUMNS, field)) {
    return field;
  }
  const key = `filter_key_${index}`;
  params[key] = field;
  return `JSONExtractString(properties, {${key}:String})`;
}

/** 构建 WHERE 子句（不含 project_id，由调用方统一附加） */
function buildFilters(filters: AnalysisFilter[] | undefined): {
  clause: string;
  params: Record<string, unknown>;
} {
  const params: Record<string, unknown> = {};
  if (!filters || filters.length === 0) return { clause: '', params };

  const parts: string[] = [];
  filters.forEach((filter, i) => {
    const op = OPERATORS[filter.op as Operator];
    if (!op) {
      throw new QueryBuildError(`不支持的操作符: ${String(filter.op).slice(0, 20)}`);
    }

    const expr = resolveFilterField(filter.field, i, params);
    const key = `filter_value_${i}`;

    if (filter.op === 'in' || filter.op === 'not_in') {
      if (!Array.isArray(filter.value)) {
        throw new QueryBuildError(`${filter.op} 操作符的取值必须是数组`);
      }
      params[key] = filter.value.map((v) => String(v));
      parts.push(`${expr} ${op} {${key}:Array(String)}`);
    } else {
      params[key] = String(filter.value);
      parts.push(`${expr} ${op} {${key}:String}`);
    }
  });

  return { clause: parts.join(' AND '), params };
}

/** 解析分组维度为 SQL 表达式 + 输出别名 */
function resolveDimensions(
  dimensions: string[] | undefined,
  params: Record<string, unknown>,
): { selectExprs: string[]; aliases: string[] } {
  const selectExprs: string[] = [];
  const aliases: string[] = [];

  (dimensions ?? []).forEach((dim, i) => {
    if (Object.hasOwn(SCALAR_COLUMNS, dim)) {
      // 标量列：列名来自白名单，安全
      selectExprs.push(dim);
      aliases.push(dim);
      return;
    }
    // 属性维度：键作为参数传入，不拼接
    const key = `dim_key_${i}`;
    const alias = `dim_${i}`;
    params[key] = dim;
    selectExprs.push(`JSONExtractString(properties, {${key}:String}) AS ${alias}`);
    aliases.push(alias);
  });

  return { selectExprs, aliases };
}

/** 公共的 FROM/时间/project 谓词 */
function baseWhere(
  input: AnalysisInput,
  params: Record<string, unknown>,
  extraClause = '',
): string {
  if (!Number.isInteger(input.project_id) || input.project_id <= 0) {
    throw new QueryBuildError('project_id 必须是正整数');
  }
  params.project_id = input.project_id;
  params.start_time = normalizeDateTime(input.time_range?.start, 'time_range.start');
  params.end_time = normalizeDateTime(input.time_range?.end, 'time_range.end');

  const conditions = [
    // 多租户隔离：强制注入，调用方无法绕过
    'project_id = {project_id:UInt32}',
    'event_time >= {start_time:DateTime}',
    'event_time < {end_time:DateTime}',
  ];
  if (extraClause) conditions.push(extraClause);
  return conditions.join('\n    AND ');
}

function requireEventName(input: AnalysisInput, field = 'event_name'): string {
  const name = field === 'event_name' ? input.event_name : undefined;
  if (!name || typeof name !== 'string') {
    throw new QueryBuildError(`${field} 为必填参数`);
  }
  return name;
}

// ────────────────────────────────────────────────────────────
// 各分析类型的 SQL 构建
// ────────────────────────────────────────────────────────────

/** 事件分析：按时间粒度 + 维度聚合指标 */
export function buildEventQuery(input: AnalysisInput): BuiltQuery {
  const params: Record<string, unknown> = {};
  const granularity = (input.time_range.granularity ?? 'day') as Granularity;
  const timeExpr = GRANULARITY[granularity];
  if (!timeExpr) {
    throw new QueryBuildError(`不支持的时间粒度: ${String(granularity).slice(0, 20)}`);
  }

  const metrics = input.metrics?.length ? input.metrics : [{ type: 'count' }];
  const metricExprs = metrics.map((m, i) => {
    const expr = METRIC_SQL[m.type as MetricType];
    if (!expr) throw new QueryBuildError(`不支持的指标类型: ${String(m.type).slice(0, 20)}`);
    const alias = m.alias || m.type || `metric_${i}`;
    if (!/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(alias)) {
      throw new QueryBuildError('指标别名只允许字母、数字和下划线');
    }
    return `${expr} AS ${alias}`;
  });

  const { selectExprs, aliases } = resolveDimensions(input.dimensions, params);
  const filters = buildFilters(input.filters);
  Object.assign(params, filters.params);

  params.event_name = requireEventName(input);
  params.limit = resolveLimit(input.limit);

  const groupBy = ['dt', ...aliases];
  const sql = `
SELECT
  ${timeExpr} AS dt,
  ${selectExprs.length ? `${selectExprs.join(',\n  ')},` : ''}
  ${metricExprs.join(',\n  ')}
FROM events
WHERE ${baseWhere(input, params, 'event_name = {event_name:String}')}
  ${filters.clause ? `AND ${filters.clause}` : ''}
GROUP BY ${groupBy.join(', ')}
ORDER BY dt ASC
LIMIT {limit:UInt32}`.trim();

  return { sql, params };
}

/** 漏斗分析：windowFunnel 计算每步到达用户数 */
export function buildFunnelQuery(input: AnalysisInput): BuiltQuery {
  const steps = input.funnel_events;
  if (!steps || steps.length < 2) {
    throw new QueryBuildError('漏斗分析至少需要 2 个步骤事件');
  }
  if (steps.length > 10) {
    throw new QueryBuildError('漏斗步骤最多支持 10 步');
  }

  const params: Record<string, unknown> = {};
  const stepConditions = steps.map((_, i) => `event_name = {funnel_step_${i}:String}`);
  steps.forEach((name, i) => {
    params[`funnel_step_${i}`] = name;
  });

  params.funnel_events = steps;
  params.window_seconds = input.funnel_window_seconds ?? 7 * 24 * 3600;
  if (!Number.isInteger(params.window_seconds) || (params.window_seconds as number) <= 0) {
    throw new QueryBuildError('funnel_window_seconds 必须是正整数');
  }

  const filters = buildFilters(input.filters);
  Object.assign(params, filters.params);

  const sql = `
SELECT
  level,
  count() AS users
FROM (
  SELECT
    user_id,
    windowFunnel({window_seconds:UInt32})(event_time, ${stepConditions.join(',\n      ')}) AS level
  FROM events
  WHERE ${baseWhere(input, params, 'event_name IN {funnel_events:Array(String)}')}
    ${filters.clause ? `AND ${filters.clause}` : ''}
  GROUP BY user_id
)
GROUP BY level
ORDER BY level ASC`.trim();

  return { sql, params };
}

/** 留存分析：按首日分群统计后续回访 */
export function buildRetentionQuery(input: AnalysisInput): BuiltQuery {
  const initialEvent = input.retention_event || input.event_name;
  if (!initialEvent) {
    throw new QueryBuildError('留存分析需要 retention_event（初始事件）');
  }
  const returnEvent = input.retention_return_event || initialEvent;

  const params: Record<string, unknown> = {};
  params.retention_event = initialEvent;
  params.return_event = returnEvent;
  params.max_offset = Math.max(1, Math.min(Number(input.limit) || 7, 90));

  const sql = `
SELECT
  cohort_dt,
  day_offset,
  uniqExact(user_id) AS users
FROM (
  SELECT
    e.user_id AS user_id,
    c.cohort_dt AS cohort_dt,
    dateDiff('day', c.cohort_dt, toDate(e.event_time)) AS day_offset
  FROM events AS e
  INNER JOIN (
    SELECT
      user_id,
      toDate(min(event_time)) AS cohort_dt
    FROM events
    WHERE ${baseWhere(input, params, 'event_name = {retention_event:String}')}
    GROUP BY user_id
  ) AS c ON e.user_id = c.user_id
  WHERE e.project_id = {project_id:UInt32}
    AND e.event_name = {return_event:String}
    AND e.event_time >= {start_time:DateTime}
    AND e.event_time < {end_time:DateTime}
    AND toDate(e.event_time) >= c.cohort_dt
)
WHERE day_offset <= {max_offset:UInt32}
GROUP BY cohort_dt, day_offset
ORDER BY cohort_dt ASC, day_offset ASC`.trim();

  return { sql, params };
}

/** 分布分析：按维度取值聚合用户数/事件数 */
export function buildDistributionQuery(input: AnalysisInput): BuiltQuery {
  const dimension = input.dimensions?.[0] ?? 'device_type';
  const params: Record<string, unknown> = {};
  const { selectExprs, aliases } = resolveDimensions([dimension], params);
  const filters = buildFilters(input.filters);
  Object.assign(params, filters.params);
  params.limit = resolveLimit(input.limit);

  if (input.event_name) params.event_name = input.event_name;

  const sql = `
SELECT
  ${selectExprs[0]},
  uniqExact(user_id) AS users,
  count() AS events
FROM events
WHERE ${baseWhere(input, params, input.event_name ? 'event_name = {event_name:String}' : '')}
  ${filters.clause ? `AND ${filters.clause}` : ''}
GROUP BY ${aliases[0]}
ORDER BY users DESC
LIMIT {limit:UInt32}`.trim();

  return { sql, params };
}

/** 路径分析：按用户聚合事件序列，取 Top 路径 */
export function buildPathQuery(input: AnalysisInput): BuiltQuery {
  const params: Record<string, unknown> = {};
  const filters = buildFilters(input.filters);
  Object.assign(params, filters.params);
  params.limit = resolveLimit(input.limit);
  params.max_steps = Math.max(2, Math.min(Number(input.max_steps) || 5, 10));

  // 注意：ClickHouse 的 groupArray 不保证聚合顺序，
  // 因此按 (event_time, event_name) 排序后再提取事件名，确保路径序列稳定。
  const sql = `
SELECT
  path,
  count() AS users
FROM (
  SELECT
    user_id,
    arrayStringConcat(
      arraySlice(
        arrayMap(x -> x.2, arraySort(groupArray((event_time, event_name)))),
        1,
        {max_steps:UInt32}
      ),
      ' > '
    ) AS path
  FROM events
  WHERE ${baseWhere(input, params)}
    ${filters.clause ? `AND ${filters.clause}` : ''}
  GROUP BY user_id
)
WHERE path != ''
GROUP BY path
ORDER BY users DESC
LIMIT {limit:UInt32}`.trim();

  return { sql, params };
}

/** 归因分析：按渠道（属性键）统计转化 */
export function buildAttributionQuery(input: AnalysisInput): BuiltQuery {
  const targetEvent = input.target_event || input.event_name;
  if (!targetEvent) {
    throw new QueryBuildError('归因分析需要 target_event（转化目标事件）');
  }
  const channelKey = input.channel_property || 'channel';

  const params: Record<string, unknown> = {};
  params.target_event = targetEvent;
  params.channel_key = channelKey;
  params.limit = resolveLimit(input.limit);

  const filters = buildFilters(input.filters);
  Object.assign(params, filters.params);

  const sql = `
SELECT
  channel,
  uniqExact(user_id) AS users,
  count() AS conversions
FROM (
  SELECT
    user_id,
    JSONExtractString(properties, {channel_key:String}) AS channel
  FROM events
  WHERE ${baseWhere(input, params, 'event_name = {target_event:String}')}
    ${filters.clause ? `AND ${filters.clause}` : ''}
)
GROUP BY channel
ORDER BY conversions DESC
LIMIT {limit:UInt32}`.trim();

  return { sql, params };
}

/** 统一入口：按分析类型分发 */
export function buildAnalysisQuery(input: AnalysisInput): BuiltQuery {
  switch (input.type) {
    case 'funnel':
      return buildFunnelQuery(input);
    case 'retention':
      return buildRetentionQuery(input);
    case 'distribution':
      return buildDistributionQuery(input);
    case 'path':
      return buildPathQuery(input);
    case 'attribute':
      return buildAttributionQuery(input);
    case 'event':
      return buildEventQuery(input);
    default:
      throw new QueryBuildError(`不支持的分析类型: ${String(input.type).slice(0, 20)}`);
  }
}
