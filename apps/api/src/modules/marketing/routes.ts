/**
 * 营销 Flow 路由注册模块
 */
import { FastifyInstance } from 'fastify';
import { MarketingService } from './service';

export async function marketingRoutes(app: FastifyInstance) {
  const service = new MarketingService(app);

  app.get('/flows', async (req) => {
    const { project_id } = req.query as { project_id?: string };
    const pid = project_id ? Number(project_id) : 1;
    const flows = await service.listFlows(pid);
    return { code: 200, message: 'success', data: flows };
  });

  app.post('/flows', async (req) => {
    const body = req.body as any;
    const pid = body.project_id ? Number(body.project_id) : 1;
    const userId = (req as any).user?.id || 1;
    const flow = await service.createFlow(pid, body, userId);
    return { code: 200, message: 'Flow 创建成功', data: flow };
  });

  app.post('/flows/:id/test', async (req) => {
    const { id } = req.params as { id: string };
    const result = await service.triggerTestFlow(Number(id), 'USR_TEST_88');
    return { code: 200, message: 'Flow 测试触发成功', data: result };
  });
}
