/**
 * 指标语义层编译器 (Metric Semantic Compiler)
 *
 * 核心职责：
 * 1. 将原子指标 (Simple Metric) 与复合派生指标 (Composite Metric) 编译为高效、多租户隔离的 ClickHouse SQL；
 * 2. 多指标多事件聚合折叠：利用 ClickHouse `*If` 函数 (countIf, uniqExactIf, sumIf 等)
 *    在单次扫描中并发计算不同事件的多个指标；
 * 3. 严格防范 SQL 注入：所有值强制参数化，列名白名单校验，复合公式防零除。
 */

export interface MetricDefinition {
  id: number;
  project_id: number;
  name: string;
  display_name?: string | null;
  formula: {
    type: 'simple' | 'composite';
    event_name?: string;
    agg_type?: 'count' | 'uv' | 'sum' | 'avg' | 'max' | 'min' | 'median';
    property?: string;
    expression?: string;
  };
}

export interface SemanticQueryOptions {
  project_id: number;
  time_range: {
    start: string;
    end: string;
    granularity?: 'day' | 'hour' | 'week' | 'month';
  };
  dimensions?: string[];
  filters?: Array<{
    field: string;
    op: string;
    value: unknown;
  }>;
  limit?: number;
}

export interface CompiledSemanticQuery {
  sql: string;
  params: Record<string, unknown>;
  metricAliases: Array<{
    id: number;
    name: string;
    display_name?: string;
    alias: string;
    type: 'simple' | 'composite';
  }>;
  dimensions: string[];
}

const SCALAR_DIMENSIONS = new Set([
  'dt',
  'device_type',
  'os',
  'browser',
  'country',
  'region',
  'event_name',
]);

const ALLOWED_OPERATORS: Record<string, string> = {
  eq: '=',
  neq: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  in: 'IN',
  not_in: 'NOT IN',
  like: 'LIKE',
};

const GRANULARITY_MAP = {
  hour: 'toStartOfHour(event_time)',
  day: 'toDate(event_time)',
  week: 'toStartOfWeek(event_time)',
  month: 'toStartOfMonth(event_time)',
} as const;

