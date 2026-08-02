/**
 * A/B 实验 & Feature Flags 路由注册模块
 */
import { FastifyInstance } from 'fastify';
import { ABTestService } from './service';

export async function abtestRoutes(app: FastifyInstance) {
  const service = new ABTestService(app);

  app.get('/flags', async (req) => {
    const { project_id } = req.query as { project_id?: string };
    const pid = project_id ? Number(project_id) : 1;
    const flags = await service.listFlags(pid);
    return { code: 200, message: 'success', data: flags };
  });

  app.get('/experiments', async (req) => {
    const { project_id } = req.query as { project_id?: string };
    const pid = project_id ? Number(project_id) : 1;
    const experiments = await service.listExperiments(pid);
    return { code: 200, message: 'success', data: experiments };
  });

  app.post('/flags/evaluate', async (req) => {
    const { key, user_id } = req.body as { key: string; user_id: string };
    const result = await service.evaluateFlag(key, user_id || 'USR_99');
    return { code: 200, message: 'success', data: result };
  });
}
