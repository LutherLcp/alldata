/**
 * KoCRM 管理路由
 */
import { ApiError, sendSuccess } from '@/common/utils/response';
import { requireAuth } from '@/plugins/auth';
import { FastifyInstance } from 'fastify';
import { KocrmService } from './service';

export async function kocrmRoutes(app: FastifyInstance) {
  const svc = new KocrmService(app);
  const pid = (r: any) =>
    Number((r.headers as any)['project-id']) || Number((r.query as any).project_id);

  // ─── Account 账户 ───
  app.get('/accounts', { preHandler: requireAuth }, async (req, reply) => {
    const projectId = pid(req);
    if (!projectId) return ApiError.badRequest(reply, '缺少 project_id');
    return sendSuccess(reply, await svc.listAccounts(projectId));
  });
  app.post('/accounts', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    if (!body.project_id || !body.platform || !body.account_name)
      return ApiError.badRequest(reply, '缺少必填字段');
    return sendSuccess(reply, await svc.createAccount(body), '创建成功', 201);
  });
  app.put('/accounts/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    return sendSuccess(reply, await svc.updateAccount(Number(id), req.body as any), '更新成功');
  });
  app.delete('/accounts/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await svc.deleteAccount(Number(id));
    return sendSuccess(reply, null, '删除成功');
  });

  // ─── Creator KOC/达人 ───
  app.get('/creators', { preHandler: requireAuth }, async (req, reply) => {
    const projectId = pid(req);
    if (!projectId) return ApiError.badRequest(reply, '缺少 project_id');
    return sendSuccess(reply, await svc.listCreators(projectId));
  });
  app.post('/creators', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    if (!body.project_id || !body.platform || !body.name)
      return ApiError.badRequest(reply, '缺少必填字段');
    return sendSuccess(reply, await svc.createCreator(body), '创建成功', 201);
  });
  app.put('/creators/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    return sendSuccess(reply, await svc.updateCreator(Number(id), req.body as any), '更新成功');
  });
  app.delete('/creators/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await svc.deleteCreator(Number(id));
    return sendSuccess(reply, null, '删除成功');
  });
}
