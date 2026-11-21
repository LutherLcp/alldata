/**
 * 财务对账 API 服务 — 供应商 / 分成比例 / 对账核算结算
 */
import { del, get, post, put } from './request';

export interface SettlementDetail {
  reconciliation_id: number;
  supplier_id: number;
  platform: string;
  game: string;
  period: string;
  gross_revenue: number;
  share_ratio: number;
  supplier_amount: number;
  platform_amount: number;
  settled_at: string;
  status: 'settled';
}

export const financeApi = {
  // 供应商
  listSuppliers: () => get<any[]>('/finance/suppliers'),
  createSupplier: (data: {
    supplier_name: string;
    subject?: string;
    contact?: string;
    phone?: string;
  }) => post('/finance/suppliers', data),
  updateSupplier: (id: number, data: any) => put(`/finance/suppliers/${id}`, data),
  deleteSupplier: (id: number) => del(`/finance/suppliers/${id}`),

  // 分成比例
  listShareRatios: (supplierId?: number) =>
    get<any[]>('/finance/share-ratios', supplierId ? { supplier_id: supplierId } : {}),
  createShareRatio: (data: {
    supplier_id: number;
    platform: string;
    ratio: number;
    effective_date: string;
  }) => post('/finance/share-ratios', data),
  updateShareRatio: (id: number, data: any) => put(`/finance/share-ratios/${id}`, data),
  deleteShareRatio: (id: number) => del(`/finance/share-ratios/${id}`),

  // 对账
  listReconciliations: (supplierId?: number) =>
    get<any[]>('/finance/reconciliations', supplierId ? { supplier_id: supplierId } : {}),
  createReconciliation: (data: {
    supplier_id: number;
    platform: string;
    game: string;
    period: string;
    currency?: string;
    meta?: Record<string, unknown>;
  }) => post('/finance/reconciliations', data),
  updateReconciliation: (id: number, data: any) => put(`/finance/reconciliations/${id}`, data),
  deleteReconciliation: (id: number) => del(`/finance/reconciliations/${id}`),

  // 自动结算核算
  settleReconciliation: (id: number) =>
    post<SettlementDetail>(`/finance/reconciliations/${id}/settle`),

  // 导出
  exportReport: (type: string) =>
    post<{ exported: boolean; file_url: string; rows: number }>('/finance/export', { type }),
};
