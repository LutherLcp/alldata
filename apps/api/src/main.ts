import 'dotenv/config';

// Global BigInt JSON serialization fix
(BigInt.prototype as any).toJSON = function () { return Number(this); };
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyJwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import { PrismaClient } from '@prisma/client';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { registerRoutes } from '@/routes';
import { errorHandler } from '@/middleware/errorHandler';
import { requireAuth } from '@/plugins/auth';
import { getRedisClient, closeRedis } from '@/common/utils/redis';
import { ensureBucket } from '@/common/utils/minio';
import { requestContext } from '@/common/middleware/requestContext';

const prisma = new PrismaClient({
  log: config.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

const app = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
    },
  },
  ajv: { customOptions: { removeAdditional: 'all', coerceTypes: 'array' } },
});

// 基础插件
await app.register(cors, { origin: config.CORS_ORIGIN, credentials: true });
await app.register(helmet, { contentSecurityPolicy: false });
await app.register(fastifyRateLimit, { max: 200, timeWindow: '1 minute' });
await app.register(cookie, { secret: config.COOKIE_SECRET });
await app.register(multipart, { limits: { fileSize: 100 * 1024 * 1024 } });
await app.register(fastifyJwt, { secret: config.JWT_SECRET, cookie: { cookieName: 'token', signed: false } });

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
getRedisClient();

// 初始化 MinIO bucket
ensureBucket().catch((err) => {
  logger.warn({ err: (err as Error).message }, 'MinIO bucket init skipped');
});

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
await app.register(fastifySwaggerUi, { routePrefix: '/docs', uiConfig: { docExpansion: 'list' } });

// 错误处理
app.setErrorHandler(errorHandler);

// Prisma 装饰器
app.decorate('prisma', prisma);

// 注册路由
await registerRoutes(app);

const start = async () => {
  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    logger.info(`Server running at http://${config.HOST}:${config.PORT}`);
    logger.info(`API Docs: http://${config.HOST}:${config.PORT}/docs`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

const shutdown = async () => {
  logger.info('Shutting down...');
  await app.close();
  await prisma.$disconnect();
  await closeRedis();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
