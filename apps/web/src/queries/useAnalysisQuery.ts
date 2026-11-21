import { analysisApi } from '@/services/analysis';
import type { AnalysisQuery, AnalysisResult } from '@/services/analysis';
/**
 * 分析引擎 — TanStack Query Hooks
 *
 * 封装事件/漏斗/留存/分布/路径/归因 6 种分析查询。
 * - 自动缓存 5 分钟（staleTime），相同参数不重复请求
 * - 支持手动刷新 / 取消查询
 * - 与 services/analysis.ts 的 fetcher 函数解耦
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { analysisKeys } from './keys';

/**
 * 通用分析查询 Hook
 *
 * @param type - 分析类型（event/funnel/retention/distribution/path/attribute）
 * @param projectId - 项目 ID
 * @param params - 完整查询参数
 * @param options - 额外 useQuery 选项
 */
export function useAnalysisQuery(
  projectId: number,
  params: AnalysisQuery,
  options?: {
    enabled?: boolean;
    staleTime?: number;
  },
) {
  const type = params.type ?? 'event';

  // 根据分析类型选择对应的 queryKey
  const keyFn =
    type === 'funnel'
      ? analysisKeys.funnel
      : type === 'retention'
        ? analysisKeys.retention
        : type === 'distribution'
          ? analysisKeys.distribution
          : type === 'path'
            ? analysisKeys.path
            : type === 'attribute'
              ? analysisKeys.attribution
              : analysisKeys.event;

  return useQuery<AnalysisResult>({
    queryKey: keyFn(projectId, params),
    queryFn: () => analysisApi.runQuery(params),
    enabled: options?.enabled ?? projectId > 0,
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 分钟
  });
}

/**
 * 事件分析快捷 Hook
 */
export function useEventAnalysis(
  projectId: number,
  params: Omit<AnalysisQuery, 'type'>,
  options?: { enabled?: boolean },
) {
  return useAnalysisQuery(projectId, { ...params, type: 'event' }, options);
}

/**
 * 漏斗分析快捷 Hook
 */
export function useFunnelAnalysis(
  projectId: number,
  params: Omit<AnalysisQuery, 'type'>,
  options?: { enabled?: boolean },
) {
  return useAnalysisQuery(projectId, { ...params, type: 'funnel' }, options);
}

/**
 * 留存分析快捷 Hook
 */
export function useRetentionAnalysis(
  projectId: number,
  params: Omit<AnalysisQuery, 'type'>,
  options?: { enabled?: boolean },
) {
  return useAnalysisQuery(projectId, { ...params, type: 'retention' }, options);
}

/**
 * 取消查询 Mutation
 */
export function useCancelAnalysis() {
  return useMutation({
    mutationFn: (queryId: string) => analysisApi.cancelQuery(queryId),
  });
}

/**
 * 使所有分析缓存失效（用于项目切换场景）
 */
export function useInvalidateAnalysis() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: analysisKeys.all });
}
