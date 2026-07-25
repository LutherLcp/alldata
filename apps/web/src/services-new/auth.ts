/**
 * 认证 API 服务
 */
import { post, get } from './request';
import type { LoginRequest, LoginResponse, UserInfo } from '@alldata/shared';

export const authApi = {
  login: (data: LoginRequest) => post<LoginResponse>('/auth/login', data),
  logout: () => post('/auth/logout'),
  refresh: (refresh_token: string) => post<LoginResponse>('/auth/refresh', { refresh_token }),
  getMe: () => get<UserInfo>('/auth/me'),
};
