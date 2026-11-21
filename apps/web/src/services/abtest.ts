/**
 * A/B 实验平台与 Feature Flags API 服务
 */
import type { ABExperiment, FeatureFlag } from '@alldata/shared/types';
import { get, post, put } from './request';

export const abtestApi = {
  // ─── Feature Flags ─────────────────────────────────

  listFlags: (projectId: number) => get<FeatureFlag[]>('/abtest/flags', { project_id: projectId }),

  createFlag: (data: {
    project_id: number;
    key: string;
    name: string;
    description?: string;
    rollout_percentage?: number;
    status?: 1 | 2;
  }) => post<FeatureFlag>('/abtest/flags', data),

  updateFlag: (
    id: number,
    data: Partial<Pick<FeatureFlag, 'name' | 'description' | 'status' | 'rollout_percentage'>>,
    projectId: number,
  ) => put<FeatureFlag>(`/abtest/flags/${id}?project_id=${projectId}`, data),

  evaluateFlag: (key: string, userId: string, projectId: number) =>
    post<{ enabled: boolean; bucket: number; flag?: FeatureFlag }>(
      `/abtest/flags/evaluate?project_id=${projectId}`,
      { key, user_id: userId },
    ),

  // ─── A/B Experiments ───────────────────────────────

  listExperiments: (projectId: number) =>
    get<ABExperiment[]>('/abtest/experiments', { project_id: projectId }),

  createExperiment: (data: {
    project_id: number;
    key: string;
    name: string;
    hypothesis?: string;
    target_metric: string;
    variants?: any[];
  }) => post<ABExperiment>('/abtest/experiments', data),

  getExperimentReport: (id: number, projectId: number) =>
    get<any>(`/abtest/experiments/${id}/report`, { project_id: projectId }),
};
