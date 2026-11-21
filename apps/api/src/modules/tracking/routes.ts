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

  // ─── Event Ingestion (公共事件采集端点) ───────
  app.post('/collect', async (req, reply) => {
    let body = req.body as any;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return ApiError.badRequest(reply, 'Invalid JSON body');
      }
    }

    if (!body || typeof body !== 'object') {
      return ApiError.badRequest(reply, 'Missing request body');
    }

    const projectIdRaw =
      body.project_id ??
      req.headers['x-project-id'] ??
      req.headers['project-id'] ??
      (req.query as any)?.project_id;

    const projectId = Number(projectIdRaw);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return ApiError.badRequest(reply, '缺少或非法的 project_id');
    }

    const rawEvents = Array.isArray(body.events) ? body.events : [body];
    if (rawEvents.length === 0 || !rawEvents[0].event_name) {
      return ApiError.badRequest(reply, '缺少事件数据或 event_name');
    }

    try {
      const result = await svc.ingestEvents(projectId, rawEvents, {
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string,
      });
      return sendSuccess(reply, result, 'Events ingested successfully');
    } catch (err: any) {
      if (err.message?.includes('not found')) {
        return ApiError.notFound(reply, err.message);
      }
      return ApiError.internal(reply, err.message);
    }
  });

  // ─── Identity Mapping (OneID 身份图谱) ───────
  app.get('/identity/resolve', async (req, reply) => {
    const query = req.query as any;
    const projectIdRaw =
      query?.project_id ?? req.headers['x-project-id'] ?? req.headers['project-id'];
    const distinctId = (query?.distinct_id || query?.anonymous_id) as string;

    const projectId = Number(projectIdRaw);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return ApiError.badRequest(reply, '缺少或非法的 project_id');
    }
    if (!distinctId) {
      return ApiError.badRequest(reply, '缺少 distinct_id 或 anonymous_id');
    }

    const result = await svc.resolveIdentity(projectId, distinctId);
    return sendSuccess(reply, result);
  });

  app.get('/identity/graph', async (req, reply) => {
    const query = req.query as any;
    const projectIdRaw =
      query?.project_id ?? req.headers['x-project-id'] ?? req.headers['project-id'];
    const identifier = (query?.user_id || query?.distinct_id || query?.anonymous_id) as string;

    const projectId = Number(projectIdRaw);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return ApiError.badRequest(reply, '缺少或非法的 project_id');
    }
    if (!identifier) {
      return ApiError.badRequest(reply, '缺少 identifier 或 user_id');
    }

    const result = await svc.getIdentityGraph(projectId, identifier);
    return sendSuccess(reply, result);
  });
}
