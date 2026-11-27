/**
 * 推送订阅路由 (全量端点接入 requireProjectAccess() 鉴权守卫，杜绝越权 IDOR)
 */
import { requireProjectAccess } from '@/common/middleware/projectAccess';
import { ApiError, sendSuccess } from '@/common/utils/response';
import type { FastifyInstance } from 'fastify';
import { SubscriptionService } from './service';

export async function subscriptionRoutes(app: FastifyInstance) {
  const svc = new SubscriptionService(app);
  const uid = (r: any) => Number(r.user?.userId || 1);

  // ─── Subscription ───
  app.get('/subscriptions', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const projectId = req.projectId as number;
    return sendSuccess(reply, await svc.listSubscriptions(projectId));
  });

  app.get('/subscriptions/summary', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const projectId = req.projectId as number;
    return sendSuccess(reply, await svc.getSubscriptionSummary(projectId));
  });

  app.get('/subscriptions/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const sub = await svc.getSubscription(Number(id), req.projectId as number);
    if (!sub) return ApiError.notFound(reply, '订阅不存在');
    return sendSuccess(reply, sub);
  });

  app.post('/subscriptions', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const body = req.body as any;
    if (!body.name || !body.schedule_cron || !body.notify_type) {
      return ApiError.badRequest(reply, '缺少必填字段 (name, schedule_cron, notify_type)');
    }
    const created = await svc.createSubscription(
      {
        ...body,
        project_id: req.projectId as number,
        entity_id: body.entity_id || 1,
        entity_type: body.entity_type || 'dashboard',
      },
      uid(req),
    );
    return sendSuccess(reply, created, '创建成功', 201);
  });

  app.put('/subscriptions/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const updated = await svc.updateSubscription(
      Number(id),
      req.projectId as number,
      req.body as any,
    );
    if (!updated) return ApiError.notFound(reply, '订阅不存在或无权修改');
    return sendSuccess(reply, updated, '更新成功');
  });

  app.delete('/subscriptions/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const success = await svc.deleteSubscription(Number(id), req.projectId as number);
    if (!success) return ApiError.notFound(reply, '订阅不存在或无权删除');
    return sendSuccess(reply, null, '删除成功');
  });

  app.post(
    '/subscriptions/:id/send',
    { preHandler: requireProjectAccess() },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const result = await svc.triggerSend(Number(id), req.projectId as number);
      if (!result) return ApiError.notFound(reply, '订阅不存在或无权触发');
      return sendSuccess(reply, result, '推送完成');
    },
  );

  // ─── PushConfig ───
  app.get('/push-configs', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const projectId = req.projectId as number;
    return sendSuccess(reply, await svc.listPushConfigs(projectId));
  });

  app.post('/push-configs', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const body = req.body as any;
    if (!body.name || !body.push_type) {
      return ApiError.badRequest(reply, '缺少必填字段 (name, push_type)');
    }
    const created = await svc.createPushConfig(
      { ...body, project_id: req.projectId as number },
      uid(req),
    );
    return sendSuccess(reply, created, '创建成功', 201);
  });

  app.delete('/push-configs/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const success = await svc.deletePushConfig(Number(id), req.projectId as number);
    if (!success) return ApiError.notFound(reply, '推送配置不存在或无权删除');
    return sendSuccess(reply, null, '删除成功');
  });
}
