/**
 * 埋点管理路由
 */
import { FastifyInstance } from 'fastify';
import { requireAuth } from '@/plugins/auth';
import { sendSuccess, sendPaginated, ApiError } from '@/common/utils/response';
import { TrackingService } from './service';

export async function trackingRoutes(app: FastifyInstance) {
  const svc = new TrackingService(app);
  const uid = (r: any) => Number(r.user.userId);
  const pid = (r: any) => Number((r.headers as any)['project-id']) || Number((r.query as any).project_id);

  // ─── Story ────────────────────────────────
  app.get('/stories', { preHandler: requireAuth }, async (req, reply) => {
    const projectId = pid(req);
    if (!projectId) return ApiError.badRequest(reply, '缺少 project_id');
    const list = await svc.listStories(projectId);
    return sendSuccess(reply, list);
  });

  app.get('/stories/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const story = await svc.getStory(Number(id));
    if (!story) return ApiError.notFound(reply, '需求不存在');
    return sendSuccess(reply, story);
  });

  app.post('/stories', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    if (!body.project_id || !body.name) return ApiError.badRequest(reply, '缺少必填字段');
    const story = await svc.createStory(body, uid(req));
    return sendSuccess(reply, story, '创建成功', 201);
  });

  app.put('/stories/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const story = await svc.updateStory(Number(id), req.body as any);
    return sendSuccess(reply, story, '更新成功');
  });

  app.delete('/stories/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await svc.deleteStory(Number(id));
    return sendSuccess(reply, null, '删除成功');
  });

  // ─── Event ────────────────────────────────
  app.get('/events', { preHandler: requireAuth }, async (req, reply) => {
    const projectId = pid(req);
    if (!projectId) return ApiError.badRequest(reply, '缺少 project_id');
    const storyId = (req.query as any).story_id ? Number((req.query as any).story_id) : undefined;
    const list = await svc.listEvents(projectId, storyId);
    return sendSuccess(reply, list);
  });

  app.get('/events/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const event = await svc.getEvent(Number(id));
    if (!event) return ApiError.notFound(reply, '事件不存在');
    return sendSuccess(reply, event);
  });

  app.post('/events', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    if (!body.project_id || !body.name) return ApiError.badRequest(reply, '缺少必填字段');
    const event = await svc.createEvent(body);
    return sendSuccess(reply, event, '创建成功', 201);
  });

  app.put('/events/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const event = await svc.updateEvent(Number(id), req.body as any);
    return sendSuccess(reply, event, '更新成功');
  });

  app.delete('/events/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await svc.deleteEvent(Number(id));
    return sendSuccess(reply, null, '删除成功');
  });

  // ─── EventProperty ────────────────────────
  app.post('/events/:id/properties', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;
    const prop = await svc.createProperty({ ...body, event_id: Number(id) });
    return sendSuccess(reply, prop, '创建成功', 201);
  });

  app.put('/properties/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const prop = await svc.updateProperty(Number(id), req.body as any);
    return sendSuccess(reply, prop, '更新成功');
  });

  app.delete('/properties/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await svc.deleteProperty(Number(id));
    return sendSuccess(reply, null, '删除成功');
  });
}
