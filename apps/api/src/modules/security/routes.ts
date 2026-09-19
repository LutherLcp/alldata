import { requireProjectAccess } from '@/common/middleware/projectAccess';
import { ApiError, sendSuccess } from '@/common/utils/response';
/**
 * 数据血缘图谱与 GDPR 隐私安全 Fastify 路由
 *
 * project_id 一律取自经过成员校验的 request.projectId。
 * 此前该模块在缺失 project-id 头时回退到 project 1，导致任意登录用户
 * 可读取甚至物理擦除 project 1 的数据，已修正。
 */
import type { FastifyInstance } from 'fastify';
import { executeGDPRForget, getProjectDataLineage } from './service';

export async function securityRoutes(app: FastifyInstance) {
  // 获取数据血缘拓扑结构
  app.get('/lineage', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const lineage = await getProjectDataLineage(req.projectId as number);
    return sendSuccess(reply, lineage);
  });

  // 执行 GDPR 一键遗忘物理擦除
  app.post('/gdpr/forget', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { distinct_id } = req.body as { distinct_id: string };

    if (!distinct_id) {
      return ApiError.badRequest(reply, 'distinct_id 不能为空');
    }

    const res = await executeGDPRForget(distinct_id, req.projectId as number);
    return sendSuccess(reply, res, 'GDPR 用户数据已成功物理擦除');
  });
}
