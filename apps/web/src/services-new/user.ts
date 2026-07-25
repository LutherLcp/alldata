/**
 * 用户查询 API 服务
 */
import { get, put } from './request';

export interface UserItem {
  id: number;
  username: string;
  email: string | null;
  avatar: string | null;
  status: number;
  lang: string;
  login_method: string;
  created_at: string;
  updated_at: string;
  project_roles?: Array<{
    id: number;
    project: { id: number; code: string; name: string };
    role: { id: number; name: string };
  }>;
}

export interface UserTimelineEvent {
  timestamp: string;
  event: string;
  properties: Record<string, unknown>;
}

export const userApi = {
  list: (params: { keyword?: string; status?: number; page?: number; page_size?: number }) =>
    get<{ list: UserItem[]; page_info: any }>('/users', params),
  get: (id: number) => get<UserItem>(`/users/${id}`),
  getTimeline: (id: number, projectId: number) =>
    get<UserTimelineEvent[]>(`/users/${id}/timeline`, { project_id: projectId }),
  updateStatus: (id: number, status: number) =>
    put<UserItem>(`/users/${id}/status`, { status }),
};
