/**
 * 认证模块 — 路由定义
 * POST /login   — 登录
 * POST /logout  — 登出
 * POST /refresh — 刷新 Token
 * GET  /me      — 获取当前用户信息
 */
import { FastifyInstance } from 'fastify';
import { loginSchema, refreshTokenSchema } from '@alldata/shared/schemas/index.js';
import { requireAuth } from '@/plugins/auth';
import { sendSuccess, ApiError } from '@/common/utils/response';
import { AuthService } from './service';

export async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService(app);

  // 登录
  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const result = await authService.login(body);
    if (!result) {
      return ApiError.unauthorized(reply, '用户名或密码错误');
    }
    return sendSuccess(reply, result);
  });

  // 登出
  app.post('/logout', { preHandler: requireAuth }, async (request, reply) => {
    const userId = (request.user as { userId: string }).userId;
    await authService.logout(userId);
    return sendSuccess(reply, null, '登出成功');
  });

  // 刷新 Token
  app.post('/refresh', async (request, reply) => {
    const body = refreshTokenSchema.parse(request.body);
    const result = await authService.refreshToken(body.refresh_token);
    if (!result) {
      return ApiError.tokenExpired(reply);
    }
    return sendSuccess(reply, result);
  });

  // 获取当前用户信息
  app.get('/me', { preHandler: requireAuth }, async (request, reply) => {
    const userId = Number((request.user as { userId: string }).userId);
    const userInfo = await authService.getUserInfo(userId);
    if (!userInfo) {
      return ApiError.notFound(reply, '用户不存在');
    }
    return sendSuccess(reply, userInfo);
  });
}
