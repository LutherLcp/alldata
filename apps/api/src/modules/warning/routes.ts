/**
 * 预警管理路由
 */
import { FastifyInstance } from 'fastify';
import { requireAuth } from '@/plugins/auth';
import { sendSuccess, ApiError } from '@/common/utils/response';
import { WarningService } from './service';

export async function warningRoutes(app: FastifyInstance) {
  const svc = new WarningService(app);
  const uid = (r: any) => Number(r.user.userId);
  const pid = (r: any) => Number((r.headers as any)['project-id']) || Number((r.query as any).project_id);

  app.get('/', { preHandler: requireAuth }, async (req, reply) => {
    const projectId = pid(req);
    if (!projectId) return ApiError.badRequest(reply, '缺少 project_id');
    return sendSuccess(reply, await svc.listWarnings(projectId));
  });

  app.get('/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const w = await svc.getWarning(Number(id));
    if (!w) return ApiError.notFound(reply, '预警规则不存在');
    return sendSuccess(reply, w);
  });

  app.post('/', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    if (!body.project_id || !body.name || !body.monitor_rules) return ApiError.badRequest(reply, '缺少必填字段');
    return sendSuccess(reply, await svc.createWarning(body, uid(req)), '创建成功', 201);
  });

  app.put('/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    return sendSuccess(reply, await svc.updateWarning(Number(id), req.body as any), '更新成功');
  });

  app.delete('/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await svc.deleteWarning(Number(id));
    return sendSuccess(reply, null, '删除成功');
  });

  app.post('/:id/check', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    return sendSuccess(reply, await svc.triggerCheck(Number(id)), '检查完成');
  });

  app.get('/:id/logs', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    return sendSuccess(reply, await svc.listLogs(Number(id)));
  });
}
