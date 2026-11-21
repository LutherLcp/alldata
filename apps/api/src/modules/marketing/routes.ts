/**
 * 营销 Flow 路由注册模块
 */
import { requireProjectAccess } from '@/common/middleware/projectAccess';
import { ApiError, sendSuccess } from '@/common/utils/response';
import type { FastifyInstance } from 'fastify';
import { MarketingService } from './service';

export async function marketingRoutes(app: FastifyInstance) {
  const service = new MarketingService(app);
  const uid = (r: any) => Number(r.user?.userId || r.user?.id || 1);

  app.get('/flows', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const pid = req.projectId as number;
    const flows = await service.listFlows(pid);
    return sendSuccess(reply, flows);
  });

  app.get('/flows/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const pid = req.projectId as number;
    const { id } = req.params as { id: string };
    const flow = await service.getFlow(pid, Number(id));
    if (!flow) return ApiError.notFound(reply, '营销 Flow 画布不存在');
    return sendSuccess(reply, flow);
  });

  app.post('/flows', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const pid = req.projectId as number;
    const body = req.body as any;
    if (!body?.name) {
      return ApiError.badRequest(reply, '缺少必填字段: name');
    }
    const flow = await service.createFlow(pid, body, uid(req));
    return sendSuccess(reply, flow, 'Flow 画布创建成功', 201);
  });

  app.put('/flows/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const pid = req.projectId as number;
    const { id } = req.params as { id: string };
    const updated = await service.updateFlow(pid, Number(id), req.body as any);
    if (!updated) return ApiError.notFound(reply, '营销 Flow 画布不存在');
    return sendSuccess(reply, updated, 'Flow 画布更新成功');
  });

  app.delete('/flows/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const pid = req.projectId as number;
    const { id } = req.params as { id: string };
    const deleted = await service.deleteFlow(pid, Number(id));
    if (!deleted) return ApiError.notFound(reply, '营销 Flow 画布不存在');
    return sendSuccess(reply, { deleted: true }, 'Flow 画布已删除');
  });

  app.post('/flows/:id/execute', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const pid = req.projectId as number;
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};
    const userId = body.user_id || `USR_${Date.now()}`;
    const result = await service.executeFlow(pid, Number(id), {
      user_id: userId,
      event_name: body.event_name,
      properties: body.properties,
      is_converted: body.is_converted,
    });
    return sendSuccess(reply, result, 'Flow 执行完成');
  });

  app.post('/flows/:id/test', async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = await service.triggerTestFlow(Number(id), 'USR_TEST_88');
    return sendSuccess(reply, result, 'Flow 测试触发成功');
  });
}
