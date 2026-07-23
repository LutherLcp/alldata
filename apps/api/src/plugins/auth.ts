import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function authPlugin(app: FastifyInstance) {
  if (!app.hasRequestDecorator('user')) {
    app.decorateRequest('user', null);
  }
  if (!app.hasRequestDecorator('tenantId')) {
    app.decorateRequest('tenantId', null);
  }

  app.addHook('preHandler', async (request: FastifyRequest) => {
    // 从 Authorization header 或 cookie 提取 token
    const authHeader = request.headers.authorization;
    let token: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (request.cookies?.token) {
      token = request.cookies.token;
    }

    if (!token) return;

    try {
      const decoded = app.jwt.verify<{ userId: string; tenantId: string; role: string }>(token);
      (request as any).user = decoded;
      (request as any).tenantId = decoded.tenantId;
    } catch {
      // Token invalid
    }
  });
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  if (!(request as any).user) {
    return reply.code(401).send({
      code: 401,
      message: '未授权，请登录',
      data: null,
    });
  }
}

export async function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    if (reply.sent) return;
    if (!roles.includes((request as any).user!.role)) {
      return reply.code(403).send({
        code: 403,
        message: '权限不足',
        data: null,
      });
    }
  };
}

export async function requireTenant(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);
  if (reply.sent) return;
  if (!(request as any).tenantId) {
    return reply.code(403).send({
      code: 403,
      message: '未关联租户',
      data: null,
    });
  }
}
