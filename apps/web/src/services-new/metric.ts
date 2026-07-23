/**
 * 指标管理 API
 */
import { get, post, put, del } from './request';

export const metricApi = {
  list: (projectId: number) => get('/metrics', { project_id: projectId }),
  get: (id: number) => get(`/metrics/${id}`),
  create: (data: any) => post('/metrics', data),
  update: (id: number, data: any) => put(`/metrics/${id}`, data),
  delete: (id: number) => del(`/metrics/${id}`),
};
