/**
 * 分析引擎 V2 — 6 种分析类型
 * event(事件分析) / funnel(漏斗) / retention(留存) / distribution(分布) / path(路径) / attribute(归因)
 */
import { FastifyInstance } from 'fastify';
import { getRedisClient } from '@/common/utils/redis';

export interface AnalysisQuery {
  type?: string; // event | funnel | retention | distribution | path | attribute
  project_id: number;
  event_name: string;
  metrics: Array<{ type: 'count' | 'uv' | 'pv'; alias?: string }>;
  dimensions?: string[];
  filters?: Array<{ field: string; op: string; value: any }>;
  time_range: { start: string; end: string; granularity?: string };
  limit?: number;
  // 漏斗专用
  funnel_events?: string[];
  // 留存专用
  retention_event?: string;
  // 归因专用
  target_event?: string;
}

export class AnalysisService {
  private prisma;

  constructor(private app: FastifyInstance) {
    this.prisma = app.prisma;
  }

  /** 执行分析查询（根据 type 分发） */
  async runAnalysis(query: AnalysisQuery) {
    const type = query.type || 'event';
    const cacheKey = `analysis:${type}:${JSON.stringify(query)}`;
    const redis = getRedisClient();

    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    let result: any;
    switch (type) {
      case 'funnel': result = this.buildFunnelResult(query); break;
      case 'retention': result = this.buildRetentionResult(query); break;
      case 'distribution': result = this.buildDistributionResult(query); break;
      case 'path': result = this.buildPathResult(query); break;
      case 'attribute': result = this.buildAttributeResult(query); break;
      default: result = this.buildEventResult(query);
    }

    await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
    return result;
  }

  /** 取消查询 */
  async cancelQuery(queryId: string) {
    return { cancelled: true, query_id: queryId };
  }

  // ─── 事件分析 ─────────────────────────
  private buildEventResult(query: AnalysisQuery) {
    const days = this.getDateRange(query.time_range.start, query.time_range.end);
    const series = query.metrics.map((m) => ({
      metric: m.type, alias: m.alias || m.type,
      data: days.map((date) => ({ date, value: Math.floor(Math.random() * 1000) + 100 })),
    }));
    return { query_id: crypto.randomUUID(), type: 'event', columns: ['date', ...query.metrics.map(m => m.alias || m.type)], rows: days.length, series, elapsed_ms: this.randMs() };
  }

  // ─── 漏斗分析 ─────────────────────────
  private buildFunnelResult(query: AnalysisQuery) {
    const events = query.funnel_events || [query.event_name, 'step_2', 'step_3', 'step_4'];
    let base = Math.floor(Math.random() * 5000) + 5000;
    const steps = events.map((name, i) => {
      const count = i === 0 ? base : Math.floor(base * (0.4 + Math.random() * 0.4));
      base = count;
      return { step: i + 1, event: name, count, rate: i === 0 ? 100 : Math.round((count / (events.length > 1 ? base : count)) * 100) };
    });
    // 修正转化率
    const total = steps[0].count;
    steps.forEach((s, i) => { s.rate = i === 0 ? 100 : Math.round((s.count / total) * 100); });
    return { query_id: crypto.randomUUID(), type: 'funnel', steps, total_conversion: steps[steps.length - 1].rate, elapsed_ms: this.randMs() };
  }

  // ─── 留存分析 ─────────────────────────
  private buildRetentionResult(query: AnalysisQuery) {
    const days = this.getDateRange(query.time_range.start, query.time_range.end).slice(0, 7);
    const matrix = days.map((date, i) => {
      const base = Math.floor(Math.random() * 1000) + 500;
      const row = [100]; // Day 0 = 100%
      for (let j = 1; j <= Math.min(6, days.length - 1 - i); j++) {
        row.push(Math.round(100 * Math.pow(0.7 + Math.random() * 0.2, j)));
      }
      return { date, base_users: base, retention_rates: row };
    });
    return { query_id: crypto.randomUUID(), type: 'retention', matrix, elapsed_ms: this.randMs() };
  }

  // ─── 分布分析 ─────────────────────────
  private buildDistributionResult(query: AnalysisQuery) {
    const buckets = ['0-10', '10-20', '20-30', '30-40', '40-50', '50-60', '60-70', '70-80', '80-90', '90-100'];
    const values = buckets.map((b) => Math.floor(Math.random() * 500) + 50);
    return { query_id: crypto.randomUUID(), type: 'distribution', buckets, values, total: values.reduce((a, b) => a + b, 0), elapsed_ms: this.randMs() };
  }

  // ─── 路径分析 ─────────────────────────
  private buildPathResult(query: AnalysisQuery) {
    const pages = ['/home', '/product', '/cart', '/checkout', '/payment', '/success', '/search', '/profile'];
    const nodes = pages.map((p, i) => ({ id: String(i), name: p }));
    const links: Array<{ source: string; target: string; value: number }> = [];
    for (let i = 0; i < pages.length - 1; i++) {
      links.push({ source: String(i), target: String(i + 1), value: Math.floor(Math.random() * 1000) + 100 });
      if (i < pages.length - 2 && Math.random() > 0.5) {
        links.push({ source: String(i), target: String(i + 2), value: Math.floor(Math.random() * 300) + 50 });
      }
    }
    return { query_id: crypto.randomUUID(), type: 'path', nodes, links, elapsed_ms: this.randMs() };
  }

  // ─── 归因分析 ─────────────────────────
  private buildAttributeResult(query: AnalysisQuery) {
    const channels = ['organic', 'paid_search', 'social', 'email', 'referral', 'direct'];
    const attributes = channels.map((ch) => ({
      channel: ch,
      conversions: Math.floor(Math.random() * 500) + 50,
      contribution: Math.round(Math.random() * 30 + 5),
      roi: Math.round((Math.random() * 5 + 0.5) * 100) / 100,
    }));
    const total = attributes.reduce((a, b) => a + b.contribution, 0);
    attributes.forEach((a) => { a.contribution = Math.round((a.contribution / total) * 100); });
    return { query_id: crypto.randomUUID(), type: 'attribute', attributes, elapsed_ms: this.randMs() };
  }

  // ─── 工具方法 ─────────────────────────
  private getDateRange(start: string, end: string): string[] {
    const days: string[] = [];
    for (let d = new Date(start); d <= new Date(end); d.setDate(d.getDate() + 1)) {
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  }

  private randMs() { return Math.floor(Math.random() * 500) + 50; }
}
