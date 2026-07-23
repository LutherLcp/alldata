/**
 * 分析引擎 V1 — 事件分析查询
 */
import { FastifyInstance } from 'fastify';
import { getRedisClient } from '@/common/utils/redis';

export interface AnalysisQuery {
  project_id: number;
  event_name: string;
  metrics: Array<{ type: 'count' | 'uv' | 'pv'; alias?: string }>;
  dimensions?: string[];
  filters?: Array<{ field: string; op: string; value: any }>;
  time_range: { start: string; end: string; granularity?: string };
  limit?: number;
}

export class AnalysisService {
  private prisma;

  constructor(private app: FastifyInstance) {
    this.prisma = app.prisma;
  }

  /** 执行事件分析查询 */
  async runEventAnalysis(query: AnalysisQuery) {
    // 生成缓存 key
    const cacheKey = `analysis:${JSON.stringify(query)}`;
    const redis = getRedisClient();

    // 检查缓存
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // 构建 ClickHouse 查询（V2 阶段接入真实 ClickHouse）
    // 目前返回 mock 数据
    const result = this.buildMockResult(query);

    // 缓存 5 分钟
    await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);

    return result;
  }

  /** 取消查询 */
  async cancelQuery(queryId: string) {
    // TODO: KILL QUERY in ClickHouse
    return { cancelled: true, query_id: queryId };
  }

  /** Mock 结果（V2 阶段替换为真实 ClickHouse 查询） */
  private buildMockResult(query: AnalysisQuery) {
    const { start, end, granularity = 'day' } = query.time_range;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const days: string[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      days.push(d.toISOString().split('T')[0]);
    }

    const series = query.metrics.map((m) => ({
      metric: m.type,
      alias: m.alias || m.type,
      data: days.map((date) => ({
        date,
        value: Math.floor(Math.random() * 1000) + 100,
        ...(query.dimensions?.length
          ? { groups: query.dimensions.map((dim) => ({ dimension: dim, value: `group_${Math.floor(Math.random() * 3)}` })) }
          : {}),
      })),
    }));

    return {
      query_id: crypto.randomUUID(),
      columns: ['date', ...query.metrics.map((m) => m.alias || m.type)],
      rows: days.length,
      series,
      elapsed_ms: Math.floor(Math.random() * 500) + 50,
    };
  }
}
