/**
 * AI Copilot 与 Session Replay 体验重放路由注册模块
 */
import { FastifyInstance } from 'fastify';
import { ExperienceService } from './service';

export async function experienceRoutes(app: FastifyInstance) {
  const service = new ExperienceService(app);

  app.post('/copilot/ask', async (req) => {
    const { project_id, prompt } = req.body as { project_id?: number; prompt: string };
    const pid = project_id ? Number(project_id) : 1;
    const result = await service.askCopilot(pid, prompt || '分析近7天流量');
    return { code: 200, message: 'success', data: result };
  });

  app.get('/sessions', async (req) => {
    const { project_id } = req.query as { project_id?: string };
    const pid = project_id ? Number(project_id) : 1;
    const sessions = await service.listSessions(pid);
    return { code: 200, message: 'success', data: sessions };
  });

  app.get('/heatmap', async (req) => {
    const { project_id, page_url } = req.query as { project_id?: string; page_url?: string };
    const pid = project_id ? Number(project_id) : 1;
    const heatmap = await service.getHeatmapData(pid, page_url || '/home');
    return { code: 200, message: 'success', data: heatmap };
  });
}
