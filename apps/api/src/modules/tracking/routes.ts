/**
 * 埋点管理路由
 *
 * 按 ID 的读写在服务层带 project_id 过滤（子资源通过父实体关联校验），
 * 跨项目访问统一返回 404。
 */
import { requireProjectAccess } from '@/common/middleware/projectAccess';
import { ApiError, sendSuccess } from '@/common/utils/response';
import { requireAuth } from '@/plugins/auth';
import type { FastifyInstance } from 'fastify';
import { TrackingService } from './service';

export async function trackingRoutes(app: FastifyInstance) {
  const svc = new TrackingService(app);
  const uid = (r: any) => Number(r.user.userId);

  // ─── Story ────────────────────────────────
  app.get('/stories', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const projectId = req.projectId as number;
    const list = await svc.listStories(projectId);
    return sendSuccess(reply, list);
  });

  app.get('/stories/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const story = await svc.getStory(Number(id), req.projectId as number);
    if (!story) return ApiError.notFound(reply, '需求不存在');
    return sendSuccess(reply, story);
  });

  app.post('/stories', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    if (!body.project_id || !body.name) return ApiError.badRequest(reply, '缺少必填字段');
    const story = await svc.createStory(body, uid(req));
    return sendSuccess(reply, story, '创建成功', 201);
  });

  app.put('/stories/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const story = await svc.updateStory(Number(id), req.projectId as number, req.body as any);
    if (!story) return ApiError.notFound(reply, '需求不存在');
    return sendSuccess(reply, story, '更新成功');
  });

  app.delete('/stories/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const removed = await svc.deleteStory(Number(id), req.projectId as number);
    if (!removed) return ApiError.notFound(reply, '需求不存在');
    return sendSuccess(reply, null, '删除成功');
  });

  // ─── Event ────────────────────────────────
  app.get('/events', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const projectId = req.projectId as number;
    const storyId = (req.query as any).story_id ? Number((req.query as any).story_id) : undefined;
    const list = await svc.listEvents(projectId, storyId);
    return sendSuccess(reply, list);
  });

  app.get('/events/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const event = await svc.getEvent(Number(id), req.projectId as number);
    if (!event) return ApiError.notFound(reply, '事件不存在');
    return sendSuccess(reply, event);
  });

  app.post('/events', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    if (!body.project_id || !body.name) return ApiError.badRequest(reply, '缺少必填字段');
    const event = await svc.createEvent(body);
    return sendSuccess(reply, event, '创建成功', 201);
  });

  app.put('/events/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const event = await svc.updateEvent(Number(id), req.projectId as number, req.body as any);
    if (!event) return ApiError.notFound(reply, '事件不存在');
    return sendSuccess(reply, event, '更新成功');
  });

  app.delete('/events/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const removed = await svc.deleteEvent(Number(id), req.projectId as number);
    if (!removed) return ApiError.notFound(reply, '事件不存在');
    return sendSuccess(reply, null, '删除成功');
  });

  // ─── EventProperty ────────────────────────
  app.post('/events/:id/properties', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;
    const prop = await svc.createProperty(
      { ...body, event_id: Number(id) },
      req.projectId as number,
    );
    if (!prop) return ApiError.notFound(reply, '事件不存在');
    return sendSuccess(reply, prop, '创建成功', 201);
  });

  app.put('/properties/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const prop = await svc.updateProperty(Number(id), req.projectId as number, req.body as any);
    if (!prop) return ApiError.notFound(reply, '属性不存在');
    return sendSuccess(reply, prop, '更新成功');
  });

  app.delete('/properties/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const removed = await svc.deleteProperty(Number(id), req.projectId as number);
    if (!removed) return ApiError.notFound(reply, '属性不存在');
    return sendSuccess(reply, null, '删除成功');
  });
}
