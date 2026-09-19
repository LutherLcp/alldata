import { requireProjectAccess } from '@/common/middleware/projectAccess';
import { ApiError, sendSuccess } from '@/common/utils/response';
/**
 * 标签管理路由
 *
 * 所有接口均要求「当前用户是该项目成员」，且按 ID 操作时在服务层带 project_id 过滤，
 * 避免跨租户读写（IDOR）。
 */
import type { FastifyInstance } from 'fastify';
import { TagService } from './service';

export async function tagRoutes(app: FastifyInstance) {
  const svc = new TagService(app);
  const uid = (r: any) => Number(r.user.userId);

  app.get('/', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const list = await svc.listTags(req.projectId as number, (req.query as any).tag_type);
    return sendSuccess(reply, list);
  });

  app.get('/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const tag = await svc.getTag(Number(id), req.projectId as number);
    if (!tag) return ApiError.notFound(reply, '标签不存在');
    return sendSuccess(reply, tag);
  });

  app.post('/', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const body = req.body as any;
    if (!body.name || !body.tag_type) return ApiError.badRequest(reply, '缺少必填字段');
    // project_id 以已校验的上下文为准，忽略请求体中的值
    const tag = await svc.createTag({ ...body, project_id: req.projectId }, uid(req));
    return sendSuccess(reply, tag, '创建成功', 201);
  });

  app.put('/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const tag = await svc.updateTag(Number(id), req.projectId as number, req.body as any);
    if (!tag) return ApiError.notFound(reply, '标签不存在');
    return sendSuccess(reply, tag, '更新成功');
  });

  app.delete('/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const removed = await svc.deleteTag(Number(id), req.projectId as number);
    if (!removed) return ApiError.notFound(reply, '标签不存在');
    return sendSuccess(reply, null, '删除成功');
  });

  app.post('/:id/refresh', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = await svc.triggerRefresh(Number(id), req.projectId as number);
    if (!result) return ApiError.notFound(reply, '标签不存在');
    return sendSuccess(reply, result, '计算完成');
  });
}
