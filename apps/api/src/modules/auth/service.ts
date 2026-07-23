/**
 * 认证服务 — 登录/登出/刷新 Token/用户信息
 */
import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import type { LoginRequest, LoginResponse, UserInfo } from '@alldata/shared/types/index.js';
import { getRedisClient } from '@/common/utils/redis';

const JWT_EXPIRES_IN = '7d';
const REFRESH_TOKEN_EXPIRES_IN = '30d'; // 天

export class AuthService {
  private prisma;

  constructor(private app: FastifyInstance) {
    this.prisma = app.prisma;
  }

  /** 登录 */
  async login(data: LoginRequest): Promise<LoginResponse | null> {
    const user = await this.prisma.user.findUnique({
      where: { username: data.username },
    });

    if (!user || user.status !== 1) return null;

    const valid = await bcrypt.compare(data.password, user.password_hash);
    if (!valid) return null;

    // 获取用户项目列表
    const userProjects = await this.prisma.userProjectRole.findMany({
      where: { user_id: user.id },
      include: {
        project: { select: { id: true, code: true, name: true } },
        role: { select: { name: true, permissions: true } },
      },
    });

    // 生成 Token
    const token = this.app.jwt.sign(
      { userId: String(user.id), role: userProjects[0]?.role.name ?? 'member' },
      { expiresIn: JWT_EXPIRES_IN },
    );

    const refreshToken = this.app.jwt.sign(
      { userId: String(user.id), type: 'refresh' },
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN },
    );

    // 存储 session 到 Redis
    const redis = getRedisClient();
    await redis.set(
      `session:${user.id}`,
      JSON.stringify({ userId: user.id, token }),
      'EX',
      7 * 24 * 3600,
    );

    // 计算过期时间戳
    const expireAt = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;

    return {
      token,
      refresh_token: refreshToken,
      user_info: {
        id: user.id,
        username: user.username,
        email: user.email ?? undefined,
        avatar: user.avatar ?? undefined,
        lang: user.lang,
        projects: userProjects.map((up: { project: { id: number; code: string; name: string } }) => up.project),
      },
      expire_at: expireAt,
    };
  }

  /** 登出 */
  async logout(userId: string): Promise<void> {
    const redis = getRedisClient();
    await redis.del(`session:${userId}`);
  }

  /** 刷新 Token */
  async refreshToken(refreshToken: string): Promise<LoginResponse | null> {
    try {
      const decoded = this.app.jwt.verify<{ userId: string; type: string }>(refreshToken);
      if (decoded.type !== 'refresh') return null;

      const user = await this.prisma.user.findUnique({
        where: { id: Number(decoded.userId) },
      });
      if (!user || user.status !== 1) return null;

      const userProjects = await this.prisma.userProjectRole.findMany({
        where: { user_id: user.id },
        include: {
          project: { select: { id: true, code: true, name: true } },
          role: { select: { name: true } },
        },
      });

      const token = this.app.jwt.sign(
        { userId: String(user.id), role: userProjects[0]?.role.name ?? 'member' },
        { expiresIn: JWT_EXPIRES_IN },
      );

      const newRefreshToken = this.app.jwt.sign(
        { userId: String(user.id), type: 'refresh' },
        { expiresIn: REFRESH_TOKEN_EXPIRES_IN },
      );

      const redis = getRedisClient();
      await redis.set(
        `session:${user.id}`,
        JSON.stringify({ userId: user.id, token }),
        'EX',
        7 * 24 * 3600,
      );

      return {
        token,
        refresh_token: newRefreshToken,
        user_info: {
          id: user.id,
          username: user.username,
          email: user.email ?? undefined,
          avatar: user.avatar ?? undefined,
          lang: user.lang,
          projects: userProjects.map((up: { project: { id: number; code: string; name: string } }) => up.project),
        },
        expire_at: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
      };
    } catch {
      return null;
    }
  }

  /** 获取用户信息 */
  async getUserInfo(userId: number): Promise<UserInfo | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        lang: true,
        project_roles: {
          include: {
            project: { select: { id: true, code: true, name: true } },
            role: { select: { permissions: true } },
          },
        },
      },
    });

    if (!user) return null;

    const allPermissions: string[] = user.project_roles.flatMap(
      (upr: { role: { permissions: unknown } }) => (upr.role.permissions as string[]) ?? [],
    );

    return {
      id: user.id,
      username: user.username,
      email: user.email ?? undefined,
      avatar: user.avatar ?? undefined,
      lang: user.lang,
      permissions: [...new Set(allPermissions)] as string[],
      projects: user.project_roles.map((upr: { project: { id: number; code: string; name: string } }) => upr.project),
    };
  }
}
