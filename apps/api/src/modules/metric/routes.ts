/**
 * 指标管理路由
 *
 * 按 ID 的读写在服务层带 project_id 过滤，跨项目访问统一返回 404。
 */
import { requireProjectAccess } from '@/common/middleware/projectAccess';
import { ApiError, sendSuccess } from '@/common/utils/response';
import { requireAuth } from '@/plugins/auth';
import type { FastifyInstance } from 'fastify';
import { MetricService } from './service';

export async function metricRoutes(app: FastifyInstance) {
  const svc = new MetricService(app);
  const uid = (r: any) => Number(r.user.userId);

  app.get('/', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const projectId = req.projectId as number;
    return sendSuccess(reply, await svc.listMetrics(projectId));
  });

  app.get('/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const m = await svc.getMetric(Number(id), req.projectId as number);
    if (!m) return ApiError.notFound(reply, '指标不存在');
    return sendSuccess(reply, m);
  });

  app.post('/', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    if (!body.project_id || !body.name) return ApiError.badRequest(reply, '缺少必填字段');
    return sendSuccess(reply, await svc.createMetric(body, uid(req)), '创建成功', 201);
  });

  app.put('/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const m = await svc.updateMetric(Number(id), req.projectId as number, req.body as any);
    if (!m) return ApiError.notFound(reply, '指标不存在');
    return sendSuccess(reply, m, '更新成功');
  });

  app.delete('/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const removed = await svc.deleteMetric(Number(id), req.projectId as number);
    if (!removed) return ApiError.notFound(reply, '指标不存在');
    return sendSuccess(reply, null, '删除成功');
  });

  // ─── Semantic Query & Presets ──────────────
  app.post('/query', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const projectId = req.projectId as number;
    const body = req.body as any;
    if (!body || !Array.isArray(body.metric_ids) || body.metric_ids.length === 0) {
      return ApiError.badRequest(reply, '缺少 metric_ids 数组');
    }
    if (!body.time_range || !body.time_range.start || !body.time_range.end) {
      return ApiError.badRequest(reply, '缺少有效的 time_range');
    }

    try {
      const result = await svc.executeSemanticQuery(projectId, {
        project_id: projectId,
        metric_ids: body.metric_ids.map(Number),
        dimensions: body.dimensions,
        time_range: body.time_range,
        filters: body.filters,
        limit: body.limit,
      });
      return sendSuccess(reply, result);
    } catch (err: any) {
      return ApiError.badRequest(reply, err.message);
    }
  });

  app.post(
    '/seed-presets',
    { preHandler: [requireAuth, requireProjectAccess()] },
    async (req, reply) => {
      const projectId = req.projectId as number;
      const list = await svc.seedPresetMetrics(projectId, uid(req));
      return sendSuccess(reply, list, '预置指标初始化成功');
    },
  );
}
