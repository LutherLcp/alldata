/**
 * Axios 请求封装
 * 统一拦截器、Token 注入、错误处理
 */
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { message } from 'antd';
import { useAuthStore } from '@/stores/auth';
import { useGlobalStore } from '@/stores/global';
import type { ApiResponse } from '@alldata/shared/types/index.js';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

const request: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截器 — Token + Project + Trace
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const authStore = useAuthStore.getState();
    const globalStore = useGlobalStore.getState();

    // 注入 Token
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`;
    }

    // 注入当前项目 ID
    if (globalStore.currentProject) {
      config.headers['Project-Id'] = String(globalStore.currentProject.id);
    }

    // 注入语言
    config.headers['Language'] = globalStore.language || 'zh_CN';

    // 注入 Trace ID
    config.headers['Trace-Id'] = crypto.randomUUID();

    return config;
  },
  (error) => Promise.reject(error),
);

// 响应拦截器 — 错误处理
request.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { data } = response;
    if (data.code === 200) {
      return response;
    }
    // 业务错误
    message.error(data.message || '请求失败');
    return Promise.reject(new Error(data.message));
  },
  (error: AxiosError<ApiResponse>) => {
    if (!error.response) {
      message.error('网络连接失败');
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    switch (status) {
      case 401:
        // Token 过期或无效
        useAuthStore.getState().logout();
        window.location.href = '/login';
        break;
      case 403:
        if (data?.code === 20201) {
          message.error('数据权限不足');
        } else {
          message.error('权限不足');
        }
        break;
      case 404:
        message.error('请求的资源不存在');
        break;
      case 429:
        message.error('请求频率超限，请稍后重试');
        break;
      default:
        message.error(data?.message || '服务器错误');
    }

    return Promise.reject(error);
  },
);

export default request;

// 便捷方法
export const get = <T = unknown>(url: string, params?: Record<string, unknown>) =>
  request.get<ApiResponse<T>>(url, { params }).then((res) => res.data.data);

export const post = <T = unknown>(url: string, data?: unknown) =>
  request.post<ApiResponse<T>>(url, data).then((res) => res.data.data);

export const put = <T = unknown>(url: string, data?: unknown) =>
  request.put<ApiResponse<T>>(url, data).then((res) => res.data.data);

export const del = <T = unknown>(url: string, params?: Record<string, unknown>) =>
  request.delete<ApiResponse<T>>(url, { params }).then((res) => res.data.data);
