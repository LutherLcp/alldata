/**
 * 下载任务路由
 */
import { FastifyInstance } from 'fastify';
import { requireAuth } from '@/plugins/auth';
import { sendSuccess, ApiError } from '@/common/utils/response';
import { DownloadService } from './service';

export async function downloadRoutes(app: FastifyInstance) {
  const svc = new DownloadService(app);
  const uid = (r: any) => Number(r.user.userId);
  const pid = (r: any) => Number((r.headers as any)['project-id']) || Number((r.query as any).project_id);

  app.get('/', { preHandler: requireAuth }, async (req, reply) => {
    const projectId = pid(req);
    if (!projectId) return ApiError.badRequest(reply, '缺少 project_id');
    return sendSuccess(reply, await svc.listTasks(projectId));
  });

  app.post('/', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    if (!body.project_id || !body.task_name || !body.task_type) return ApiError.badRequest(reply, '缺少必填字段');
    return sendSuccess(reply, await svc.createTask(body, uid(req)), '创建成功', 201);
  });

  app.delete('/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await svc.deleteTask(Number(id));
    return sendSuccess(reply, null, '删除成功');
  });

  app.post('/:id/execute', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    return sendSuccess(reply, await svc.executeTask(Number(id)), '导出完成');
  });
}
