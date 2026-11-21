import { requireProjectAccess } from '@/common/middleware/projectAccess';
import { ApiError, sendSuccess } from '@/common/utils/response';
import { requireAuth } from '@/plugins/auth';
import type { FastifyInstance } from 'fastify';
import { AttributionService } from './attribution.service';
import { type AnalysisQuery, AnalysisService } from './service';

export async function analysisRoutes(app: FastifyInstance) {
  const svc = new AnalysisService();
  const attributionSvc = new AttributionService(app);

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

  // 执行高级多触点归因分析 (MTA)
  app.post('/attribution', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const body = req.body as any;
    if (!body?.target_event) {
      return ApiError.badRequest(reply, '缺少必填参数：target_event (转化目标事件)');
    }
    if (!body?.time_range?.start || !body?.time_range?.end) {
      return ApiError.badRequest(reply, '缺少必填参数：time_range.start, time_range.end');
    }

    try {
      const result = await attributionSvc.computeAttribution(req.projectId as number, {
        ...body,
        project_id: req.projectId as number,
      });
      return sendSuccess(reply, result);
    } catch (err: any) {
      return ApiError.badRequest(reply, err.message);
    }
  });

  // 取消查询
  app.post('/query/cancel', { preHandler: requireAuth }, async (req, reply) => {
    const { query_id } = req.body as { query_id?: string };
    if (!query_id) return ApiError.badRequest(reply, '缺少 query_id');
    const result = await svc.cancelQuery(query_id);
    return sendSuccess(reply, result);
  });
}
