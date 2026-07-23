/**
 * 全局错误处理中间件
 * 统一捕获各类异常并返回标准格式
 */
import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '@/utils/logger';
import { ERROR_CODES } from '@alldata/shared/constants/index.js';

export const errorHandler = (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
  logger.error(
    { err: error, url: request.url, method: request.method, userId: request.user?.userId },
    'Request error',
  );

  // Zod 参数校验错误
  if (error instanceof ZodError) {
    return reply.status(400).send({
      code: ERROR_CODES.BAD_REQUEST,
      message: '请求参数验证失败',
      data: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
    });
  }

  // Prisma 已知请求错误
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return reply.status(409).send({
          code: ERROR_CODES.BAD_REQUEST,
          message: '资源已存在',
          data: null,
        });
      case 'P2025':
        return reply.status(404).send({
          code: ERROR_CODES.NOT_FOUND,
          message: '资源不存在',
          data: null,
        });
      default:
        break;
    }
  }

  // Prisma 未知请求错误
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return reply.status(500).send({
      code: ERROR_CODES.INTERNAL_ERROR,
      message: '数据库操作异常',
      data: null,
    });
  }

  // Fastify 内置 HTTP 错误
  const statusCode = error.statusCode ?? 500;
  const code = mapHttpCode(statusCode);
  const message = error.message ?? '服务器内部错误';

  return reply.status(statusCode).send({
    code,
    message,
    data: null,
  });
};

function mapHttpCode(statusCode: number): number {
  switch (statusCode) {
    case 400: return ERROR_CODES.BAD_REQUEST;
    case 401: return ERROR_CODES.UNAUTHORIZED;
    case 403: return ERROR_CODES.FORBIDDEN;
    case 404: return ERROR_CODES.NOT_FOUND;
    case 429: return ERROR_CODES.TOO_MANY_REQUESTS;
    default: return ERROR_CODES.INTERNAL_ERROR;
  }
}
