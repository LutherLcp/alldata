/**
 * 预警管理路由
 *
 * 按 ID 的读写在服务层带 project_id 过滤，跨项目访问统一返回 404。
 */
import { requireProjectAccess } from '@/common/middleware/projectAccess';
import { ApiError, sendSuccess } from '@/common/utils/response';
import { requireAuth } from '@/plugins/auth';
import type { FastifyInstance } from 'fastify';
import { WarningService } from './service';

export async function warningRoutes(app: FastifyInstance) {
  const svc = new WarningService(app);
  const uid = (r: any) => Number(r.user.userId);

  app.get('/', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const projectId = req.projectId as number;
    return sendSuccess(reply, await svc.listWarnings(projectId));
  });

  app.get('/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const w = await svc.getWarning(Number(id), req.projectId as number);
    if (!w) return ApiError.notFound(reply, '预警规则不存在');
    return sendSuccess(reply, w);
  });

  app.post('/', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    if (!body.project_id || !body.name || !body.monitor_rules)
      return ApiError.badRequest(reply, '缺少必填字段');
    return sendSuccess(reply, await svc.createWarning(body, uid(req)), '创建成功', 201);
  });

  app.put('/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const w = await svc.updateWarning(Number(id), req.projectId as number, req.body as any);
    if (!w) return ApiError.notFound(reply, '预警规则不存在');
    return sendSuccess(reply, w, '更新成功');
  });

  app.delete('/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const removed = await svc.deleteWarning(Number(id), req.projectId as number);
    if (!removed) return ApiError.notFound(reply, '预警规则不存在');
    return sendSuccess(reply, null, '删除成功');
  });

  app.post('/:id/check', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = await svc.triggerCheck(Number(id), req.projectId as number);
    if (!result) return ApiError.notFound(reply, '预警规则不存在');
    return sendSuccess(reply, result, '检查完成');
  });

  app.get('/:id/logs', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    return sendSuccess(reply, await svc.listLogs(Number(id), req.projectId as number));
  });
}
