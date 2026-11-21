/**
 * 财务管理路由注册模块
 */
import { ApiError, sendSuccess } from '@/common/utils/response';
import { requireAuth } from '@/plugins/auth';
import type { FastifyInstance } from 'fastify';
import { FinanceService } from './service';

export async function financeRoutes(app: FastifyInstance) {
  const svc = new FinanceService(app);

  // ─── Supplier 供应商 ───

  app.get('/suppliers', { preHandler: requireAuth }, async (_req, reply) => {
    const list = await svc.listSuppliers();
    return sendSuccess(reply, list);
  });

  app.post('/suppliers', { preHandler: requireAuth }, async (req, reply) => {
    const body = (req.body as any) || {};
    if (!body.supplier_name) return ApiError.badRequest(reply, '缺少供应商名称');
    const created = await svc.createSupplier(body);
    return sendSuccess(reply, created, '创建成功', 201);
  });

  app.put('/suppliers/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const updated = await svc.updateSupplier(Number(id), (req.body as any) || {});
    return sendSuccess(reply, updated, '更新成功');
  });

  app.delete('/suppliers/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await svc.deleteSupplier(Number(id));
    return sendSuccess(reply, { deleted: true }, '删除成功');
  });

  // ─── ShareRatio 分成比例 ───

  app.get('/share-ratios', { preHandler: requireAuth }, async (req, reply) => {
    const supplierId = (req.query as any).supplier_id
      ? Number((req.query as any).supplier_id)
      : undefined;
    const list = await svc.listShareRatios(supplierId);
    return sendSuccess(reply, list);
  });

  app.post('/share-ratios', { preHandler: requireAuth }, async (req, reply) => {
    const body = (req.body as any) || {};
    if (!body.supplier_id || !body.platform || body.ratio === undefined) {
      return ApiError.badRequest(reply, '缺少必填字段 (supplier_id, platform, ratio)');
    }
    const created = await svc.createShareRatio({
      supplier_id: Number(body.supplier_id),
      platform: String(body.platform),
      ratio: Number(body.ratio),
      effective_date: body.effective_date || new Date().toISOString(),
    });
    return sendSuccess(reply, created, '创建成功', 201);
  });

  app.put('/share-ratios/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const updated = await svc.updateShareRatio(Number(id), (req.body as any) || {});
    return sendSuccess(reply, updated, '更新成功');
  });

  app.delete('/share-ratios/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await svc.deleteShareRatio(Number(id));
    return sendSuccess(reply, { deleted: true }, '删除成功');
  });

  // ─── Reconciliation 对账与结算 ───

  app.get('/reconciliations', { preHandler: requireAuth }, async (req, reply) => {
    const supplierId = (req.query as any).supplier_id
      ? Number((req.query as any).supplier_id)
      : undefined;
    const list = await svc.listReconciliations(supplierId);
    return sendSuccess(reply, list);
  });

  app.post('/reconciliations', { preHandler: requireAuth }, async (req, reply) => {
    const body = (req.body as any) || {};
    if (!body.supplier_id || !body.platform || !body.game || !body.period) {
      return ApiError.badRequest(reply, '缺少必填字段');
    }
    const created = await svc.createReconciliation(body);
    return sendSuccess(reply, created, '创建成功', 201);
  });

  app.post('/reconciliations/:id/settle', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = await svc.settleReconciliation(Number(id));
    if (!result) return ApiError.notFound(reply, '对账记录不存在');
    return sendSuccess(reply, result, '结算核算完成');
  });

  app.put('/reconciliations/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const updated = await svc.updateReconciliation(Number(id), (req.body as any) || {});
    return sendSuccess(reply, updated, '更新成功');
  });

  app.delete('/reconciliations/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await svc.deleteReconciliation(Number(id));
    return sendSuccess(reply, { deleted: true }, '删除成功');
  });

  // ─── Excel 导出 ───

  app.post('/export', { preHandler: requireAuth }, async (req, reply) => {
    const { type } = (req.body as { type?: string }) || {};
    const report = await svc.exportReport(type || 'summary');
    return sendSuccess(reply, report, '导出成功');
  });
}
