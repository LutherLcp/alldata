/**
 * 项目管理模块 — 路由定义
 */
import { FastifyInstance } from 'fastify';
import { projectCreateSchema, projectUpdateSchema } from '@alldata/shared/schemas/index.js';
import { requireAuth } from '@/plugins/auth';
import { sendSuccess, sendPaginated, ApiError } from '@/common/utils/response';
import { ProjectService } from './service';

export async function projectRoutes(app: FastifyInstance) {
  const projectService = new ProjectService(app);

  // 项目列表（分页）
  app.get('/', { preHandler: requireAuth }, async (request, reply) => {
    const userId = Number((request.user as { userId: string }).userId);
    const { page = '1', page_size = '20', keyword } = request.query as Record<string, string>;
    const result = await projectService.list(userId, {
      page: Number(page),
      pageSize: Number(page_size),
      keyword,
    });
    return sendPaginated(reply, result.list, result.total, result.page, result.pageSize);
  });

  // 项目详情
  app.get('/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = await projectService.getById(Number(id));
    if (!project) return ApiError.notFound(reply, '项目不存在');
    return sendSuccess(reply, project);
  });

  // 创建项目
  app.post('/', { preHandler: requireAuth }, async (request, reply) => {
    const body = projectCreateSchema.parse(request.body);
    const userId = Number((request.user as { userId: string }).userId);
    const project = await projectService.create(body, userId);
    return sendSuccess(reply, project, '创建成功', 201);
  });

  // 更新项目
  app.put('/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = projectUpdateSchema.parse(request.body);
    const project = await projectService.update({ ...body, id: Number(id) });
    if (!project) return ApiError.notFound(reply, '项目不存在');
    return sendSuccess(reply, project, '更新成功');
  });

  // 删除项目（软删除 - 归档）
  app.delete('/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await projectService.archive(Number(id));
    return sendSuccess(reply, null, '归档成功');
  });

  // 切换项目状态
  app.patch('/status', { preHandler: requireAuth }, async (request, reply) => {
    const { id, status } = request.body as { id: number; status: number };
    await projectService.updateStatus(id, status);
    return sendSuccess(reply, null, '状态更新成功');
  });
}
