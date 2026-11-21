/**
 * 营销自动化 Flow API 服务
 */
import type { FlowEdge, FlowNode, MarketingFlow } from '@alldata/shared/types';
import { del, get, post, put } from './request';

export interface FlowExecutionResponse {
  success: boolean;
  flow_id?: number;
  flow_name?: string;
  user_id: string;
  triggered: boolean;
  executed_actions: Array<{
    node_id: string;
    label: string;
    channel: string;
    action_type: string;
    status: string;
    detail: string;
  }>;
  trace: Array<{
    node_id: string;
    type: string;
    label: string;
    status: string;
    detail?: string;
    timestamp: string;
  }>;
  converted: boolean;
  reason?: string;
}

export const marketingApi = {
  listFlows: (projectId: number) =>
    get<MarketingFlow[]>('/marketing/flows', { project_id: projectId }),

  getFlow: (id: number, projectId: number) =>
    get<MarketingFlow>(`/marketing/flows/${id}`, { project_id: projectId }),

  createFlow: (data: {
    project_id: number;
    name: string;
    description?: string;
    trigger_type?: 'event' | 'cron' | 'cohort';
    nodes?: FlowNode[];
    edges?: FlowEdge[];
  }) => post<MarketingFlow>('/marketing/flows', data),

  updateFlow: (id: number, data: Partial<MarketingFlow>, projectId: number) =>
    put<MarketingFlow>(`/marketing/flows/${id}?project_id=${projectId}`, data),

  deleteFlow: (id: number, projectId: number) =>
    del<{ deleted: boolean }>(`/marketing/flows/${id}?project_id=${projectId}`),

  executeFlow: (
    id: number,
    data: {
      user_id: string;
      event_name?: string;
      properties?: Record<string, unknown>;
      is_converted?: boolean;
    },
    projectId: number,
  ) => post<FlowExecutionResponse>(`/marketing/flows/${id}/execute?project_id=${projectId}`, data),
};
