/**
 * 枚举管理路由
 */
import { FastifyInstance } from 'fastify';
import { requireAuth } from '@/plugins/auth';
import { sendSuccess, ApiError } from '@/common/utils/response';
import { EnumService } from './service';

export async function enumRoutes(app: FastifyInstance) {
  const svc = new EnumService(app);
  const uid = (r: any) => Number(r.user.userId);
  const pid = (r: any) => Number((r.headers as any)['project-id']) || Number((r.query as any).project_id);

  app.get('/', { preHandler: requireAuth }, async (req, reply) => {
    const projectId = pid(req);
    if (!projectId) return ApiError.badRequest(reply, '缺少 project_id');
    return sendSuccess(reply, await svc.listEnums(projectId));
  });

  app.post('/', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    if (!body.project_id || !body.type_key || !body.name) return ApiError.badRequest(reply, '缺少必填字段');
    return sendSuccess(reply, await svc.createEnum(body, uid(req)), '创建成功', 201);
  });

  app.put('/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    return sendSuccess(reply, await svc.updateEnum(Number(id), req.body as any), '更新成功');
  });

  app.delete('/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await svc.deleteEnum(Number(id));
    return sendSuccess(reply, null, '删除成功');
  });
}
