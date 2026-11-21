/**
 * 订阅与推送配置 API 服务
 * （原 v4.ts：早期按后端大版本划分的历史分层，已按业务域拆分）
 */
import { del, get, post, put } from './request';

export const subscriptionApi = {
  list: (projectId: number) => get('/subscriptions/subscriptions', { project_id: projectId }),
  create: (data: any) => post('/subscriptions/subscriptions', data),
  update: (id: number, data: any) => put(`/subscriptions/subscriptions/${id}`, data),
  delete: (id: number) => del(`/subscriptions/subscriptions/${id}`),
  send: (id: number) => post(`/subscriptions/subscriptions/${id}/send`, {}),
  listPushConfigs: (projectId: number) =>
    get('/subscriptions/push-configs', { project_id: projectId }),
  createPushConfig: (data: any) => post('/subscriptions/push-configs', data),
  deletePushConfig: (id: number) => del(`/subscriptions/push-configs/${id}`),
};
