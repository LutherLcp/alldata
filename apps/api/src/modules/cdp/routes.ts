/**
 * CDP 路由注册模块
 */
import { FastifyInstance } from 'fastify';
import { CDPService } from './service';

export async function cdpRoutes(app: FastifyInstance) {
  const service = new CDPService(app);

  // 360° 用户全景画像
  app.get('/users/:user_id/profile', async (req, reply) => {
    const { user_id } = req.params as { user_id: string };
    const { project_id } = req.query as { project_id?: string };
    const pid = project_id ? Number(project_id) : 1;
    const profile = await service.getUser360Profile(pid, user_id);
    return { code: 200, message: 'success', data: profile };
  });

  // 客户旅程 桑基图与路径树
  app.get('/journey/path', async (req, reply) => {
    const { project_id, start, end } = req.query as { project_id?: string; start?: string; end?: string };
    const pid = project_id ? Number(project_id) : 1;
    const dateRange = {
      start: start || '2026-07-01',
      end: end || '2026-08-01',
    };
    const journey = await service.getCustomerJourneyPath(pid, dateRange);
    return { code: 200, message: 'success', data: journey };
  });

  // Cohort 人群分群列表
  app.get('/cohorts', async (req, reply) => {
    const { project_id } = req.query as { project_id?: string };
    const pid = project_id ? Number(project_id) : 1;
    const cohorts = await service.listCohorts(pid);
    return { code: 200, message: 'success', data: cohorts };
  });

  // 创建 Cohort 人群分群
  app.post('/cohorts', async (req, reply) => {
    const body = req.body as any;
    const pid = body.project_id ? Number(body.project_id) : 1;
    const userId = (req as any).user?.id || 1;
    const cohort = await service.createCohort(pid, body, userId);
    return { code: 200, message: '分群创建成功', data: cohort };
  });

  // 预估 Cohort 覆盖人数
  app.post('/cohorts/estimate', async (req, reply) => {
    const body = req.body as any;
    const pid = body.project_id ? Number(body.project_id) : 1;
    const rules = body.rules || [];
    const estimate = await service.estimateCohortSize(pid, rules);
    return { code: 200, message: 'success', data: estimate };
  });
}
