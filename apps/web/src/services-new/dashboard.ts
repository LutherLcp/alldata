/**
 * 看板模块 API 服务
 */
import { get, post, put, del } from './request';

// ─── 类型定义 ─────────────────────────────
export interface FolderNode {
  id: number;
  project_id: number;
  parent_id: number | null;
  name: string;
  type: number;
  sort_order: number;
  children?: FolderNode[];
  dashboards?: Array<{ id: number; name: string; type: number; status: number }>;
}

export interface DashboardItem {
  id: number;
  project_id: number;
  folder_id: number | null;
  name: string;
  description: string | null;
  type: number;
  status: number;
  layout: any;
  config: any;
  common_filters: any;
  created_by: number;
  updated_at: string;
  reports?: Array<{ id: number; name: string; type: string; chart_type: string }>;
}

export interface ReportItem {
  id: number;
  project_id: number;
  dashboard_id: number | null;
  name: string;
  type: string;
  chart_type: string | null;
  query_config: any;
  chart_config: any;
  position: any;
}

// ─── 文件夹 ─────────────────────────────
export const dashboardApi = {
  // 获取文件夹树
  getFolderTree: (projectId: number) =>
    get<FolderNode[]>('/dashboards/folders', { project_id: projectId }),

  // 创建文件夹
  createFolder: (data: { project_id: number; parent_id?: number; name: string; type?: number }) =>
    post<FolderNode>('/dashboards/folders', data),

  // 更新文件夹
  updateFolder: (id: number, data: { name?: string; sort_order?: number }) =>
    put<FolderNode>(`/dashboards/folders/${id}`, data),

  // 删除文件夹
  deleteFolder: (id: number) =>
    del(`/dashboards/folders/${id}`),

  // ─── 看板 ─────────────────────────────
  listDashboards: (projectId: number, folderId?: number) =>
    get<DashboardItem[]>('/dashboards', { project_id: projectId, folder_id: folderId }),

  getDashboard: (id: number) =>
    get<DashboardItem>(`/dashboards/${id}`),

  createDashboard: (data: { project_id: number; folder_id?: number; name: string; description?: string }) =>
    post<DashboardItem>('/dashboards', data),

  updateDashboard: (id: number, data: Partial<DashboardItem>) =>
    put<DashboardItem>(`/dashboards/${id}`, data),

  deleteDashboard: (id: number) =>
    del(`/dashboards/${id}`),

  // ─── 报表 ─────────────────────────────
  createReport: (data: Partial<ReportItem> & { name: string; type: string }) =>
    post<ReportItem>('/dashboards/reports', data),

  updateReport: (id: number, data: Partial<ReportItem>) =>
    put<ReportItem>(`/dashboards/reports/${id}`, data),

  deleteReport: (id: number) =>
    del(`/dashboards/reports/${id}`),

  // ─── 软链 ─────────────────────────────
  createSoftLink: (data: { dashboard_id: number; name?: string; expire_at?: string }) =>
    post('/dashboards/soft-links', data),

  getSoftLink: (token: string) =>
    get(`/dashboards/soft-links/${token}`),
};
