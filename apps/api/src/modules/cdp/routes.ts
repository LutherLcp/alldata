/**
 * CDP 路由注册模块 — 360画像 / 客户旅程桑基图 / 动态 Cohort 分群
 */
import { requireProjectAccess } from '@/common/middleware/projectAccess';
import { ApiError, sendSuccess } from '@/common/utils/response';
import type { FastifyInstance } from 'fastify';
import { CDPService } from './service';

export async function cdpRoutes(app: FastifyInstance) {
  const service = new CDPService(app);
  const uid = (r: any) => Number(r.user?.userId || r.user?.id || 1);

  // 360° 用户全景画像
  app.get('/users/:user_id/profile', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { user_id } = req.params as { user_id: string };
    const pid = req.projectId as number;
    const profile = await service.getUser360Profile(pid, user_id);
    return sendSuccess(reply, profile);
  });

  // 客户旅程 桑基图与路径流向
  app.get('/journey/path', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const pid = req.projectId as number;
    const { start, end } = req.query as { start?: string; end?: string };
    const dateRange = {
      start: start || '2026-07-01',
      end: end || '2026-08-01',
    };
    const journey = await service.getCustomerJourneyPath(pid, dateRange);
    return sendSuccess(reply, journey);
  });

  // Cohort 人群分群列表
  app.get('/cohorts', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const pid = req.projectId as number;
    const cohorts = await service.listCohorts(pid);
    return sendSuccess(reply, cohorts);
  });

  // 创建 Cohort 人群分群
  app.post('/cohorts', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const pid = req.projectId as number;
    const body = req.body as any;
    if (!body?.name) {
      return ApiError.badRequest(reply, '缺少人群名称 (name)');
    }
    const cohort = await service.createCohort(pid, body, uid(req));
    return sendSuccess(reply, cohort, '分群创建成功', 201);
  });

  // 预估 Cohort 覆盖人数
  app.post('/cohorts/estimate', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const pid = req.projectId as number;
    const body = req.body as any;
    const rules = body?.rules || [];
    const estimate = await service.estimateCohortSize(pid, rules);
    return sendSuccess(reply, estimate);
  });

  // 删除 Cohort 人群分群
  app.delete('/cohorts/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const pid = req.projectId as number;
    const { id } = req.params as { id: string };
    const deleted = await service.deleteCohort(Number(id), pid);
    if (!deleted) return ApiError.notFound(reply, '分群不存在');
    return sendSuccess(reply, null, '删除成功');
  });
}
