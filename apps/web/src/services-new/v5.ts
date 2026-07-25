/** V5 API 服务 — 财务/KoCRM */
import { get, post, put, del } from './request';

export const financeApi = {
  // 供应商
  listSuppliers: () => get('/finance/suppliers'),
  createSupplier: (data: any) => post('/finance/suppliers', data),
  updateSupplier: (id: number, data: any) => put(`/finance/suppliers/${id}`, data),
  deleteSupplier: (id: number) => del(`/finance/suppliers/${id}`),
  // 分成比例
  listShareRatios: (supplierId?: number) => get('/finance/share-ratios', supplierId ? { supplier_id: supplierId } : {}),
  createShareRatio: (data: any) => post('/finance/share-ratios', data),
  updateShareRatio: (id: number, data: any) => put(`/finance/share-ratios/${id}`, data),
  deleteShareRatio: (id: number) => del(`/finance/share-ratios/${id}`),
  // 对账
  listReconciliations: (supplierId?: number) => get('/finance/reconciliations', supplierId ? { supplier_id: supplierId } : {}),
  createReconciliation: (data: any) => post('/finance/reconciliations', data),
  updateReconciliation: (id: number, data: any) => put(`/finance/reconciliations/${id}`, data),
  deleteReconciliation: (id: number) => del(`/finance/reconciliations/${id}`),
  // 导出
  exportReport: (type: string) => post('/finance/export', { type }),
};

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
