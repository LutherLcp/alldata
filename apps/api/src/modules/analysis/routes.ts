/**
 * 分析引擎路由
 */
import { FastifyInstance } from 'fastify';
import { requireAuth } from '@/plugins/auth';
import { sendSuccess, ApiError } from '@/common/utils/response';
import { AnalysisService, AnalysisQuery } from './service';

export async function analysisRoutes(app: FastifyInstance) {
  const svc = new AnalysisService(app);

  // 执行事件分析查询
  app.post('/query', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as AnalysisQuery;
    if (!body.event_name || !body.time_range?.start || !body.time_range?.end) {
      return ApiError.badRequest(reply, '缺少必填参数：event_name, time_range.start, time_range.end');
    }
    const result = await svc.runEventAnalysis(body);
    return sendSuccess(reply, result);
  });

  // 取消查询
  app.post('/query/cancel', { preHandler: requireAuth }, async (req, reply) => {
    const { query_id } = req.body as any;
    if (!query_id) return ApiError.badRequest(reply, '缺少 query_id');
    const result = await svc.cancelQuery(query_id);
    return sendSuccess(reply, result);
  });
}
