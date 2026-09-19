/**
 * 分析引擎 — 6 种分析类型
 * event(事件分析) / funnel(漏斗) / retention(留存) / distribution(分布) / path(路径) / attribute(归因)
 *
 * 查询经 `query-builder` 编译为参数化 ClickHouse SQL，由 `chQuery` 执行。
 * 构建器负责注入安全与 project_id 强制隔离。
 */
import { chQuery } from '@/common/utils/clickhouse';
import { getRedisClient } from '@/common/utils/redis';
import { type AnalysisInput, QueryBuildError, buildAnalysisQuery } from './query-builder';

export interface AnalysisQuery extends Omit<AnalysisInput, 'type'> {
  type?: string;
}

const CACHE_TTL_SECONDS = 300;

export class AnalysisService {
  /**
   * 执行分析查询（根据 type 分发）。
   * project_id 必须由调用方从已校验的请求上下文注入，不可取自请求体。
   */
  async runAnalysis(query: AnalysisQuery) {
    const type = (query.type || 'event') as AnalysisInput['type'];
    const input: AnalysisInput = { ...query, type, project_id: query.project_id };

    const cacheKey = `analysis:${input.project_id}:${type}:${JSON.stringify({
      ...input,
      project_id: undefined,
    })}`;
    const redis = getRedisClient();

    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      // 缓存不可用时不影响查询本身
    }

    const started = Date.now();
    const { sql, params } = buildAnalysisQuery(input);
    const rows = await chQuery<Record<string, unknown>>(sql, params);
    const elapsed = Date.now() - started;

    const result = this.transform(type, input, rows, elapsed);