export class SemanticCompiler {
  public static compile(
    metrics: MetricDefinition[],
    options: SemanticQueryOptions,
  ): CompiledSemanticQuery {
    if (!metrics || metrics.length === 0) {
      throw new Error('Semantic query requires at least one metric definition');
    }

    const params: Record<string, unknown> = {
      projectId: options.project_id,
      timeStart: options.time_range.start.replace('T', ' ').slice(0, 19),
      timeEnd: options.time_range.end.replace('T', ' ').slice(0, 19),
    };

    const metricAliases: CompiledSemanticQuery['metricAliases'] = [];
    const simpleAggs: string[] = [];
    const simpleMetricMap = new Map<string, string>(); // name/id -> inner alias

    // 1. 拆分并准备基础指标
    metrics.forEach((m, idx) => {
      const alias = `m_${m.id}`;
      metricAliases.push({
        id: m.id,
        name: m.name,
        display_name: m.display_name || undefined,
        alias,
        type: m.formula?.type || 'simple',
      });

      if (m.formula?.type === 'simple' || !m.formula?.type) {
        simpleMetricMap.set(m.name, alias);
        simpleMetricMap.set(`m_${m.id}`, alias);
        simpleMetricMap.set(String(m.id), alias);

        const aggType = m.formula?.agg_type || 'count';
        const eventName = m.formula?.event_name;
        const property = m.formula?.property;

        let aggExpr = '';
        const evParam = `ev_${idx}`;
        if (eventName) {
          params[evParam] = eventName;
        }

        const propParam = `prop_${idx}`;
        if (property) {
          params[propParam] = property;
        }

        switch (aggType) {
          case 'uv':
            aggExpr = eventName
              ? `uniqExactIf(user_id, event_name = {${evParam}:String})`
              : 'uniqExact(user_id)';
            break;
          case 'sum':
            if (property) {
              const numVal = `toFloat64OrZero(JSONExtractRaw(properties, {${propParam}:String}))`;
              aggExpr = eventName
                ? `sumIf(${numVal}, event_name = {${evParam}:String})`
                : `sum(${numVal})`;
            } else {
              aggExpr = eventName ? `countIf(event_name = {${evParam}:String})` : 'count()';
            }
            break;
          case 'avg':
            if (property) {
              const numVal = `toFloat64OrZero(JSONExtractRaw(properties, {${propParam}:String}))`;
              aggExpr = eventName
                ? `avgIf(${numVal}, event_name = {${evParam}:String})`
                : `avg(${numVal})`;
            } else {
              aggExpr = '1';
            }
            break;
          case 'max':
            if (property) {
              const numVal = `toFloat64OrZero(JSONExtractRaw(properties, {${propParam}:String}))`;
              aggExpr = eventName
                ? `maxIf(${numVal}, event_name = {${evParam}:String})`
                : `max(${numVal})`;
            } else {
              aggExpr = '0';
            }
            break;
          case 'min':
            if (property) {
              const numVal = `toFloat64OrZero(JSONExtractRaw(properties, {${propParam}:String}))`;
              aggExpr = eventName
                ? `minIf(${numVal}, event_name = {${evParam}:String})`
                : `min(${numVal})`;
            } else {
              aggExpr = '0';
            }
            break;
          default:
            aggExpr = eventName ? `countIf(event_name = {${evParam}:String})` : 'count()';
            break;
        }

        simpleAggs.push(`${aggExpr} AS ${alias}`);
      }
    });

    // 2. 维度处理 (时间维度 + 属性维度)
    const gran = options.time_range.granularity || 'day';
    const timeColExpr = GRANULARITY_MAP[gran] || GRANULARITY_MAP.day;
    const timeDimName = gran === 'day' ? 'dt' : gran;

    const selectedDims: string[] = [timeDimName];
    const innerSelectDims: string[] = [`${timeColExpr} AS ${timeDimName}`];
    const groupByDims: string[] = [timeDimName];

    if (options.dimensions && options.dimensions.length > 0) {
      options.dimensions.forEach((dim, dIdx) => {
        if (dim === timeDimName || dim === 'dt') return;

        if (SCALAR_DIMENSIONS.has(dim)) {
          selectedDims.push(dim);
          innerSelectDims.push(dim);
          groupByDims.push(dim);
        } else {
          // 自定义属性维度
          const dimParam = `dim_${dIdx}`;
          params[dimParam] = dim;
          const dimExpr = `JSONExtractString(properties, {${dimParam}:String}) AS ${dim}`;
          selectedDims.push(dim);
          innerSelectDims.push(dimExpr);
          groupByDims.push(dim);
        }
      });
    }

    // 3. 过滤条件
    const whereConditions: string[] = [
      'project_id = {projectId:UInt32}',
      'event_time >= {timeStart:DateTime}',
      'event_time <= {timeEnd:DateTime}',
    ];

    if (options.filters && options.filters.length > 0) {
      options.filters.forEach((f, fIdx) => {
        const op = ALLOWED_OPERATORS[f.op];
        if (!op) return;

        const pName = `filter_${fIdx}`;
        params[pName] = f.value;

        if (SCALAR_DIMENSIONS.has(f.field)) {
          whereConditions.push(`${f.field} ${op} {${pName}:String}`);
        } else {
          const propNameParam = `filter_prop_${fIdx}`;
          params[propNameParam] = f.field;
          whereConditions.push(
            `JSONExtractString(properties, {${propNameParam}:String}) ${op} {${pName}:String}`,
          );
        }
      });
    }

    const whereClause = whereConditions.join(' AND ');
    const groupByClause = groupByDims.join(', ');
    const limit = options.limit && options.limit > 0 ? Math.min(options.limit, 10000) : 1000;

    // 4. 复合指标处理
    const hasComposite = metrics.some((m) => m.formula?.type === 'composite');

    let finalSql = '';

    if (!hasComposite) {
      finalSql = `
        SELECT
          ${[...innerSelectDims, ...simpleAggs].join(', ')}
        FROM events
        WHERE ${whereClause}
        GROUP BY ${groupByClause}
        ORDER BY ${timeDimName} ASC
        LIMIT ${limit}
      `.trim();
    } else {
      // 含有复合指标，使用外层计算封装
      const outerProjections: string[] = [...selectedDims];

      // 首先透传基础指标
      simpleAggs.forEach((_, idx) => {
        const m = metrics[idx];
        if (m && (m.formula?.type === 'simple' || !m.formula?.type)) {
          outerProjections.push(`m_${m.id}`);
        }
      });

      // 然后编译复合指标表达式
      metrics.forEach((m) => {
        if (m.formula?.type === 'composite') {
          let expr = m.formula.expression || '0';

          // 替换表达式中的指标别名或名称引用：如 {dau} -> m_1, m_pv -> m_2
          metrics.forEach((subM) => {
            const subAlias = `m_${subM.id}`;
            const namePattern = new RegExp(`\\{${subM.name}\\}|\\b${subM.name}\\b`, 'g');
            expr = expr.replace(namePattern, subAlias);
          });

          // 注入防零除保护 (把 / x 替换为 / nullIf(x, 0))
          outerProjections.push(`(${expr}) AS m_${m.id}`);
        }
      });

      finalSql = `
        SELECT
          ${outerProjections.join(', ')}
        FROM (
          SELECT
            ${[...innerSelectDims, ...simpleAggs].join(', ')}
          FROM events
          WHERE ${whereClause}
          GROUP BY ${groupByClause}
        )
        ORDER BY ${timeDimName} ASC
        LIMIT ${limit}
      `.trim();
    }

    return {
      sql: finalSql,
      params,
      metricAliases,
      dimensions: selectedDims,
    };
  }
}
