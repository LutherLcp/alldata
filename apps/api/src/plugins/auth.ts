import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '@/config';

export async function authPlugin(app: FastifyInstance) {
  app.decorateRequest('user', null);
  app.decorateRequest('tenantId', null);

  app.addHook('preHandler', async (request: FastifyRequest) => {
    const token = request.cookies?.token || request.headers.authorization?.replace('Bearer ', '');
    if (!token) return;

    try {
      const decoded = await request.jwtVerify<{ userId: string; tenantId: string; role: string }>(token);
      request.user = decoded;
      request.tenantId = decoded.tenantId;
    } catch {
      // Token invalid, will be handled by route guards
    }
  });
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    return reply.code(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '未授权，请登录', statusCode: 401 },
    });
  }
}

export async function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    if (reply.sent) return;
    if (!roles.includes(request.user!.role)) {
      return reply.code(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: '权限不足', statusCode: 403 },
      });
    }
  };
}

export async function requireTenant(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);
  if (reply.sent) return;
  if (!request.tenantId) {
    return reply.code(403).send({
      success: false,
      error: { code: 'NO_TENANT', message: '未关联租户', statusCode: 403 },
    });
  }
}