import { buildApp } from '@/app';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('buildApp Factory & Core Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({
      fastifyOptions: { logger: false },
      skipMinioInit: true,
      skipRedisInit: true,
      skipAudit: true,
      skipRateLimit: true,
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('导出的 buildApp 能成功初始化并挂载所有核心装饰器', () => {
    expect(app.hasDecorator('prisma')).toBe(true);
    expect(app.hasRequestDecorator('tenantId')).toBe(true);
  });

  it('GET /api/health 能正确返回健康状态', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({
      success: true,
      data: { status: 'ok' },
    });
  });

  it('未匹配路由返回标准 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/non-existent-route',
    });

    expect(res.statusCode).toBe(404);
  });

  it('非白名单 Origin 请求被 CORS 拦截', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/health',
      headers: {
        origin: 'http://malicious-website.com',
      },
    });

    expect(res.statusCode).toBe(500);
    const body = res.json();
    expect(body.message).toContain('Origin http://malicious-website.com not allowed by CORS');
  });

  it('白名单/同源 Origin 正常放行', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/health',
      headers: {
        origin: 'http://localhost:3000',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });
});
