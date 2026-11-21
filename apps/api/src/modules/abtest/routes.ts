/**
 * A/B 实验 & Feature Flags 路由注册模块
 */
import { requireProjectAccess } from '@/common/middleware/projectAccess';
import { ApiError, sendSuccess } from '@/common/utils/response';
import type { FastifyInstance } from 'fastify';
import { ABTestService } from './service';

export async function abtestRoutes(app: FastifyInstance) {
  const service = new ABTestService(app);
  const uid = (r: any) => Number(r.user?.userId || r.user?.id || 1);

  // ─── Feature Flags ─────────────────────────────────

  app.get('/flags', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const pid = req.projectId as number;
    const flags = await service.listFlags(pid);
    return sendSuccess(reply, flags);
  });

  app.post('/flags', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const pid = req.projectId as number;
    const body = req.body as any;
    if (!body?.key || !body?.name) {
      return ApiError.badRequest(reply, '缺少必填字段 (key 或 name)');
    }
    try {
      const flag = await service.createFlag(pid, body, uid(req));
      return sendSuccess(reply, flag, '灰度开关创建成功', 201);
    } catch (err) {
      return ApiError.badRequest(reply, (err as Error).message);
    }
  });

  app.put('/flags/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const pid = req.projectId as number;
    const { id } = req.params as { id: string };
    const updated = await service.updateFlag(Number(id), pid, req.body as any);
    if (!updated) return ApiError.notFound(reply, 'Feature Flag 不存在');
    return sendSuccess(reply, updated, '更新成功');
  });

  app.post('/flags/evaluate', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const pid = req.projectId as number;
    const { key, user_id } = req.body as { key: string; user_id: string };
    if (!key || !user_id) {
      return ApiError.badRequest(reply, '缺少 key 或 user_id');
    }
    const result = await service.evaluateFlag(pid, key, user_id);
    return sendSuccess(reply, result);
  });

  // ─── A/B Experiments ───────────────────────────────

  app.get('/experiments', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const pid = req.projectId as number;
    const experiments = await service.listExperiments(pid);
    return sendSuccess(reply, experiments);
  });

  app.post('/experiments', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const pid = req.projectId as number;
    const body = req.body as any;
    if (!body?.key || !body?.name || !body?.target_metric) {
      return ApiError.badRequest(reply, '缺少必填字段 (key, name 或 target_metric)');
    }
    try {
      const exp = await service.createExperiment(pid, body, uid(req));
      return sendSuccess(reply, exp, 'A/B 实验创建成功', 201);
    } catch (err) {
      return ApiError.badRequest(reply, (err as Error).message);
    }
  });

  app.get('/experiments/:id/report', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const pid = req.projectId as number;
    const { id } = req.params as { id: string };
    const report = await service.getExperimentReport(Number(id), pid);
    if (!report) return ApiError.notFound(reply, '实验不存在');
    return sendSuccess(reply, report);
  });
}
