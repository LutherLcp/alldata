/**
 * 分析引擎 API 服务
 */
import { post } from './request';

export interface AnalysisQuery {
  project_id: number;
  event_name: string;
  metrics: Array<{ type: 'count' | 'uv' | 'pv'; alias?: string }>;
  dimensions?: string[];
  filters?: Array<{ field: string; op: string; value: any }>;
  time_range: { start: string; end: string; granularity?: string };
  limit?: number;
}

export interface AnalysisResult {
  query_id: string;
  columns: string[];
  rows: number;
  series: Array<{
    metric: string;
    alias: string;
    data: Array<{ date: string; value: number; groups?: any[] }>;
  }>;
  elapsed_ms: number;
}

export const analysisApi = {
  runQuery: (query: AnalysisQuery) =>
    post<AnalysisResult>('/analysis/query', query),

  cancelQuery: (queryId: string) =>
    post('/analysis/query/cancel', { query_id: queryId }),
};
