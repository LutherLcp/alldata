/**
 * 分析引擎 API 服务 — 6 种分析类型
 */
import { post } from './request';

export type AnalysisType = 'event' | 'funnel' | 'retention' | 'distribution' | 'path' | 'attribute';

export interface AnalysisQuery {
  type?: AnalysisType;
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

export interface AnalysisResult {
  query_id: string;
  type: string;
  elapsed_ms: number;
  // 事件分析
  columns?: string[];
  rows?: number;
  series?: Array<{
    metric: string;
    alias: string;
    data: Array<{ date: string; value: number; groups?: any[] }>;
  }>;
  // 漏斗分析
  steps?: Array<{ step: number; event: string; count: number; rate: number }>;
  total_conversion?: number;
  // 留存分析
  matrix?: Array<{ date: string; base_users: number; retention_rates: number[] }>;
  // 分布分析
  buckets?: string[];
  values?: number[];
  total?: number;
  // 路径分析
  nodes?: Array<{ id: string; name: string }>;
  links?: Array<{ source: string; target: string; value: number }>;
  // 归因分析
  attributes?: Array<{ channel: string; conversions: number; contribution: number; roi: number }>;
}

export const analysisApi = {
  runQuery: (query: AnalysisQuery) =>
    post<AnalysisResult>('/analysis/query', query),

  cancelQuery: (queryId: string) =>
    post('/analysis/query/cancel', { query_id: queryId }),
};
