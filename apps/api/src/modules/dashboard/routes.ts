/**
 * 看板模块路由
 */
import { FastifyInstance } from 'fastify';
import { requireAuth } from '@/plugins/auth';
import { sendSuccess, ApiError } from '@/common/utils/response';
import { DashboardService } from './service';

export async function dashboardRoutes(app: FastifyInstance) {
  const svc = new DashboardService(app);
  const uid = (r: any) => Number(r.user.userId);

  // ─── 文件夹 ──────────────────────────────
  app.get('/folders', { preHandler: requireAuth }, async (req, reply) => {
    const projectId = Number((req.headers as any)['project-id']) || Number((req.query as any).project_id);
    if (!projectId) return ApiError.badRequest(reply, '缺少 project_id');
    const tree = await svc.getFolderTree(projectId);
    return sendSuccess(reply, tree);
  });

  app.post('/folders', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    const folder = await svc.createFolder(body, uid(req));
    return sendSuccess(reply, folder, '创建成功', 201);
  });

  app.put('/folders/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const folder = await svc.updateFolder(Number(id), req.body as any);
    return sendSuccess(reply, folder, '更新成功');
  });

  app.delete('/folders/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await svc.deleteFolder(Number(id));
    return sendSuccess(reply, null, '删除成功');
  });

  // ─── 看板 ────────────────────────────────
  app.get('/', { preHandler: requireAuth }, async (req, reply) => {
    const projectId = Number((req.headers as any)['project-id']) || Number((req.query as any).project_id);
    const folderId = (req.query as any).folder_id ? Number((req.query as any).folder_id) : undefined;
    if (!projectId) return ApiError.badRequest(reply, '缺少 project_id');
    const list = await svc.listDashboards(projectId, folderId);
    return sendSuccess(reply, list);
  });

  app.get('/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const dashboard = await svc.getDashboard(Number(id));
    if (!dashboard) return ApiError.notFound(reply, '看板不存在');
    return sendSuccess(reply, dashboard);
  });

  app.post('/', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    const dashboard = await svc.createDashboard(body, uid(req));
    return sendSuccess(reply, dashboard, '创建成功', 201);
  });

  app.put('/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const dashboard = await svc.updateDashboard(Number(id), req.body as any, uid(req));
    return sendSuccess(reply, dashboard, '更新成功');
  });

  app.delete('/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await svc.archiveDashboard(Number(id));
    return sendSuccess(reply, null, '归档成功');
  });

  // ─── 报表 ────────────────────────────────
  app.post('/reports', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    const report = await svc.createReport(body, uid(req));
    return sendSuccess(reply, report, '创建成功', 201);
  });

  app.put('/reports/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const report = await svc.updateReport(Number(id), req.body as any);
    return sendSuccess(reply, report, '更新成功');
  });

  app.delete('/reports/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await svc.deleteReport(Number(id));
    return sendSuccess(reply, null, '删除成功');
  });

  // ─── 软链 ────────────────────────────────
  app.post('/soft-links', { preHandler: requireAuth }, async (req, reply) => {
    const { dashboard_id, name, expire_at } = req.body as any;
    const link = await svc.createSoftLink(dashboard_id, uid(req), name, expire_at ? new Date(expire_at) : undefined);
    return sendSuccess(reply, link, '创建成功', 201);
  });

  app.get('/soft-links/:token', async (req, reply) => {
    const { token } = req.params as { token: string };
    const link = await svc.getSoftLink(token);
    if (!link) return ApiError.notFound(reply, '链接不存在或已失效');
    if (link.expire_at && link.expire_at < new Date()) return ApiError.unauthorized(reply, '链接已过期');
    return sendSuccess(reply, link);
  });

  app.delete('/soft-links/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await svc.revokeSoftLink(Number(id));
    return sendSuccess(reply, null, '已取消');
  });
}
