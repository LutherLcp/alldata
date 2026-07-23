/**
 * Redis 滑动窗口限流中间件
 * 按 API 路径 + 用户 ID 粒度限流
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getRedisClient } from '@/common/utils/redis';
import { ApiError } from '@/common/utils/response';

interface RateLimitOptions {
  /** 最大请求数 */
  max: number;
  /** 时间窗口（秒） */
  windowSeconds: number;
  /** 限流 key 前缀 */
  prefix?: string;
}

export function createRateLimiter(options: RateLimitOptions) {
  const { max, windowSeconds, prefix = 'rl' } = options;

  return async (request: FastifyRequest, reply: FastifyReply) => {
    const redis = getRedisClient();
    const userId = (request.user as { userId?: string } | null)?.userId ?? request.ip;
    const key = `${prefix}:${userId}:${request.routeOptions.url ?? request.url}`;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // 使用 Redis sorted set 实现滑动窗口
    const multi = redis.multi();
    multi.zremrangebyscore(key, 0, windowStart);
    multi.zadd(key, now, `${now}`);
    multi.zcard(key);
    multi.expire(key, windowSeconds);

    const results = await multi.exec();
    const count = (results?.[2]?.[1] as number) ?? 0;

    // 设置限流响应头
    reply.header('x-ratelimit-limit', max);
    reply.header('x-ratelimit-remaining', Math.max(0, max - count));

    if (count > max) {
      return ApiError.tooMany(reply);
    }
  };
}

/** 注册全局限流插件 */
export async function rateLimitPlugin(app: FastifyInstance) {
  // 默认全局限流：100次/分钟
  const defaultLimiter = createRateLimiter({ max: 100, windowSeconds: 60, prefix: 'rl:global' });

  app.addHook('preHandler', async (request, reply) => {
    // 跳过健康检查
    if (request.url === '/api/health' || request.url === '/api/ready') return;
    await defaultLimiter(request, reply);
  });
}
