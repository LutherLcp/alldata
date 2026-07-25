/**
 * 数据资产路由
 * 数据表:   GET/POST/PUT/DELETE /api/assets/tables
 * 数据集:   GET/POST/PUT/DELETE /api/assets/datasets
 * 属性:     GET/POST/PUT/DELETE /api/assets/attributes
 * 分类:     GET/POST/DELETE      /api/assets/categories
 */
import { FastifyInstance } from 'fastify';
import { requireAuth } from '@/plugins/auth';
import { sendSuccess, ApiError } from '@/common/utils/response';
import { DataAssetService } from './service';

export async function dataAssetRoutes(app: FastifyInstance) {
  const svc = new DataAssetService(app);
  const uid = (r: any) => Number(r.user.userId);
  const pid = (r: any) => Number((r.headers as any)['project-id']) || Number((r.query as any).project_id);

  // ─── 数据表 ──────────────────────────────
  app.get('/tables', { preHandler: requireAuth }, async (req, reply) => {
    const projectId = pid(req);
    if (!projectId) return ApiError.badRequest(reply, '缺少 project_id');
    const q = req.query as any;
    const list = await svc.listTables(projectId, q.type);
    return sendSuccess(reply, list);
  });

  app.get('/tables/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const table = await svc.getTable(Number(id));
    if (!table) return ApiError.notFound(reply, '数据表不存在');
    return sendSuccess(reply, table);
  });

  app.post('/tables', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    if (!body.project_id || !body.name || !body.type) {
      return ApiError.badRequest(reply, '缺少必填字段 (project_id, name, type)');
    }
    const table = await svc.createTable({ ...body, created_by: uid(req) });
    return sendSuccess(reply, table, '创建成功', 201);
  });

  app.put('/tables/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const table = await svc.updateTable(Number(id), req.body as any);
    return sendSuccess(reply, table, '更新成功');
  });

  app.delete('/tables/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await svc.deleteTable(Number(id));
    return sendSuccess(reply, null, '删除成功');
  });

  // 数据表字段
  app.get('/tables/:id/columns', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const columns = await svc.listColumns(Number(id));
    return sendSuccess(reply, columns);
  });

  app.post('/tables/:id/columns', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;
    const col = await svc.createColumn({ ...body, datatable_id: Number(id) });
    return sendSuccess(reply, col, '创建成功', 201);
  });

  app.delete('/columns/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await svc.deleteColumn(Number(id));
    return sendSuccess(reply, null, '删除成功');
  });

  // ─── 数据集 ──────────────────────────────
  app.get('/datasets', { preHandler: requireAuth }, async (req, reply) => {
    const projectId = pid(req);
    if (!projectId) return ApiError.badRequest(reply, '缺少 project_id');
    const q = req.query as any;
    const list = await svc.listDatasets(projectId, q.type);
    return sendSuccess(reply, list);
  });

  app.get('/datasets/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const ds = await svc.getDataset(Number(id));
    if (!ds) return ApiError.notFound(reply, '数据集不存在');
    return sendSuccess(reply, ds);
  });

  app.post('/datasets', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    if (!body.project_id || !body.name || !body.type) {
      return ApiError.badRequest(reply, '缺少必填字段 (project_id, name, type)');
    }
    const ds = await svc.createDataset({ ...body, created_by: uid(req) });
    return sendSuccess(reply, ds, '创建成功', 201);
  });

  app.put('/datasets/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const ds = await svc.updateDataset(Number(id), req.body as any);
    return sendSuccess(reply, ds, '更新成功');
  });

  app.delete('/datasets/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await svc.deleteDataset(Number(id));
    return sendSuccess(reply, null, '删除成功');
  });

  // ─── 属性管理 ────────────────────────────
  app.get('/attributes', { preHandler: requireAuth }, async (req, reply) => {
    const projectId = pid(req);
    if (!projectId) return ApiError.badRequest(reply, '缺少 project_id');
    const q = req.query as any;
    const list = await svc.listAttributes(projectId, q.category_id ? Number(q.category_id) : undefined);
    return sendSuccess(reply, list);
  });

  app.post('/attributes', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    if (!body.project_id || !body.name || !body.data_type) {
      return ApiError.badRequest(reply, '缺少必填字段 (project_id, name, data_type)');
    }
    const attr = await svc.createAttribute({ ...body, created_by: uid(req) });
    return sendSuccess(reply, attr, '创建成功', 201);
  });

  app.put('/attributes/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const attr = await svc.updateAttribute(Number(id), req.body as any);
    return sendSuccess(reply, attr, '更新成功');
  });

  app.delete('/attributes/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await svc.deleteAttribute(Number(id));
    return sendSuccess(reply, null, '删除成功');
  });

  // ─── 分类管理 ────────────────────────────
  app.get('/categories', { preHandler: requireAuth }, async (req, reply) => {
    const projectId = pid(req);
    if (!projectId) return ApiError.badRequest(reply, '缺少 project_id');
    const q = req.query as any;
    const list = await svc.listCategories(projectId, q.type);
    return sendSuccess(reply, list);
  });

  app.post('/categories', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    if (!body.project_id || !body.name || !body.type) {
      return ApiError.badRequest(reply, '缺少必填字段 (project_id, name, type)');
    }
    const cat = await svc.createCategory(body);
    return sendSuccess(reply, cat, '创建成功', 201);
  });

  app.delete('/categories/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await svc.deleteCategory(Number(id));
    return sendSuccess(reply, null, '删除成功');
  });
}
