/**
 * 版本日历路由
 * GET    /api/calendar           — 列表
 * GET    /api/calendar/:id       — 详情
 * POST   /api/calendar           — 创建
 * PUT    /api/calendar/:id       — 更新
 * DELETE /api/calendar/:id       — 删除
 */
import { FastifyInstance } from 'fastify';
import { requireAuth } from '@/plugins/auth';
import { sendSuccess, ApiError } from '@/common/utils/response';
import { CalendarService } from './service';

export async function calendarRoutes(app: FastifyInstance) {
  const svc = new CalendarService(app);
  const uid = (r: any) => Number(r.user.userId);
  const pid = (r: any) => Number((r.headers as any)['project-id']) || Number((r.query as any).project_id);

  app.get('/', { preHandler: requireAuth }, async (req, reply) => {
    const projectId = pid(req);
    if (!projectId) return ApiError.badRequest(reply, '缺少 project_id');
    const q = req.query as any;
    const list = await svc.list(projectId, {
      startDate: q.start_date,
      endDate: q.end_date,
      type: q.type,
    });
    return sendSuccess(reply, list);
  });

  app.get('/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const item = await svc.get(Number(id));
    if (!item) return ApiError.notFound(reply, '版本日历不存在');
    return sendSuccess(reply, item);
  });

  app.post('/', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    if (!body.project_id || !body.title || !body.start_date || !body.type) {
      return ApiError.badRequest(reply, '缺少必填字段 (project_id, title, start_date, type)');
    }
    const item = await svc.create(body, uid(req));
    return sendSuccess(reply, item, '创建成功', 201);
  });

  app.put('/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const item = await svc.update(Number(id), req.body as any);
    return sendSuccess(reply, item, '更新成功');
  });

  app.delete('/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await svc.delete(Number(id));
    return sendSuccess(reply, null, '删除成功');
  });
}
