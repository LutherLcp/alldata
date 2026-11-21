/**
 * 版本日历路由注册模块
 */
import { requireProjectAccess } from '@/common/middleware/projectAccess';
import { ApiError, sendSuccess } from '@/common/utils/response';
import type { FastifyInstance } from 'fastify';
import { CalendarService } from './service';

export async function calendarRoutes(app: FastifyInstance) {
  const svc = new CalendarService(app);
  const uid = (r: any) => Number(r.user?.userId || r.user?.id || 1);

  app.get('/', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const projectId = req.projectId as number;
    const q = req.query as any;
    const list = await svc.list(projectId, {
      startDate: q.start_date,
      endDate: q.end_date,
      type: q.type,
    });
    return sendSuccess(reply, list);
  });

  app.get('/summary', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const projectId = req.projectId as number;
    const summary = await svc.getRoadmapSummary(projectId);
    return sendSuccess(reply, summary);
  });

  app.get('/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const projectId = req.projectId as number;
    const { id } = req.params as { id: string };
    const item = await svc.get(Number(id), projectId);
    if (!item) return ApiError.notFound(reply, '版本日历记录不存在或无权访问');
    return sendSuccess(reply, item);
  });

  app.post('/', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const projectId = req.projectId as number;
    const body = (req.body as any) || {};
    if (!body.title || !body.start_date || !body.type) {
      return ApiError.badRequest(reply, '缺少必填字段 (title, start_date, type)');
    }
    const item = await svc.create(
      {
        project_id: projectId,
        title: body.title,
        description: body.description,
        start_date: body.start_date,
        end_date: body.end_date,
        type: body.type,
        status: body.status,
      },
      uid(req),
    );
    return sendSuccess(reply, item, '创建成功', 201);
  });

  app.put('/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const projectId = req.projectId as number;
    const { id } = req.params as { id: string };
    const item = await svc.update(Number(id), projectId, (req.body as any) || {});
    if (!item) return ApiError.notFound(reply, '版本日历记录不存在或无权访问');
    return sendSuccess(reply, item, '更新成功');
  });

  app.delete('/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const projectId = req.projectId as number;
    const { id } = req.params as { id: string };
    const ok = await svc.delete(Number(id), projectId);
    if (!ok) return ApiError.notFound(reply, '版本日历记录不存在或无权访问');
    return sendSuccess(reply, { deleted: true }, '删除成功');
  });
}
