/**
 * 数据资产路由
 * 数据表:   GET/POST/PUT/DELETE /api/assets/tables
 * 数据集:   GET/POST/PUT/DELETE /api/assets/datasets
 * 属性:     GET/POST/PUT/DELETE /api/assets/attributes
 * 分类:     GET/POST/DELETE      /api/assets/categories
 *
 * 按 ID 的读写在服务层带 project_id 过滤（字段等子资源通过所属数据表关联校验），
 * 跨项目访问统一返回 404。
 */
import { requireProjectAccess } from '@/common/middleware/projectAccess';
import { ApiError, sendSuccess } from '@/common/utils/response';
import { requireAuth } from '@/plugins/auth';
import type { FastifyInstance } from 'fastify';
import { DataAssetService } from './service';

export async function dataAssetRoutes(app: FastifyInstance) {
  const svc = new DataAssetService(app);
  const uid = (r: any) => Number(r.user.userId);

  // ─── 数据表 ──────────────────────────────
  app.get('/tables', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const projectId = req.projectId as number;
    const q = req.query as any;
    const list = await svc.listTables(projectId, q.type);
    return sendSuccess(reply, list);
  });

  app.get('/tables/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const table = await svc.getTable(Number(id), req.projectId as number);
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

  app.put('/tables/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const table = await svc.updateTable(Number(id), req.projectId as number, req.body as any);
    if (!table) return ApiError.notFound(reply, '数据表不存在');
    return sendSuccess(reply, table, '更新成功');
  });

  app.delete('/tables/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const removed = await svc.deleteTable(Number(id), req.projectId as number);
    if (!removed) return ApiError.notFound(reply, '数据表不存在');
    return sendSuccess(reply, null, '删除成功');
  });

  // 数据表字段
  app.get('/tables/:id/columns', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const columns = await svc.listColumns(Number(id), req.projectId as number);
    if (!columns) return ApiError.notFound(reply, '数据表不存在');
    return sendSuccess(reply, columns);
  });

  app.post('/tables/:id/columns', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;
    const col = await svc.createColumn(
      { ...body, datatable_id: Number(id) },
      req.projectId as number,
    );
    if (!col) return ApiError.notFound(reply, '数据表不存在');
    return sendSuccess(reply, col, '创建成功', 201);
  });

  app.delete('/columns/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const removed = await svc.deleteColumn(Number(id), req.projectId as number);
    if (!removed) return ApiError.notFound(reply, '字段不存在');
    return sendSuccess(reply, null, '删除成功');
  });

  // ─── 数据集 ──────────────────────────────
  app.get('/datasets', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const projectId = req.projectId as number;
    const q = req.query as any;
    const list = await svc.listDatasets(projectId, q.type);
    return sendSuccess(reply, list);
  });

  app.get('/datasets/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const ds = await svc.getDataset(Number(id), req.projectId as number);
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

  app.put('/datasets/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const ds = await svc.updateDataset(Number(id), req.projectId as number, req.body as any);
    if (!ds) return ApiError.notFound(reply, '数据集不存在');
    return sendSuccess(reply, ds, '更新成功');
  });

  app.delete('/datasets/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const removed = await svc.deleteDataset(Number(id), req.projectId as number);
    if (!removed) return ApiError.notFound(reply, '数据集不存在');
    return sendSuccess(reply, null, '删除成功');
  });

  // ─── 属性管理 ────────────────────────────
  app.get('/attributes', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const projectId = req.projectId as number;
    const q = req.query as any;
    const list = await svc.listAttributes(
      projectId,
      q.category_id ? Number(q.category_id) : undefined,
    );
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

  app.put('/attributes/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const attr = await svc.updateAttribute(Number(id), req.projectId as number, req.body as any);
    if (!attr) return ApiError.notFound(reply, '属性不存在');
    return sendSuccess(reply, attr, '更新成功');
  });

  app.delete('/attributes/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const removed = await svc.deleteAttribute(Number(id), req.projectId as number);
    if (!removed) return ApiError.notFound(reply, '属性不存在');
    return sendSuccess(reply, null, '删除成功');
  });

  // ─── 分类管理 ────────────────────────────
  app.get('/categories', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const projectId = req.projectId as number;
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

  app.delete('/categories/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const removed = await svc.deleteCategory(Number(id), req.projectId as number);
    if (!removed) return ApiError.notFound(reply, '分类不存在');
    return sendSuccess(reply, null, '删除成功');
  });
}
