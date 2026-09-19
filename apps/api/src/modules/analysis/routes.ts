import { requireProjectAccess } from '@/common/middleware/projectAccess';
import { ApiError, sendSuccess } from '@/common/utils/response';
import { requireAuth } from '@/plugins/auth';
/**
 * 分析引擎路由
 *
 * project_id 一律取自经过成员校验的 request.projectId（requireProjectAccess），
 * 不接受请求体中的 project_id，避免越权查询其他项目数据。
 */
import type { FastifyInstance } from 'fastify';
import { type AnalysisQuery, AnalysisService } from './service';

export async function analysisRoutes(app: FastifyInstance) {
  const svc = new AnalysisService();

  // 执行分析查询（支持 6 种类型）
  app.post('/query', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const body = req.body as AnalysisQuery;
    if (!body?.time_range?.start || !body?.time_range?.end) {
      return ApiError.badRequest(reply, '缺少必填参数：time_range.start, time_range.end');
    }

    const type = body.type || 'event';
    // 仅事件/分布分析强制要求 event_name
    if ((type === 'event' || type === 'distribution') && !body.event_name) {
      return ApiError.badRequest(reply, `${type} 分析缺少必填参数：event_name`);
    }

    // 以校验过的项目上下文为准，覆盖请求体中的值
    const result = await svc.runAnalysis({ ...body, project_id: req.projectId as number });
    return sendSuccess(reply, result);
  });

  // 取消查询
  app.post('/query/cancel', { preHandler: requireAuth }, async (req, reply) => {
    const { query_id } = req.body as { query_id?: string };
    if (!query_id) return ApiError.badRequest(reply, '缺少 query_id');
    const result = await svc.cancelQuery(query_id);
    return sendSuccess(reply, result);
  });
}
