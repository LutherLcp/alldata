/**
 * Fastify 类型扩展
 * 为 FastifyInstance 添加 prisma 等自定义装饰器类型
 */
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}
