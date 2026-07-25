/** V4 API 服务 — 预警/订阅/下载/枚举 */
import { get, post, put, del } from './request';

export const warningApi = {
  list: (projectId: number) => get('/warnings', { project_id: projectId }),
  get: (id: number) => get(`/warnings/${id}`),
  create: (data: any) => post('/warnings', data),
  update: (id: number, data: any) => put(`/warnings/${id}`, data),
  delete: (id: number) => del(`/warnings/${id}`),
  check: (id: number) => post(`/warnings/${id}/check`, {}),
  logs: (id: number) => get(`/warnings/${id}/logs`),
};

export const subscriptionApi = {
  list: (projectId: number) => get('/subscriptions/subscriptions', { project_id: projectId }),
  create: (data: any) => post('/subscriptions/subscriptions', data),
  update: (id: number, data: any) => put(`/subscriptions/subscriptions/${id}`, data),
  delete: (id: number) => del(`/subscriptions/subscriptions/${id}`),
  send: (id: number) => post(`/subscriptions/subscriptions/${id}/send`, {}),
  listPushConfigs: (projectId: number) => get('/subscriptions/push-configs', { project_id: projectId }),
  createPushConfig: (data: any) => post('/subscriptions/push-configs', data),
  deletePushConfig: (id: number) => del(`/subscriptions/push-configs/${id}`),
};

export const downloadApi = {
  list: (projectId: number) => get('/downloads', { project_id: projectId }),
  create: (data: any) => post('/downloads', data),
  delete: (id: number) => del(`/downloads/${id}`),
  execute: (id: number) => post(`/downloads/${id}/execute`, {}),
};

export const enumApi = {
  list: (projectId: number) => get('/enums', { project_id: projectId }),
  create: (data: any) => post('/enums', data),
  update: (id: number, data: any) => put(`/enums/${id}`, data),
  delete: (id: number) => del(`/enums/${id}`),
};
