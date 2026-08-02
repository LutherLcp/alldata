/**
 * 数据血缘图谱与 GDPR 隐私安全 Fastify 路由
 */
import { FastifyInstance } from 'fastify';
import { requireAuth } from '@/middleware/auth';
import { sendSuccess, ApiError } from '@/common/utils/response';
import { getProjectDataLineage, executeGDPRForget } from './service';

export async function securityRoutes(app: FastifyInstance) {
  // 获取数据血缘拓扑结构
  app.get('/lineage', { preHandler: requireAuth }, async (req, reply) => {
    const pid = req.headers['project-id'];
    const projectId = pid ? Number(pid) : 1;
    const lineage = await getProjectDataLineage(projectId);
    return sendSuccess(reply, lineage);
  });

  // 执行 GDPR 一键遗忘物理擦除
  app.post('/gdpr/forget', { preHandler: requireAuth }, async (req, reply) => {
    const pid = req.headers['project-id'];
    const projectId = pid ? Number(pid) : 1;
    const { distinct_id } = req.body as { distinct_id: string };

    if (!distinct_id) {
      return ApiError.badRequest(reply, 'distinct_id 不能为空');
    }

    const res = await executeGDPRForget(distinct_id, projectId);
    return sendSuccess(reply, res, 'GDPR 用户数据已成功物理擦除');
  });
}
