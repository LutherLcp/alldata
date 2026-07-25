/**
 * 推送订阅路由
 */
import { FastifyInstance } from 'fastify';
import { requireAuth } from '@/plugins/auth';
import { sendSuccess, ApiError } from '@/common/utils/response';
import { SubscriptionService } from './service';

export async function subscriptionRoutes(app: FastifyInstance) {
  const svc = new SubscriptionService(app);
  const uid = (r: any) => Number(r.user.userId);
  const pid = (r: any) => Number((r.headers as any)['project-id']) || Number((r.query as any).project_id);

  // ─── Subscription ───
  app.get('/subscriptions', { preHandler: requireAuth }, async (req, reply) => {
    const projectId = pid(req);
    if (!projectId) return ApiError.badRequest(reply, '缺少 project_id');
    return sendSuccess(reply, await svc.listSubscriptions(projectId));
  });

  app.post('/subscriptions', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    if (!body.project_id || !body.name || !body.schedule_cron) return ApiError.badRequest(reply, '缺少必填字段');
    return sendSuccess(reply, await svc.createSubscription(body, uid(req)), '创建成功', 201);
  });

  app.put('/subscriptions/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    return sendSuccess(reply, await svc.updateSubscription(Number(id), req.body as any), '更新成功');
  });

  app.delete('/subscriptions/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await svc.deleteSubscription(Number(id));
    return sendSuccess(reply, null, '删除成功');
  });

  app.post('/subscriptions/:id/send', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    return sendSuccess(reply, await svc.triggerSend(Number(id)), '推送完成');
  });

  // ─── PushConfig ───
  app.get('/push-configs', { preHandler: requireAuth }, async (req, reply) => {
    const projectId = pid(req);
    if (!projectId) return ApiError.badRequest(reply, '缺少 project_id');
    return sendSuccess(reply, await svc.listPushConfigs(projectId));
  });

  app.post('/push-configs', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    if (!body.project_id || !body.name || !body.push_type) return ApiError.badRequest(reply, '缺少必填字段');
    return sendSuccess(reply, await svc.createPushConfig(body, uid(req)), '创建成功', 201);
  });

  app.delete('/push-configs/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await svc.deletePushConfig(Number(id));
    return sendSuccess(reply, null, '删除成功');
  });
}
