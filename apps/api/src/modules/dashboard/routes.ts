/**
 * 看板模块路由
 *
 * 按 ID 的读写在服务层带 project_id 过滤，跨项目访问统一返回 404。
 * 例外：GET /soft-links/:token 是分享链接的公开读取入口，凭 token 访问，不做项目校验。
 */
import { requireProjectAccess } from '@/common/middleware/projectAccess';
import { ApiError, sendSuccess } from '@/common/utils/response';
import { requireAuth } from '@/plugins/auth';
import type { FastifyInstance } from 'fastify';
import { DashboardService } from './service';

export async function dashboardRoutes(app: FastifyInstance) {
  const svc = new DashboardService(app);
  const uid = (r: any) => Number(r.user.userId);

  // ─── 文件夹 ──────────────────────────────
  app.get('/folders', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const projectId = req.projectId as number;
    const tree = await svc.getFolderTree(projectId);
    return sendSuccess(reply, tree);
  });

  app.post('/folders', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    const folder = await svc.createFolder(body, uid(req));
    return sendSuccess(reply, folder, '创建成功', 201);
  });

  app.put('/folders/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const folder = await svc.updateFolder(Number(id), req.projectId as number, req.body as any);
    if (!folder) return ApiError.notFound(reply, '文件夹不存在');
    return sendSuccess(reply, folder, '更新成功');
  });

  app.delete('/folders/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const removed = await svc.deleteFolder(Number(id), req.projectId as number);
    if (!removed) return ApiError.notFound(reply, '文件夹不存在');
    return sendSuccess(reply, null, '删除成功');
  });

  // ─── 看板 ────────────────────────────────
  app.get('/', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const projectId = req.projectId as number;
    const folderId = (req.query as any).folder_id
      ? Number((req.query as any).folder_id)
      : undefined;
    const list = await svc.listDashboards(projectId, folderId);
    return sendSuccess(reply, list);
  });

  app.get('/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const dashboard = await svc.getDashboard(Number(id), req.projectId as number);
    if (!dashboard) return ApiError.notFound(reply, '看板不存在');
    return sendSuccess(reply, dashboard);
  });

  app.post('/', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    const dashboard = await svc.createDashboard(body, uid(req));
    return sendSuccess(reply, dashboard, '创建成功', 201);
  });

  app.put('/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const dashboard = await svc.updateDashboard(
      Number(id),
      req.projectId as number,
      req.body as any,
      uid(req),
    );
    if (!dashboard) return ApiError.notFound(reply, '看板不存在');
    return sendSuccess(reply, dashboard, '更新成功');
  });

  app.delete('/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const archived = await svc.archiveDashboard(Number(id), req.projectId as number);
    if (!archived) return ApiError.notFound(reply, '看板不存在');
    return sendSuccess(reply, null, '归档成功');
  });

  // ─── 报表 ────────────────────────────────
  app.post('/reports', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    const report = await svc.createReport(body, uid(req));
    return sendSuccess(reply, report, '创建成功', 201);
  });

  app.put('/reports/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const report = await svc.updateReport(Number(id), req.projectId as number, req.body as any);
    if (!report) return ApiError.notFound(reply, '报表不存在');
    return sendSuccess(reply, report, '更新成功');
  });

  app.delete('/reports/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const removed = await svc.deleteReport(Number(id), req.projectId as number);
    if (!removed) return ApiError.notFound(reply, '报表不存在');
    return sendSuccess(reply, null, '删除成功');
  });

  app.post('/reports/:id/query', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const data = await svc.executeReportData(Number(id), req.projectId as number, req.body as any);
    if (!data) return ApiError.notFound(reply, '报表不存在');
    return sendSuccess(reply, data);
  });

  // ─── 软链 ────────────────────────────────
  app.post('/soft-links', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { dashboard_id, name, expire_at } = req.body as any;
    if (!dashboard_id) return ApiError.badRequest(reply, '缺少必填字段 (dashboard_id)');
    const link = await svc.createSoftLink(
      Number(dashboard_id),
      req.projectId as number,
      uid(req),
      name,
      expire_at ? new Date(expire_at) : undefined,
    );
    if (!link) return ApiError.notFound(reply, '看板不存在');
    return sendSuccess(reply, link, '创建成功', 201);
  });

  app.get('/soft-links/:token', async (req, reply) => {
    const { token } = req.params as { token: string };
    const link = await svc.getSoftLink(token);
    if (!link) return ApiError.notFound(reply, '链接不存在或已失效');
    if (link.expire_at && link.expire_at < new Date())
      return ApiError.unauthorized(reply, '链接已过期');
    return sendSuccess(reply, link);
  });

  app.delete('/soft-links/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const revoked = await svc.revokeSoftLink(Number(id), req.projectId as number);
    if (!revoked) return ApiError.notFound(reply, '链接不存在');
    return sendSuccess(reply, null, '已取消');
  });
}
