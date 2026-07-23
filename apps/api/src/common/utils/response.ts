/**
 * 统一响应格式封装
 * 所有 API 响应统一 { code, message, data } 格式
 */
import { FastifyReply } from 'fastify';
import { ERROR_CODES } from '@alldata/shared/constants/index.js';

export interface SuccessResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export interface ErrorResponse {
  code: number;
  message: string;
  data: null;
}

/** 成功响应 */
export function sendSuccess<T>(reply: FastifyReply, data: T, message = 'success', code = 200): void {
  reply.code(code).send({ code, message, data });
}

/** 分页响应 */
export function sendPaginated<T>(
  reply: FastifyReply,
  list: T[],
  total: number,
  page: number,
  pageSize: number,
): void {
  const totalPage = Math.ceil(total / pageSize) || 1;
  reply.send({
    code: 200,
    message: 'success',
    data: {
      list,
      page_info: {
        current_page: page,
        page_size: pageSize,
        total_page: totalPage,
        total,
      },
    },
  });
}

/** 错误响应 */
export function sendError(
  reply: FastifyReply,
  code: number,
  message: string,
  httpStatus?: number,
): void {
  reply.code(httpStatus ?? code).send({ code, message, data: null });
}

/** 常用错误快捷方法 */
export const ApiError = {
  badRequest: (reply: FastifyReply, msg = '参数错误') =>
    sendError(reply, ERROR_CODES.BAD_REQUEST, msg, 400),

  unauthorized: (reply: FastifyReply, msg = '未授权，请登录') =>
    sendError(reply, ERROR_CODES.UNAUTHORIZED, msg, 401),

  forbidden: (reply: FastifyReply, msg = '权限不足') =>
    sendError(reply, ERROR_CODES.FORBIDDEN, msg, 403),

  notFound: (reply: FastifyReply, msg = '资源不存在') =>
    sendError(reply, ERROR_CODES.NOT_FOUND, msg, 404),

  tooMany: (reply: FastifyReply, msg = '请求频率超限') =>
    sendError(reply, ERROR_CODES.TOO_MANY_REQUESTS, msg, 429),

  tokenExpired: (reply: FastifyReply) =>
    sendError(reply, ERROR_CODES.TOKEN_EXPIRED, 'Token 已过期', 401),

  dataPermission: (reply: FastifyReply) =>
    sendError(reply, ERROR_CODES.DATA_PERMISSION_DENIED, '数据权限不足', 403),

  internal: (reply: FastifyReply, msg = '服务器内部错误') =>
    sendError(reply, ERROR_CODES.INTERNAL_ERROR, msg, 500),
};
