/**
 * MTA 全渠道多触点归因 Fastify 路由
 */
import { FastifyInstance } from 'fastify';
import { requireAuth } from '@/plugins/auth';
import { sendSuccess, ApiError } from '@/common/utils/response';
import { mtaEvaluateQuerySchema, AttributionModelType } from '@alldata/shared';
import { getAttributionAnalysis } from './service';

export async function mtaRoutes(app: FastifyInstance) {
  // 获取全渠道多触点归因分析与 MMM 预算分配
  app.get('/evaluate', { preHandler: requireAuth }, async (req, reply) => {
    const pid = req.headers['project-id'];
    const projectId = pid ? Number(pid) : 1;
    const { model } = req.query as { model?: AttributionModelType };

    const data = await getAttributionAnalysis(projectId, model || 'last_touch');
    return sendSuccess(reply, data);
  });
}
