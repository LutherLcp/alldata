import { healthRoutes } from '@/routes/health';
import Fastify from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * 针对真实健康检查路由的冒烟测试。
 * 只覆盖 /api/health（不触达数据库），/api/ready 需要 PostgreSQL。
 */
describe('Health Check API', () => {
  let app: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(healthRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health 返回 ok 状态', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ success: true, data: { status: 'ok' } });
  });
});
