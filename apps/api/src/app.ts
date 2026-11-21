import { requestContext } from '@/common/middleware/requestContext';
import { ensureBucket } from '@/common/utils/minio';
import { getRedisClient } from '@/common/utils/redis';
import { config } from '@/config';
import { errorHandler } from '@/middleware/errorHandler';
import { auditPlugin } from '@/plugins/audit';
import { registerRoutes } from '@/routes';
import { logger } from '@/utils/logger';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import fastifyJwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { PrismaClient } from '@prisma/client';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';

// Global BigInt JSON serialization fix
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

export interface BuildAppOptions {
  prisma?: PrismaClient;
  fastifyOptions?: FastifyServerOptions;
  skipMinioInit?: boolean;
  skipRedisInit?: boolean;
  skipAudit?: boolean;
  skipRateLimit?: boolean;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const prisma =
    options.prisma ??
    new PrismaClient({
      log: config.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

  const defaultLogger = {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
    },
  };

  const app = Fastify({
    logger:
      options.fastifyOptions?.logger !== undefined ? options.fastifyOptions.logger : defaultLogger,
    ajv: { customOptions: { removeAdditional: 'all', coerceTypes: 'array' } },
    ...options.fastifyOptions,
  });

  // 审计日志插件
  if (!options.skipAudit) {
    await app.register(auditPlugin);
  }

  // 基础插件：CORS 白名单（config.CORS_ORIGINS，逗号分隔）
  await app.register(cors, {
    origin: (origin, cb) => {
      // 无 Origin 的请求（同源、curl、服务端调用）放行
      if (!origin) return cb(null, true);
      if (config.CORS_ORIGINS.includes(origin)) return cb(null, true);
      cb(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: true,
  });

  await app.register(helmet, { contentSecurityPolicy: false });

  if (!options.skipRateLimit) {
    await app.register(fastifyRateLimit, { max: 200, timeWindow: '1 minute' });
  }

  await app.register(cookie, { secret: config.COOKIE_SECRET });
  await app.register(multipart, { limits: { fileSize: 100 * 1024 * 1024 } });
  await app.register(fastifyJwt, {
    secret: config.JWT_SECRET,
    cookie: { cookieName: 'token', signed: false },
  });

  // 认证：注册全局 preHandler hook 解析 JWT
  if (!app.hasRequestDecorator('tenantId')) {
    app.decorateRequest('tenantId', null);
  }

  app.addHook('preHandler', async (request) => {
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

  // 请求上下文中间件
  await app.register(requestContext);

  // 初始化 Redis
  if (!options.skipRedisInit) {
    getRedisClient();
  }

  // 初始化 MinIO bucket
  if (!options.skipMinioInit) {
    ensureBucket().catch((err) => {
      logger.warn({ err: (err as Error).message }, 'MinIO bucket init skipped');
    });
  }

  // Swagger 文档
  await app.register(fastifySwagger, {
    openapi: {
      info: { title: 'AllData API', version: '1.0.0', description: '全域数据运营平台 API 文档' },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          cookieAuth: { type: 'apiKey', in: 'cookie', name: 'token' },
        },
      },
      security: [{ bearerAuth: [] }, { cookieAuth: [] }],
    },
  });
  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list' },
  });

  // 错误处理
  app.setErrorHandler(errorHandler);

  // Prisma 装饰器
  app.decorate('prisma', prisma);

  // 注册路由
  await registerRoutes(app);

  return app;
}
