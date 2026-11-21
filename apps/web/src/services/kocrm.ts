/**
 * 私域 CRM (KoCRM) API 服务 — 账户/达人
 * （原 v5.ts：早期按后端大版本划分的历史分层，已按业务域拆分）
 */
import { del, get, post, put } from './request';

export const kocrmApi = {
  // 账户
  listAccounts: (projectId: number) => get('/kocrm/accounts', { project_id: projectId }),
  createAccount: (data: any) => post('/kocrm/accounts', data),
  updateAccount: (id: number, data: any) => put(`/kocrm/accounts/${id}`, data),
  deleteAccount: (id: number) => del(`/kocrm/accounts/${id}`),
  // 达人
  listCreators: (projectId: number) => get('/kocrm/creators', { project_id: projectId }),
  createCreator: (data: any) => post('/kocrm/creators', data),
  updateCreator: (id: number, data: any) => put(`/kocrm/creators/${id}`, data),
  deleteCreator: (id: number) => del(`/kocrm/creators/${id}`),
};
