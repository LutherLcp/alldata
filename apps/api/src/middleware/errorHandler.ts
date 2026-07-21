import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '@/utils/logger';

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  logger.error({ err: error, url: request.url }, 'Request error');

  if (error.validation) {
    return reply.code(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '请求参数验证失败',
        details: error.validation,
        statusCode: 400,
      },
    });
  }

  if (error instanceof ZodError) {
    return reply.code(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '数据验证失败',
        details: error.flatten(),
        statusCode: 400,
      },
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return reply.code(409).send({
        success: false,
        error: { code: 'DUPLICATE_ENTRY', message: '数据已存在', statusCode: 409 },
      });
    }
    if (error.code === 'P2025') {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: '数据不存在', statusCode: 404 },
      });
    }
  }

  const statusCode = error.statusCode || 500;
  return reply.code(statusCode).send({
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || '服务器内部错误',
      statusCode,
    },
  });
}