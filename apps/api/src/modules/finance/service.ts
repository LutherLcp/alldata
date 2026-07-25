/**
 * 财务管理服务 — Supplier + ShareRatio + Reconciliation CRUD
 */
import { FastifyInstance } from 'fastify';

export class FinanceService {
  private prisma;
  constructor(private app: FastifyInstance) { this.prisma = app.prisma; }

  // ─── Supplier 供应商 ───
  async listSuppliers() {
    return this.prisma.financeSupplier.findMany({ orderBy: { created_at: 'desc' } });
  }
  async createSupplier(data: { supplier_name: string; subject?: string; contact?: string; phone?: string }) {
    const { supplier_name, subject, contact, phone } = data;
    return this.prisma.financeSupplier.create({ data: { supplier_name, subject, contact, phone } });
  }
  async updateSupplier(id: number, data: { supplier_name?: string; subject?: string; contact?: string; phone?: string; status?: number }) {
    return this.prisma.financeSupplier.update({ where: { id }, data });
  }
  async deleteSupplier(id: number) { return this.prisma.financeSupplier.delete({ where: { id } }); }

  // ─── ShareRatio 分成比例 ───
  async listShareRatios(supplierId?: number) {
    const where = supplierId ? { supplier_id: supplierId } : {};
    return this.prisma.financeShareRatio.findMany({ where, orderBy: { created_at: 'desc' } });
  }
  async createShareRatio(data: { supplier_id: number; platform: string; ratio: number; effective_date: string }) {
    const { supplier_id, platform, ratio, effective_date } = data;
    return this.prisma.financeShareRatio.create({ data: { supplier_id, platform, ratio, effective_date: new Date(effective_date) } });
  }
  async updateShareRatio(id: number, data: { platform?: string; ratio?: number; effective_date?: string; status?: number }) {
    const updateData: any = { ...data };
    if (data.effective_date) updateData.effective_date = new Date(data.effective_date);
    return this.prisma.financeShareRatio.update({ where: { id }, data: updateData });
  }
  async deleteShareRatio(id: number) { return this.prisma.financeShareRatio.delete({ where: { id } }); }

  // ─── Reconciliation 对账 ───
  async listReconciliations(supplierId?: number) {
    const where = supplierId ? { supplier_id: supplierId } : {};
    return this.prisma.financeReconciliation.findMany({ where, orderBy: { created_at: 'desc' } });
  }
  async createReconciliation(data: { supplier_id: number; platform: string; game: string; period: string; currency?: string; meta?: any }) {
    const { supplier_id, platform, game, period, currency, meta } = data;
    return this.prisma.financeReconciliation.create({ data: { supplier_id, platform, game, period, currency: currency || 'CNY', meta: meta || {} } });
  }
  async updateReconciliation(id: number, data: { platform?: string; game?: string; period?: string; currency?: string; status?: number; meta?: any }) {
    return this.prisma.financeReconciliation.update({ where: { id }, data });
  }
  async deleteReconciliation(id: number) { return this.prisma.financeReconciliation.delete({ where: { id } }); }

  // ─── Excel 导出（模拟） ───
  async exportReport(type: string) {
    return { exported: true, type, file_url: `/downloads/finance_${type}_${Date.now()}.xlsx`, rows: Math.floor(Math.random() * 1000) + 100 };
  }
}
