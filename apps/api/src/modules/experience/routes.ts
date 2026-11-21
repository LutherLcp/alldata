/**
 * AI Copilot 与 Session Replay 体验重放路由注册模块
 */
import { requireProjectAccess } from '@/common/middleware/projectAccess';
import { ApiError, sendSuccess } from '@/common/utils/response';
import type { FastifyInstance } from 'fastify';
import { ExperienceService } from './service';

export async function experienceRoutes(app: FastifyInstance) {
  const service = new ExperienceService(app);

  app.post('/copilot/ask', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const pid = req.projectId as number;
    const { prompt } = (req.body as { prompt?: string }) || {};
    if (!prompt) {
      return ApiError.badRequest(reply, '缺少提问内容 prompt');
    }
    const result = await service.askCopilot(pid, prompt);
    return sendSuccess(reply, result);
  });

  app.get('/sessions', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const pid = req.projectId as number;
    const { has_error, user_id } = req.query as { has_error?: string; user_id?: string };
    const filters: { has_error?: boolean; user_id?: string } = {};
    if (has_error !== undefined) {
      filters.has_error = has_error === 'true';
    }
    if (user_id) {
      filters.user_id = user_id;
    }
    const sessions = await service.listSessions(pid, filters);
    return sendSuccess(reply, sessions);
  });

  app.get('/sessions/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const pid = req.projectId as number;
    const { id } = req.params as { id: string };
    const session = await service.getSession(pid, id);
    if (!session) {
      return ApiError.notFound(reply, 'Session 会话记录不存在');
    }
    return sendSuccess(reply, session);
  });

  app.post('/sessions', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const pid = req.projectId as number;
    const body = (req.body as any) || {};
    const created = await service.ingestSession(pid, body);
    return sendSuccess(reply, created, 'Session 会话已保存', 201);
  });

  app.get('/heatmap', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const pid = req.projectId as number;
    const { page_url, device } = req.query as { page_url?: string; device?: string };
    const heatmap = await service.getHeatmapData(pid, page_url || '/home', device || 'desktop');
    return sendSuccess(reply, heatmap);
  });
}
