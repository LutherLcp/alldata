import { requireProjectAccess } from '@/common/middleware/projectAccess';
import { ApiError, sendSuccess } from '@/common/utils/response';
/**
 * 数据血缘拓扑、GDPR 隐私遗忘物理擦除与企业级脱敏审计 Fastify 路由
 *
 * 全量端点受 requireProjectAccess() 多租户守卫保护，彻底根治跨租户越权 (IDOR)。
 */
import type { FastifyInstance } from 'fastify';
import { SecurityService } from './service';

export async function securityRoutes(app: FastifyInstance) {
  const svc = new SecurityService(app);
  const uid = (r: any) => Number(r.user?.userId || 1);

  // 获取真实数据血缘拓扑结构
  app.get('/lineage', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const lineage = await svc.getProjectDataLineage(req.projectId as number);
    return sendSuccess(reply, lineage);
  });

  // 执行 GDPR 一键遗忘物理擦除 (Right to be Forgotten)
  app.post('/gdpr/forget', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { distinct_id } = (req.body as { distinct_id: string }) || {};

    if (!distinct_id || !distinct_id.trim()) {
      return ApiError.badRequest(reply, 'distinct_id 不能为空');
    }

    const ip = req.ip || '';
    const userAgent = req.headers['user-agent'] || '';

    const res = await svc.executeGDPRForget(
      distinct_id.trim(),
      req.projectId as number,
      uid(req),
      ip,
      userAgent,
    );

    return sendSuccess(reply, res, 'GDPR 用户数据已成功物理擦除并存证');
  });

  // 获取项目的 GDPR 合规擦除历史审计档案
  app.get('/gdpr/history', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const history = await svc.getGDPRHistory(req.projectId as number);
    return sendSuccess(reply, history);
  });

  // 敏感字段动态脱敏预检工具
  app.post('/masking/preview', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { payload, rules } = (req.body as any) || {};
    if (!payload || typeof payload !== 'object') {
      return ApiError.badRequest(reply, '缺少待脱敏的 payload 对象');
    }
    const preview = svc.previewMasking(payload, rules || {});
    return sendSuccess(reply, preview, '脱敏规则预检完成');
  });
}
