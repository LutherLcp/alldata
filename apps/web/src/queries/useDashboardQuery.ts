import { dashboardApi } from '@/services-new/dashboard';
import type { DashboardItem, FolderNode, ReportItem } from '@/services-new/dashboard';
/**
 * 看板模块 — TanStack Query Hooks
 *
 * 包含文件夹树、看板列表/详情、报表增删改查及缓存自动失效。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardKeys } from './keys';

/**
 * 获取文件夹树
 */
export function useFolderTree(projectId: number, options?: { enabled?: boolean }) {
  return useQuery<FolderNode[]>({
    queryKey: dashboardKeys.folderTree(projectId),
    queryFn: () => dashboardApi.getFolderTree(projectId),
    enabled: options?.enabled ?? projectId > 0,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取看板列表
 */
export function useDashboardList(
  projectId: number,
  folderId?: number,
  options?: { enabled?: boolean },
) {
  return useQuery<DashboardItem[]>({
    queryKey: dashboardKeys.list(projectId, folderId),
    queryFn: () => dashboardApi.listDashboards(projectId, folderId),
    enabled: options?.enabled ?? projectId > 0,
    staleTime: 3 * 60 * 1000,
  });
}

/**
 * 获取看板详情
 */
export function useDashboardDetail(id: number, options?: { enabled?: boolean }) {
  return useQuery<DashboardItem>({
    queryKey: dashboardKeys.detail(id),
    queryFn: () => dashboardApi.getDashboard(id),
    enabled: options?.enabled ?? id > 0,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 创建/更新/删除看板 Mutations (带有缓存自动失效)
 */
export function useDashboardMutations() {
  const queryClient = useQueryClient();

  const createDashboard = useMutation({
    mutationFn: (data: {
      project_id: number;
      folder_id?: number;
      name: string;
      description?: string;
    }) => dashboardApi.createDashboard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });

  const updateDashboard = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DashboardItem> }) =>
      dashboardApi.updateDashboard(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });

  const deleteDashboard = useMutation({
    mutationFn: (id: number) => dashboardApi.deleteDashboard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });

  return { createDashboard, updateDashboard, deleteDashboard };
}

/**
 * 报表 Mutations
 */
export function useReportMutations(dashboardId: number) {
  const queryClient = useQueryClient();

  const createReport = useMutation({
    mutationFn: (data: Partial<ReportItem> & { name: string; type: string }) =>
      dashboardApi.createReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(dashboardId) });
    },
  });

  const updateReport = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ReportItem> }) =>
      dashboardApi.updateReport(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(dashboardId) });
    },
  });

  const deleteReport = useMutation({
    mutationFn: (id: number) => dashboardApi.deleteReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(dashboardId) });
    },
  });

  return { createReport, updateReport, deleteReport };
}
