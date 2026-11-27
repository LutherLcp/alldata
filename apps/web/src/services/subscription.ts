/**
 * 订阅与推送配置 API 服务 (全面支持多租户 project_id 与 IDOR 防护)
 */
import { del, get, post, put } from './request';

export interface SubscriptionItem {
  id: number;
  project_id: number;
  entity_id: number;
  entity_type: string;
  name: string;
  status: number;
  schedule_cron: string;
  notify_type: string;
  notify_config: Record<string, any>;
  created_by: number;
  created_at: string;
}

export interface SubscriptionSummary {
  total: number;
  active: number;
  channels: Record<string, number>;
  entity_breakdown: Record<string, number>;
}

export interface SubscriptionDispatchResult {
  sent: boolean;
  subscription_id: number;
  subscription_name: string;
  entity_type: string;
  entity_id: number;
  channel: string;
  recipients_count: number;
  sent_at: string;
  payload_preview?: Record<string, any>;
}

export interface PushConfigItem {
  id: number;
  project_id: number;
  name: string;
  push_type: string;
  entity_id?: number;
  entity_type?: string;
  config: Record<string, any>;
  created_by: number;
  created_at: string;
}

export const subscriptionApi = {
  list: (projectId: number) =>
    get<SubscriptionItem[]>('/subscriptions/subscriptions', { project_id: projectId }),

  getSummary: (projectId: number) =>
    get<SubscriptionSummary>('/subscriptions/subscriptions/summary', { project_id: projectId }),

  get: (id: number, projectId: number) =>
    get<SubscriptionItem>(`/subscriptions/subscriptions/${id}`, { project_id: projectId }),

  create: (data: Partial<SubscriptionItem> & { project_id: number }) =>
    post<SubscriptionItem>('/subscriptions/subscriptions', data),

  update: (id: number, data: Partial<SubscriptionItem>, projectId?: number) =>
    put<SubscriptionItem>(
      `/subscriptions/subscriptions/${id}${projectId ? `?project_id=${projectId}` : ''}`,
      data,
    ),

  delete: (id: number, projectId?: number) =>
    del<null>(
      `/subscriptions/subscriptions/${id}`,
      projectId ? { project_id: projectId } : undefined,
    ),

  send: (id: number, projectId?: number) =>
    post<SubscriptionDispatchResult>(
      `/subscriptions/subscriptions/${id}/send${projectId ? `?project_id=${projectId}` : ''}`,
      {},
    ),

  listPushConfigs: (projectId: number) =>
    get<PushConfigItem[]>('/subscriptions/push-configs', { project_id: projectId }),

  createPushConfig: (data: Partial<PushConfigItem> & { project_id: number }) =>
    post<PushConfigItem>('/subscriptions/push-configs', data),

  deletePushConfig: (id: number, projectId?: number) =>
    del<null>(
      `/subscriptions/push-configs/${id}`,
      projectId ? { project_id: projectId } : undefined,
    ),
};
