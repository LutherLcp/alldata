/**
 * 站内信路由
 */
import { FastifyInstance } from 'fastify';
import { requireAuth } from '@/plugins/auth';
import { sendSuccess, sendPaginated, ApiError } from '@/common/utils/response';
import { NoticeService } from './service';

export async function noticeRoutes(app: FastifyInstance) {
  const svc = new NoticeService(app);
  const uid = (r: any) => Number(r.user.userId);
  const pid = (r: any) => Number((r.headers as any)['project-id']) || Number((r.query as any).project_id);

  // 通知列表
  app.get('/', { preHandler: requireAuth }, async (req, reply) => {
    const projectId = pid(req);
    if (!projectId) return ApiError.badRequest(reply, '缺少 project_id');
    const q = req.query as any;
    const page = Number(q.page) || 1;
    const pageSize = Number(q.page_size) || 20;
    const type = q.type || undefined;
    const result = await svc.listNotices(projectId, uid(req), page, pageSize, type);
    return sendPaginated(reply, result.list, result.total, result.page, result.pageSize);
  });

  // 未读计数
  app.get('/unread-count', { preHandler: requireAuth }, async (req, reply) => {
    const projectId = pid(req);
    if (!projectId) return ApiError.badRequest(reply, '缺少 project_id');
    const result = await svc.getUnreadCount(projectId, uid(req));
    return sendSuccess(reply, result);
  });

  // 标记单条已读
  app.post('/:id/read', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await svc.markRead(Number(id), uid(req));
    return sendSuccess(reply, null, '已标记');
  });

  // 标记全部已读
  app.post('/mark-all-read', { preHandler: requireAuth }, async (req, reply) => {
    const projectId = pid(req);
    if (!projectId) return ApiError.badRequest(reply, '缺少 project_id');
    const result = await svc.markAllRead(projectId, uid(req));
    return sendSuccess(reply, result, '全部已读');
  });

  // 创建通知
  app.post('/', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    if (!body.project_id || !body.title || !body.content) {
      return ApiError.badRequest(reply, '缺少必填字段');
    }
    const notice = await svc.createNotice(body, uid(req));
    return sendSuccess(reply, notice, '创建成功', 201);
  });
}
