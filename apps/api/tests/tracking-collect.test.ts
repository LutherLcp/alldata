import { buildApp } from '@/app';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

describe('Event Ingestion API (POST /api/tracking/collect)', () => {
  let app: FastifyInstance;

  const mockPrisma = {
    project: {
      findFirst: vi.fn(),
    },
  };

  beforeAll(async () => {
    app = await buildApp({
      prisma: mockPrisma as any,
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

  it('缺少或非法 project_id 时返回 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/tracking/collect',
      payload: {
        events: [{ event_name: 'test_event' }],
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.message).toContain('缺少或非法的 project_id');
  });

  it('所传 project_id 在数据库中不存在或已禁用时返回 404', async () => {
    mockPrisma.project.findFirst.mockResolvedValueOnce(null);

    const res = await app.inject({
      method: 'POST',
      url: '/api/tracking/collect',
      payload: {
        project_id: 9999,
        events: [{ event_name: 'test_event' }],
      },
    });

    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.message).toContain('Project 9999 not found');
  });

  it('缺少 event_name 时返回 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/tracking/collect',
      payload: {
        project_id: 1,
        events: [{}],
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.message).toContain('缺少事件数据或 event_name');
  });

  it('合法的批量事件能够被成功解析并处理', async () => {
    mockPrisma.project.findFirst.mockResolvedValueOnce({ id: 1, status: 1 });

    const res = await app.inject({
      method: 'POST',
      url: '/api/tracking/collect',
      headers: {
        'x-project-id': '1',
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      },
      payload: {
        events: [
          {
            event_name: '$pageview',
            user_id: 101,
            distinct_id: 'anonymous_1',
            event_time: Date.now(),
            properties: {
              $url: 'https://app.alldata.io/dashboard',
              $title: '运营大盘',
              $os: 'macOS',
              $browser: 'Chrome',
            },
          },
          {
            event_name: 'add_to_cart',
            user_id: 101,
            distinct_id: 'anonymous_1',
            event_time: Date.now(),
            properties: {
              sku_id: 'item_77',
              price: 199.9,
            },
          },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.code).toBe(200);
    expect(body.data.received).toBe(2);
    expect(body.data.accepted).toBe(2);
  });

  it('支持 beacon 格式的纯文本 JSON 字符串上报', async () => {
    mockPrisma.project.findFirst.mockResolvedValueOnce({ id: 1, status: 1 });

    const beaconPayload = JSON.stringify({
      project_id: 1,
      events: [
        {
          event_name: '$pageview',
          properties: { $url: 'https://app.alldata.io/' },
        },
      ],
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/tracking/collect',
      headers: {
        'content-type': 'text/plain',
      },
      body: beaconPayload,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.received).toBe(1);
    expect(body.data.accepted).toBe(1);
  });
});
