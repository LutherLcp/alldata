import { requireProjectAccess } from '@/common/middleware/projectAccess';
import { sendSuccess } from '@/common/utils/response';
import type { AttributionModelType } from '@alldata/shared';
/**
 * MTA 全渠道多触点归因 Fastify 路由
 *
 * 此前缺失 project-id 头时回退到 project 1，会让任意登录用户读到 project 1 的归因数据，已修正。
 */
import type { FastifyInstance } from 'fastify';
import { getAttributionAnalysis } from './service';

export async function mtaRoutes(app: FastifyInstance) {
  // 获取全渠道多触点归因分析与 MMM 预算分配
  app.get('/evaluate', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { model } = req.query as { model?: AttributionModelType };

    const data = await getAttributionAnalysis(req.projectId as number, model || 'last_touch');
    return sendSuccess(reply, data);
  });
}
