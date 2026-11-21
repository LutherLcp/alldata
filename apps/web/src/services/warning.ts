/**
 * 预警管理 API 服务
 * （原 v4.ts：早期按后端大版本划分的历史分层，已按业务域拆分）
 */
import { del, get, post, put } from './request';

export const warningApi = {
  list: (projectId: number) => get('/warnings', { project_id: projectId }),
  get: (id: number) => get(`/warnings/${id}`),
  create: (data: any) => post('/warnings', data),
  update: (id: number, data: any) => put(`/warnings/${id}`, data),
  delete: (id: number) => del(`/warnings/${id}`),
  check: (id: number) => post(`/warnings/${id}/check`, {}),
  logs: (id: number) => get(`/warnings/${id}/logs`),
};
