/**
 * 财务对账 API 服务 — 供应商/分成比例/对账
 * （原 v5.ts：早期按后端大版本划分的历史分层，已按业务域拆分）
 */
import { del, get, post, put } from './request';

export const financeApi = {
  // 供应商
  listSuppliers: () => get('/finance/suppliers'),
  createSupplier: (data: any) => post('/finance/suppliers', data),
  updateSupplier: (id: number, data: any) => put(`/finance/suppliers/${id}`, data),
  deleteSupplier: (id: number) => del(`/finance/suppliers/${id}`),
  // 分成比例
  listShareRatios: (supplierId?: number) =>
    get('/finance/share-ratios', supplierId ? { supplier_id: supplierId } : {}),
  createShareRatio: (data: any) => post('/finance/share-ratios', data),
  updateShareRatio: (id: number, data: any) => put(`/finance/share-ratios/${id}`, data),
  deleteShareRatio: (id: number) => del(`/finance/share-ratios/${id}`),
  // 对账
  listReconciliations: (supplierId?: number) =>
    get('/finance/reconciliations', supplierId ? { supplier_id: supplierId } : {}),
  createReconciliation: (data: any) => post('/finance/reconciliations', data),
  updateReconciliation: (id: number, data: any) => put(`/finance/reconciliations/${id}`, data),
  deleteReconciliation: (id: number) => del(`/finance/reconciliations/${id}`),
  // 导出
  exportReport: (type: string) => post('/finance/export', { type }),
};
