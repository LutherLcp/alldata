/**
 * KoCRM 管理路由注册模块
 */
import { requireProjectAccess } from '@/common/middleware/projectAccess';
import { ApiError, sendSuccess } from '@/common/utils/response';
import type { FastifyInstance } from 'fastify';
import { KocrmService } from './service';

export async function kocrmRoutes(app: FastifyInstance) {
  const svc = new KocrmService(app);

  // ─── Account 账户 ───

  app.get('/accounts', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const projectId = req.projectId as number;
    const accounts = await svc.listAccounts(projectId);
    return sendSuccess(reply, accounts);
  });

  app.post('/accounts', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const projectId = req.projectId as number;
    const body = (req.body as any) || {};
    if (!body.platform || !body.account_name) {
      return ApiError.badRequest(reply, '缺少必填字段 (platform 或 account_name)');
    }
    const created = await svc.createAccount({
      project_id: projectId,
      platform: body.platform,
      account_name: body.account_name,
      account_id: body.account_id || `ACC_${Date.now()}`,
      meta: body.meta,
    });
    return sendSuccess(reply, created, '创建成功', 201);
  });

  app.put('/accounts/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const projectId = req.projectId as number;
    const { id } = req.params as { id: string };
    const updated = await svc.updateAccount(Number(id), projectId, (req.body as any) || {});
    if (!updated) return ApiError.notFound(reply, '账户不存在或无权访问');
    return sendSuccess(reply, updated, '更新成功');
  });

  app.delete('/accounts/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const projectId = req.projectId as number;
    const { id } = req.params as { id: string };
    const ok = await svc.deleteAccount(Number(id), projectId);
    if (!ok) return ApiError.notFound(reply, '账户不存在或无权访问');
    return sendSuccess(reply, { deleted: true }, '删除成功');
  });

  // ─── Creator KOC/达人 ───

  app.get('/creators', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const projectId = req.projectId as number;
    const creators = await svc.listCreators(projectId);
    return sendSuccess(reply, creators);
  });

  app.post('/creators', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const projectId = req.projectId as number;
    const body = (req.body as any) || {};
    if (!body.platform || !body.name) {
      return ApiError.badRequest(reply, '缺少必填字段 (platform 或 name)');
    }
    const created = await svc.createCreator({
      project_id: projectId,
      platform: body.platform,
      name: body.name,
      uid: body.uid || `UID_${Date.now()}`,
      followers: Number(body.followers || 0),
      tags: body.tags || [],
      meta: body.meta,
    });
    return sendSuccess(reply, created, '创建成功', 201);
  });

  app.put('/creators/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const projectId = req.projectId as number;
    const { id } = req.params as { id: string };
    const updated = await svc.updateCreator(Number(id), projectId, (req.body as any) || {});
    if (!updated) return ApiError.notFound(reply, '达人记录不存在或无权访问');
    return sendSuccess(reply, updated, '更新成功');
  });

  app.delete('/creators/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const projectId = req.projectId as number;
    const { id } = req.params as { id: string };
    const ok = await svc.deleteCreator(Number(id), projectId);
    if (!ok) return ApiError.notFound(reply, '达人记录不存在或无权访问');
    return sendSuccess(reply, { deleted: true }, '删除成功');
  });

  app.post(
    '/creators/:id/influence',
    { preHandler: requireProjectAccess() },
    async (req, reply) => {
      const projectId = req.projectId as number;
      const { id } = req.params as { id: string };
      const result = await svc.calculateCreatorInfluence(Number(id), projectId);
      if (!result) return ApiError.notFound(reply, '达人记录不存在或无权访问');
      return sendSuccess(reply, result, '影响力评估计算完成');
    },
  );
}
