/**
 * 财务管理路由
 */
import { FastifyInstance } from 'fastify';
import { requireAuth } from '@/plugins/auth';
import { sendSuccess, ApiError } from '@/common/utils/response';
import { FinanceService } from './service';

export async function financeRoutes(app: FastifyInstance) {
  const svc = new FinanceService(app);

  // ─── Supplier 供应商 ───
  app.get('/suppliers', { preHandler: requireAuth }, async (req, reply) => {
    return sendSuccess(reply, await svc.listSuppliers());
  });
  app.post('/suppliers', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    if (!body.supplier_name) return ApiError.badRequest(reply, '缺少供应商名称');
    return sendSuccess(reply, await svc.createSupplier(body), '创建成功', 201);
  });
  app.put('/suppliers/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    return sendSuccess(reply, await svc.updateSupplier(Number(id), req.body as any), '更新成功');
  });
  app.delete('/suppliers/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await svc.deleteSupplier(Number(id));
    return sendSuccess(reply, null, '删除成功');
  });

  // ─── ShareRatio 分成比例 ───
  app.get('/share-ratios', { preHandler: requireAuth }, async (req, reply) => {
    const supplierId = (req.query as any).supplier_id ? Number((req.query as any).supplier_id) : undefined;
    return sendSuccess(reply, await svc.listShareRatios(supplierId));
  });
  app.post('/share-ratios', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    if (!body.supplier_id || !body.platform || !body.ratio) return ApiError.badRequest(reply, '缺少必填字段');
    return sendSuccess(reply, await svc.createShareRatio(body), '创建成功', 201);
  });
  app.put('/share-ratios/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    return sendSuccess(reply, await svc.updateShareRatio(Number(id), req.body as any), '更新成功');
  });
  app.delete('/share-ratios/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await svc.deleteShareRatio(Number(id));
    return sendSuccess(reply, null, '删除成功');
  });

  // ─── Reconciliation 对账 ───
  app.get('/reconciliations', { preHandler: requireAuth }, async (req, reply) => {
    const supplierId = (req.query as any).supplier_id ? Number((req.query as any).supplier_id) : undefined;
    return sendSuccess(reply, await svc.listReconciliations(supplierId));
  });
  app.post('/reconciliations', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    if (!body.supplier_id || !body.platform || !body.game || !body.period) return ApiError.badRequest(reply, '缺少必填字段');
    return sendSuccess(reply, await svc.createReconciliation(body), '创建成功', 201);
  });
  app.put('/reconciliations/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    return sendSuccess(reply, await svc.updateReconciliation(Number(id), req.body as any), '更新成功');
  });
  app.delete('/reconciliations/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await svc.deleteReconciliation(Number(id));
    return sendSuccess(reply, null, '删除成功');
  });

  // ─── Excel 导出 ───
  app.post('/export', { preHandler: requireAuth }, async (req, reply) => {
    const { type } = req.body as { type: string };
    return sendSuccess(reply, await svc.exportReport(type || 'summary'), '导出成功');
  });
}
