/**
 * TanStack Query Hooks — 统一服务端数据管理
 *
 * 使用示例:
 *   const { data: warnings } = useWarnings(projectId);
 *   const { mutate: createWarning } = useCreateWarning();
 */
import { downloadApi, enumApi, subscriptionApi, warningApi } from '@/services-new/v4';
import { financeApi, kocrmApi } from '@/services-new/v5';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ─── Query Keys ─────────────────────────
export const queryKeys = {
  warnings: (projectId: number) => ['warnings', projectId] as const,
  subscriptions: (projectId: number) => ['subscriptions', projectId] as const,
  downloads: (projectId: number) => ['downloads', projectId] as const,
  enums: (projectId: number) => ['enums', projectId] as const,
  suppliers: () => ['finance', 'suppliers'] as const,
  shareRatios: () => ['finance', 'shareRatios'] as const,
  reconciliations: () => ['finance', 'reconciliations'] as const,
  kocrmAccounts: (projectId: number) => ['kocrm', 'accounts', projectId] as const,
  kocrmCreators: (projectId: number) => ['kocrm', 'creators', projectId] as const,
};

// ─── Warning Hooks ─────────────────────────
export function useWarnings(projectId: number) {
  return useQuery({
    queryKey: queryKeys.warnings(projectId),
    queryFn: () => warningApi.list(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5分钟
  });
}

export function useCreateWarning() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => warningApi.create(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.warnings(vars.project_id) });
    },
  });
}

// ─── Subscription Hooks ─────────────────────────
export function useSubscriptions(projectId: number) {
  return useQuery({
    queryKey: queryKeys.subscriptions(projectId),
    queryFn: () => subscriptionApi.list(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Download Hooks ─────────────────────────
export function useDownloads(projectId: number) {
  return useQuery({
    queryKey: queryKeys.downloads(projectId),
    queryFn: () => downloadApi.list(projectId),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Enum Hooks ─────────────────────────
export function useEnums(projectId: number) {
  return useQuery({
    queryKey: queryKeys.enums(projectId),
    queryFn: () => enumApi.list(projectId),
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000,
  });
}

// ─── Finance Hooks ─────────────────────────
export function useSuppliers() {
  return useQuery({
    queryKey: queryKeys.suppliers(),
    queryFn: () => financeApi.listSuppliers(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useShareRatios() {
  return useQuery({
    queryKey: queryKeys.shareRatios(),
    queryFn: () => financeApi.listShareRatios(),
    staleTime: 5 * 60 * 1000,
  });
}

// ── KoCRM Hooks ─────────────────────────
export function useKocrmAccounts(projectId: number) {
  return useQuery({
    queryKey: queryKeys.kocrmAccounts(projectId),
    queryFn: () => kocrmApi.listAccounts(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useKocrmCreators(projectId: number) {
  return useQuery({
    queryKey: queryKeys.kocrmCreators(projectId),
    queryFn: () => kocrmApi.listCreators(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}
