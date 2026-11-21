/**
 * CDP 核心 API 服务 — 360画像 / 客户旅程路径 / 动态 Cohort 人群分群
 */
import type { CohortGroup, CustomerJourneyPath, User360Profile } from '@alldata/shared/types';
import { del, get, post } from './request';

export const cdpApi = {
  // 获取 360° 用户全景画像
  getProfile: (userId: string, projectId: number) =>
    get<User360Profile>(`/cdp/users/${userId}/profile`, { project_id: projectId }),

  // 获取客户旅程桑基图与流向
  getJourney: (projectId: number, dateRange?: { start?: string; end?: string }) =>
    get<CustomerJourneyPath>('/cdp/journey/path', { project_id: projectId, ...dateRange }),

  // 获取动态人群分群列表
  listCohorts: (projectId: number) => get<CohortGroup[]>('/cdp/cohorts', { project_id: projectId }),

  // 创建动态人群分群
  createCohort: (data: {
    project_id: number;
    name: string;
    description?: string;
    rules: any[];
  }) => post<CohortGroup>('/cdp/cohorts', data),

  // 预估人群分群覆盖人数
  estimateCohortSize: (data: { project_id: number; rules: any[] }) =>
    post<{ count: number; sql: string }>('/cdp/cohorts/estimate', data),

  // 删除人群分群
  deleteCohort: (id: number, projectId: number) =>
    del(`/cdp/cohorts/${id}`, { project_id: projectId }),
};
