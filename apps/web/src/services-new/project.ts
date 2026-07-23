/**
 * 项目管理 API 服务
 */
import { get, post, put, del } from './request';
import type { Project, PaginatedResult } from '@alldata/shared/types/index.js';

export const projectApi = {
  list: (params?: { page?: number; page_size?: number; keyword?: string }) =>
    get<PaginatedResult<Project>>('/projects', params as Record<string, unknown>),
  getById: (id: number) => get<Project>(`/projects/${id}`),
  create: (data: { code: string; name: string; description?: string }) =>
    post<Project>('/projects', data),
  update: (data: { id: number; name?: string; description?: string }) =>
    put<Project>('/projects', data),
  archive: (id: number) => del(`/projects/${id}`),
};
