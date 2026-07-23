/**
 * 标签管理路由
 */
import { FastifyInstance } from 'fastify';
import { requireAuth } from '@/plugins/auth';
import { sendSuccess, ApiError } from '@/common/utils/response';
import { TagService } from './service';

export async function tagRoutes(app: FastifyInstance) {
  const svc = new TagService(app);
  const uid = (r: any) => Number(r.user.userId);
  const pid = (r: any) => Number((r.headers as any)['project-id']) || Number((r.query as any).project_id);

  app.get('/', { preHandler: requireAuth }, async (req, reply) => {
    const projectId = pid(req);
    if (!projectId) return ApiError.badRequest(reply, '缺少 project_id');
    const list = await svc.listTags(projectId, (req.query as any).tag_type);
    return sendSuccess(reply, list);
  });

  app.get('/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const tag = await svc.getTag(Number(id));
    if (!tag) return ApiError.notFound(reply, '标签不存在');
    return sendSuccess(reply, tag);
  });

  app.post('/', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    if (!body.project_id || !body.name || !body.tag_type) return ApiError.badRequest(reply, '缺少必填字段');
    const tag = await svc.createTag(body, uid(req));
    return sendSuccess(reply, tag, '创建成功', 201);
  });

  app.put('/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const tag = await svc.updateTag(Number(id), req.body as any);
    return sendSuccess(reply, tag, '更新成功');
  });

  app.delete('/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await svc.deleteTag(Number(id));
    return sendSuccess(reply, null, '删除成功');
  });

  app.post('/:id/refresh', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = await svc.triggerRefresh(Number(id));
    return sendSuccess(reply, result, '计算完成');
  });
}
