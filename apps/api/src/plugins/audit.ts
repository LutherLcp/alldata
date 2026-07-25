/**
 * 操作审计日志中间件
 * 记录所有 CUD 操作的审计信息
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export interface AuditLog {
  id?: number;
  user_id: number;
  project_id?: number;
  action: string; // CREATE | UPDATE | DELETE | LOGIN | EXPORT
  resource: string; // e.g. 'dashboard', 'analysis', 'warning'
  resource_id?: number;
  detail?: any;
  ip?: string;
  user_agent?: string;
  created_at?: Date;
}

/**
 * 记录审计日志
 */
export async function logAudit(
  app: FastifyInstance,
  log: AuditLog
) {
  try {
    await app.prisma.auditLog.create({
      data: {
        user_id: log.user_id,
        project_id: log.project_id || 0,
        action: log.action,
        resource: log.resource,
        resource_id: log.resource_id || 0,
        detail: log.detail || {},
        ip: log.ip || '',
        user_agent: log.user_agent || '',
      },
    });
  } catch (e) {
    // 审计日志写入失败不影响主流程
    app.log.warn(`Audit log write failed: ${e}`);
  }
}

/**
 * 审计日志 Fastify 插件 — 自动记录写操作
 */
export async function auditPlugin(app: FastifyInstance) {
  // 在响应完成后记录审计日志
  app.addHook('onResponse', async (req: FastifyRequest, reply: FastifyReply) => {
    // 只记录写操作 (POST/PUT/DELETE)
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) return;
    // 跳过登录接口
    if (req.url.includes('/auth/login')) return;

    const user = (req as any).user;
    if (!user) return;

    const action = req.method === 'POST' ? 'CREATE' : req.method === 'DELETE' ? 'DELETE' : 'UPDATE';
    const resource = req.url.split('/').filter(Boolean)[1] || 'unknown';

    await logAudit(app, {
      user_id: Number(user.userId),
      project_id: Number((req.headers as any)['project-id']) || 0,
      action,
      resource,
      ip: req.ip,
      user_agent: req.headers['user-agent'],
    });
  });
}
