import 'dotenv/config';
import Fastify from 'fastify';
import { cors } from '@fastify/cors';
import { helmet } from '@fastify/helmet';
import { rateLimit } from '@fastify/rate-limit';
import { swagger } from '@fastify/swagger';
import { swaggerUi } from '@fastify/swagger-ui';
import { jwt } from '@fastify/jwt';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import { PrismaClient } from '@prisma/client';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { registerRoutes } from '@/routes';
import { errorHandler } from '@/middleware/errorHandler';
import { authPlugin } from '@/plugins/auth';

const prisma = new PrismaClient({
  log: config.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
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

await app.register(cors, { origin: config.corsOrigin, credentials: true });
await app.register(helmet, { contentSecurityPolicy: false });
await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
await app.register(cookie, { secret: config.cookieSecret });
await app.register(multipart, { limits: { fileSize: 100 * 1024 * 1024 } });
await app.register(jwt, { secret: config.jwtSecret, cookie: { cookieName: 'token', signed: false } });
await app.register(authPlugin);

await app.register(swagger, {
  openapi: {
    info: { title: '全域数据运营平台 API', version: '1.0.0', description: 'API 文档' },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'token' },
      },
    },
    security: [{ bearerAuth: [], cookieAuth: [] }],
  },
});
await app.register(swaggerUi, { routePrefix: '/docs', uiConfig: { docExpansion: 'list' } });

app.setErrorHandler(errorHandler);
app.decorate('prisma', prisma);

await registerRoutes(app);

const start = async () => {
  try {
    await app.listen({ port: config.port, host: config.host });
    logger.info(`Server running at http://${config.host}:${config.port}`);
    logger.info(`API Docs: http://${config.host}:${config.port}/docs`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

const shutdown = async () => {
  logger.info('Shutting down...');
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();