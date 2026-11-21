/**
 * 指标管理 API
 */
import { del, get, post, put } from './request';

export const metricApi = {
  list: (projectId: number) => get('/metrics', { project_id: projectId }),
  get: (id: number) => get(`/metrics/${id}`),
  create: (data: any) => post('/metrics', data),
  update: (id: number, data: any) => put(`/metrics/${id}`, data),
  delete: (id: number) => del(`/metrics/${id}`),
  query: (data: any) => post('/metrics/query', data),
  seedPresets: (projectId: number) => post('/metrics/seed-presets', { project_id: projectId }),
};
