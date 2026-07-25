/**
 * 用户查询路由
 * GET  /api/users          — 用户列表（分页 + 搜索）
 * GET  /api/users/:id      — 用户详情
 * GET  /api/users/:id/timeline — 用户行为时间线
 * PUT  /api/users/:id/status   — 更新用户状态
 */
import { FastifyInstance } from 'fastify';
import { requireAuth } from '@/plugins/auth';
import { sendSuccess, sendPaginated, ApiError } from '@/common/utils/response';
import { UserService } from './service';

export async function userRoutes(app: FastifyInstance) {
  const svc = new UserService(app);

  // 用户列表
  app.get('/', { preHandler: requireAuth }, async (req, reply) => {
    const q = req.query as any;
    const page = Number(q.page) || 1;
    const pageSize = Number(q.page_size) || 20;
    const { list, total } = await svc.listUsers({
      keyword: q.keyword,
      status: q.status ? Number(q.status) : undefined,
      page,
      pageSize,
    });
    return sendPaginated(reply, list, total, page, pageSize);
  });

  // 用户详情
  app.get('/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const user = await svc.getUser(Number(id));
    if (!user) return ApiError.notFound(reply, '用户不存在');
    return sendSuccess(reply, user);
  });

  // 用户行为时间线
  app.get('/:id/timeline', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const q = req.query as any;
    const projectId = Number(q.project_id) || Number((req.headers as any)['project-id']);
    if (!projectId) return ApiError.badRequest(reply, '缺少 project_id');
    const timeline = await svc.getUserTimeline(Number(id), projectId, {
      startDate: q.start_date,
      endDate: q.end_date,
      limit: q.limit ? Number(q.limit) : 50,
    });
    return sendSuccess(reply, timeline);
  });

  // 更新用户状态
  app.put('/:id/status', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status } = req.body as { status: number };
    if (status !== 1 && status !== 2) return ApiError.badRequest(reply, 'status 必须为 1 或 2');
    const user = await svc.updateStatus(Number(id), status);
    return sendSuccess(reply, user, '更新成功');
  });
}
