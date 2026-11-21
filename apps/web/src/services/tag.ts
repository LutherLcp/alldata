/**
 * 标签管理 API
 */
import { del, get, post, put } from './request';

export const tagApi = {
  list: (projectId: number, tagType?: string) =>
    get('/tags', { project_id: projectId, tag_type: tagType }),
  get: (id: number) => get(`/tags/${id}`),
  create: (data: any) => post('/tags', data),
  update: (id: number, data: any) => put(`/tags/${id}`, data),
  delete: (id: number) => del(`/tags/${id}`),
  refresh: (id: number) => post(`/tags/${id}/refresh`),
};
