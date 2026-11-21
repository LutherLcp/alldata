/**
 * 私域 CRM (KoCRM) API 服务 — 账户 / 达人矩阵 / 影响力评估
 */
import { del, get, post, put } from './request';

export interface KocrmAccountItem {
  id: number;
  project_id: number;
  platform: string;
  account_name: string;
  account_id: string;
  status: number;
  meta?: Record<string, unknown>;
  created_at: string;
}

export interface KocrmCreatorItem {
  id: number;
  project_id: number;
  platform: string;
  name: string;
  uid: string;
  followers: number;
  status: number;
  tags: string[];
  meta?: {
    influence?: {
      score: number;
      tier: 'S' | 'A' | 'B' | 'C';
      evaluated_at: string;
    };
    [key: string]: unknown;
  };
  created_at: string;
}

export const kocrmApi = {
  // 账户
  listAccounts: (projectId: number) =>
    get<KocrmAccountItem[]>('/kocrm/accounts', { project_id: projectId }),
  createAccount: (data: {
    project_id: number;
    platform: string;
    account_name: string;
    account_id?: string;
    meta?: Record<string, unknown>;
  }) => post<KocrmAccountItem>(`/kocrm/accounts?project_id=${data.project_id}`, data),
  updateAccount: (id: number, data: Partial<KocrmAccountItem>, projectId: number) =>
    put<KocrmAccountItem>(`/kocrm/accounts/${id}?project_id=${projectId}`, data),
  deleteAccount: (id: number, projectId: number) =>
    del<{ deleted: boolean }>(`/kocrm/accounts/${id}?project_id=${projectId}`),

  // 达人
  listCreators: (projectId: number) =>
    get<KocrmCreatorItem[]>('/kocrm/creators', { project_id: projectId }),
  createCreator: (data: {
    project_id: number;
    platform: string;
    name: string;
    uid?: string;
    followers?: number;
    tags?: string[];
    meta?: Record<string, unknown>;
  }) => post<KocrmCreatorItem>(`/kocrm/creators?project_id=${data.project_id}`, data),
  updateCreator: (id: number, data: Partial<KocrmCreatorItem>, projectId: number) =>
    put<KocrmCreatorItem>(`/kocrm/creators/${id}?project_id=${projectId}`, data),
  deleteCreator: (id: number, projectId: number) =>
    del<{ deleted: boolean }>(`/kocrm/creators/${id}?project_id=${projectId}`),

  // 影响力评估
  calculateInfluence: (id: number, projectId: number) =>
    post<{
      creator: KocrmCreatorItem;
      influence: { score: number; tier: 'S' | 'A' | 'B' | 'C'; evaluated_at: string };
    }>(`/kocrm/creators/${id}/influence?project_id=${projectId}`),
};
