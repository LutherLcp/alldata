import { buildApp } from '@/app';
import { SemanticCompiler } from '@/modules/metric/semantic-compiler';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Metric Semantic Layer (统一指标语义层)', () => {
  describe('SemanticCompiler (语义编译引擎单测)', () => {
    it('正确编译基础原子指标与时间维度参数', () => {
      const metrics = [
        {
          id: 1,
          project_id: 10,
          name: 'dau',
          formula: { type: 'simple' as const, agg_type: 'uv' as const },
        },
        {
          id: 2,
          project_id: 10,
          name: 'pv',
          formula: {
            type: 'simple' as const,
            agg_type: 'count' as const,
            event_name: '$pageview',
          },
        },
      ];

      const compiled = SemanticCompiler.compile(metrics, {
        project_id: 10,
        time_range: {
          start: '2026-11-01 00:00:00',
          end: '2026-11-20 23:59:59',
          granularity: 'day',
        },
        dimensions: ['os'],
      });

      expect(compiled.sql).toContain('uniqExact(user_id) AS m_1');
      expect(compiled.sql).toContain('countIf(event_name = {ev_1:String}) AS m_2');
      expect(compiled.sql).toContain('toDate(event_time) AS dt');
      expect(compiled.sql).toContain('GROUP BY dt, os');
      expect(compiled.params.projectId).toBe(10);
      expect(compiled.params.ev_1).toBe('$pageview');
    });

    it('正确嵌套编译复合派生指标并添加防零除保护', () => {
      const metrics = [
        {
          id: 1,
          project_id: 10,
          name: 'dau',
          formula: { type: 'simple' as const, agg_type: 'uv' as const },
        },
        {
          id: 2,
          project_id: 10,
          name: 'pv',
          formula: {
            type: 'simple' as const,
            agg_type: 'count' as const,
            event_name: '$pageview',
          },
        },
        {
          id: 3,
          project_id: 10,
          name: 'user_avg_pv',
          formula: {
            type: 'composite' as const,
            expression: 'm_pv / nullIf(m_dau, 0)',
          },
        },
      ];

      const compiled = SemanticCompiler.compile(metrics, {
        project_id: 10,
        time_range: {
          start: '2026-11-01',
          end: '2026-11-10',
        },
      });

      // 验证外层查询包装与复合表达式
      expect(compiled.sql).toContain('FROM (');
      expect(compiled.sql).toContain('(m_pv / nullIf(m_dau, 0)) AS m_3');
      expect(compiled.metricAliases).toHaveLength(3);
      expect(compiled.metricAliases[2].type).toBe('composite');
    });
  });

  describe('Metric API & Semantic Execution (接口集成)', () => {
    let app: FastifyInstance;

    const mockPrisma = {
      project: {
        findFirst: vi.fn(),
      },
      metric: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      userProjectRole: {
        findUnique: vi.fn(),
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

    beforeEach(() => {
      mockPrisma.project.findFirst.mockReset();
      mockPrisma.metric.findMany.mockReset();
      mockPrisma.metric.findFirst.mockReset();
      mockPrisma.metric.create.mockReset();
      mockPrisma.userProjectRole.findFirst.mockReset();
      mockPrisma.userProjectRole.findUnique.mockReset();
      mockPrisma.userProjectRole.findUnique.mockResolvedValue({ id: 1 });
    });

    it('POST /api/metrics/seed-presets 初始化预置企业标准指标', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: 1, status: 1 });
      mockPrisma.metric.findFirst.mockResolvedValue(null); // 均未创建过
      mockPrisma.metric.create.mockImplementation((args: any) =>
        Promise.resolve({ id: Math.floor(Math.random() * 100) + 1, ...args.data }),
      );

      const token = app.jwt.sign({ userId: '1', tenantId: '1', role: 'admin' });

      const res = await app.inject({
        method: 'POST',
        url: '/api/metrics/seed-presets',
        headers: {
          authorization: `Bearer ${token}`,
          'x-project-id': '1',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.code).toBe(200);
      expect(body.data).toHaveLength(4);
      expect(body.data[0].name).toBe('dau');
      expect(body.data[1].name).toBe('page_views');
    });

    it('POST /api/metrics/query 执行语义查询并返回格式化多维结果', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: 1, status: 1 });
      mockPrisma.metric.findMany.mockResolvedValue([
        {
          id: 101,
          project_id: 1,
          name: 'dau',
          display_name: '日活跃用户',
          status: 1,
          formula: { type: 'simple', agg_type: 'uv' },
        },
        {
          id: 102,
          project_id: 1,
          name: 'pv',
          display_name: '页面访问量',
          status: 1,
          formula: { type: 'simple', event_name: '$pageview', agg_type: 'count' },
        },
      ]);

      const token = app.jwt.sign({ userId: '1', tenantId: '1', role: 'admin' });

      const res = await app.inject({
        method: 'POST',
        url: '/api/metrics/query',
        headers: {
          authorization: `Bearer ${token}`,
          'x-project-id': '1',
        },
        payload: {
          metric_ids: [101, 102],
          time_range: {
            start: '2026-11-01',
            end: '2026-11-21',
            granularity: 'day',
          },
          dimensions: ['os'],
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.code).toBe(200);
      expect(body.data.metrics).toHaveLength(2);
      expect(body.data.dimensions).toContain('dt');
      expect(body.data.dimensions).toContain('os');
      expect(body.data.rows).toBeInstanceOf(Array);
      expect(body.data.sql).toContain('uniqExact(user_id) AS m_101');
    });

    it('POST /api/metrics/query 校验必填参数', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: 1, status: 1 });
      const token = app.jwt.sign({ userId: '1', tenantId: '1', role: 'admin' });

      const res1 = await app.inject({
        method: 'POST',
        url: '/api/metrics/query',
        headers: {
          authorization: `Bearer ${token}`,
          'x-project-id': '1',
        },
        payload: {
          // missing metric_ids
          time_range: { start: '2026-11-01', end: '2026-11-21' },
        },
      });
      expect(res1.statusCode).toBe(400);

      const res2 = await app.inject({
        method: 'POST',
        url: '/api/metrics/query',
        headers: {
          authorization: `Bearer ${token}`,
          'x-project-id': '1',
        },
        payload: {
          metric_ids: [1],
          // missing time_range
        },
      });
      expect(res2.statusCode).toBe(400);
    });
  });
});