    try {
      await redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS);
    } catch {
      // 忽略缓存写入失败
    }
    return result;
  }

  /** 取消查询（当前为占位实现，ClickHouse 侧 KILL QUERY 待接入） */
  async cancelQuery(queryId: string) {
    return { cancelled: true, query_id: queryId };
  }

  // ─── 结果转换：ClickHouse 行 → 前端契约 ──────────────────

  private transform(
    type: string,
    input: AnalysisInput,
    rows: Record<string, unknown>[],
    elapsed: number,
  ): Record<string, unknown> {
    const query_id = crypto.randomUUID();
    switch (type) {
      case 'funnel':
        return this.toFunnel(rows, input, query_id, elapsed);
      case 'retention':
        return this.toRetention(rows, query_id, elapsed);
      case 'distribution':
        return this.toDistribution(rows, query_id, elapsed);
      case 'path':
        return this.toPath(rows, query_id, elapsed);
      case 'attribute':
        return this.toAttribution(rows, query_id, elapsed);
      default:
        return this.toEvent(rows, input, query_id, elapsed);
    }
  }

  private toEvent(
    rows: Record<string, unknown>[],
    input: AnalysisInput,
    query_id: string,
    elapsed: number,
  ) {
    const metricAliases = (input.metrics?.length ? input.metrics : [{ type: 'count' }]).map(
      (m) => m.alias || m.type || 'count',
    );
    const dims = this.dimensionAliases(input.dimensions);
    const series = metricAliases.map((alias) => ({
      metric: alias,
      alias,
      data: rows.map((row) => ({
        date: this.toDateString(row.dt),
        ...Object.fromEntries(dims.map((d) => [d, row[d]])),
        value: Number(row[alias] ?? 0),
      })),
    }));
    return {
      query_id,
      type: 'event',
      columns: ['date', ...dims, ...metricAliases],
      rows: rows.length,
      series,
      elapsed_ms: elapsed,
    };
  }

  private toFunnel(
    rows: Record<string, unknown>[],
    input: AnalysisInput,
    query_id: string,
    elapsed: number,
  ) {
    const events = input.funnel_events ?? [];
    // windowFunnel 返回达到的层级：level >= i 即表示到达第 i 步
    const reached = events.map((_, i) => {
      const stepIndex = i + 1;
      return rows
        .filter((r) => Number(r.level) >= stepIndex)
        .reduce((sum, r) => sum + Number(r.users ?? 0), 0);
    });
    const total = reached[0] ?? 0;
    const steps = events.map((event, i) => ({
      step: i + 1,
      event,
      count: reached[i],
      rate: total > 0 ? Number(((reached[i] / total) * 100).toFixed(2)) : 0,
    }));
    return {
      query_id,
      type: 'funnel',
      steps,
      total_conversion: steps.length ? steps[steps.length - 1].rate : 0,
      elapsed_ms: elapsed,
    };
  }

  private toRetention(rows: Record<string, unknown>[], query_id: string, elapsed: number) {
    const byCohort = new Map<string, Map<number, number>>();
    for (const row of rows) {
      const cohort = this.toDateString(row.cohort_dt);
      const offset = Number(row.day_offset ?? 0);
      const users = Number(row.users ?? 0);
      if (!byCohort.has(cohort)) byCohort.set(cohort, new Map());
      byCohort.get(cohort)?.set(offset, users);
    }

    const matrix = [...byCohort.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, offsets]) => {
        const base = offsets.get(0) ?? 0;
        const maxOffset = Math.max(...offsets.keys());
        const retention_rates: number[] = [];
        for (let day = 0; day <= maxOffset; day++) {
          const users = offsets.get(day) ?? 0;
          retention_rates.push(base > 0 ? Number(((users / base) * 100).toFixed(2)) : 0);
        }
        return { date, base_users: base, retention_rates };
      });

    return { query_id, type: 'retention', matrix, elapsed_ms: elapsed };
  }

  private toDistribution(rows: Record<string, unknown>[], query_id: string, elapsed: number) {
    const buckets = rows.map((r) => String(r.dim_0 ?? r.device_type ?? '未知'));
    const values = rows.map((r) => Number(r.users ?? 0));
    return {
      query_id,
      type: 'distribution',
      buckets,
      values,
      total: values.reduce((a, b) => a + b, 0),
      elapsed_ms: elapsed,
    };
  }

  /** 把 Top 路径字符串还原为前端需要的节点/连线图 */
  private toPath(rows: Record<string, unknown>[], query_id: string, elapsed: number) {
    const nodeIndex = new Map<string, string>();
    const nodes: Array<{ id: string; name: string }> = [];
    const linkWeights = new Map<string, number>();

    const ensureNode = (name: string): string => {
      const existing = nodeIndex.get(name);
      if (existing) return existing;
      const id = String(nodes.length);
      nodeIndex.set(name, id);
      nodes.push({ id, name });
      return id;
    };

    for (const row of rows) {
      const path = String(row.path ?? '');
      if (!path) continue;
      const users = Number(row.users ?? 0);
      const steps = path.split(' > ');
      for (let i = 0; i < steps.length - 1; i++) {
        const source = ensureNode(steps[i]);
        const target = ensureNode(steps[i + 1]);
        const key = `${source}->${target}`;
        linkWeights.set(key, (linkWeights.get(key) ?? 0) + users);
      }
    }

    const links = [...linkWeights.entries()].map(([key, value]) => {
      const [source, target] = key.split('->');
      return { source, target, value };
    });

    return { query_id, type: 'path', nodes, links, elapsed_ms: elapsed };
  }

  private toAttribution(rows: Record<string, unknown>[], query_id: string, elapsed: number) {
    const conversions = rows.map((r) => Number(r.conversions ?? 0));
    const total = conversions.reduce((a, b) => a + b, 0);
    const attributes = rows.map((row, i) => ({
      channel: String(row.channel || '未知'),
      conversions: conversions[i],
      users: Number(row.users ?? 0),
      // 末次触点口径下的转化占比
      contribution: total > 0 ? Number(((conversions[i] / total) * 100).toFixed(2)) : 0,
    }));
    return { query_id, type: 'attribute', attributes, elapsed_ms: elapsed };
  }

  // ─── 工具方法 ─────────────────────────────────────────

  /** ClickHouse 的 Date/DateTime 字段序列化可能为字符串或数字 */
  private toDateString(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'string') return value.slice(0, 10);
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === 'number') return new Date(value).toISOString().slice(0, 10);
    return String(value).slice(0, 10);
  }

  /** 维度输出别名：标量列用列名，属性维度用 dim_i（与构建器保持一致） */
  private dimensionAliases(dimensions?: string[]): string[] {
    return (dimensions ?? []).map((dim, i) => {
      const scalar = ['event_name', 'device_type', 'os', 'browser', 'country', 'region'];
      return scalar.includes(dim) ? dim : `dim_${i}`;
    });
  }
}

export { QueryBuildError };
