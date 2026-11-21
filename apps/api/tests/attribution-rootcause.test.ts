import { buildApp } from '@/app';
import { AttributionService } from '@/modules/analysis/attribution.service';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

describe('AI Smart Attribution & Root Cause Analysis', () => {
  describe('AttributionService (多触点归因算法单测)', () => {
    const oneDay = 86400 * 1000;
    const convTime = 14 * oneDay;
    const touchpoints = [
      { channel: 'Google', timestamp: 0 }, // 14天前
      { channel: 'RedBook', timestamp: 7 * oneDay }, // 7天前
      { channel: 'Direct', timestamp: 13 * oneDay }, // 1天前
    ];

    it('首次触点模型 (first_touch) 100% 归因于首个触点', () => {
      const weights = AttributionService.calculateWeights(touchpoints, convTime, 'first_touch');
      expect(weights).toEqual([1.0, 0, 0]);
    });

    it('末次触点模型 (last_touch) 100% 归因于最后触点', () => {
      const weights = AttributionService.calculateWeights(touchpoints, convTime, 'last_touch');
      expect(weights).toEqual([0, 0, 1.0]);
    });

    it('线性归因模型 (linear) 均分转化权重', () => {
      const weights = AttributionService.calculateWeights(touchpoints, convTime, 'linear');
      expect(weights).toHaveLength(3);
      expect(weights[0]).toBeCloseTo(0.3333, 3);
      expect(weights[1]).toBeCloseTo(0.3333, 3);
      expect(weights[2]).toBeCloseTo(0.3333, 3);
    });

    it('U型位置归因模型 (position_based) 首末各占40%，中间均分20%', () => {
      const weights = AttributionService.calculateWeights(touchpoints, convTime, 'position_based');
      expect(weights[0]).toBe(0.4);
      expect(weights[1]).toBe(0.2);
      expect(weights[2]).toBe(0.4);
    });

    it('时间衰减归因模型 (time_decay) 离转化越近权重越高', () => {
      const weights = AttributionService.calculateWeights(touchpoints, convTime, 'time_decay', 7);
      expect(weights[2]).toBeGreaterThan(weights[1]);
      expect(weights[1]).toBeGreaterThan(weights[0]);
      const sum = weights.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 3);
    });
  });

  describe('API Endpoints: /attribution & /root-cause', () => {
    let app: FastifyInstance;

    const mockPrisma = {
      project: {
        findFirst: vi.fn(),
      },
      userProjectRole: {
        findUnique: vi.fn(),
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
      mockPrisma.userProjectRole.findUnique.mockReset();
      mockPrisma.userProjectRole.findUnique.mockResolvedValue({ id: 1 });
    });

    it('POST /api/analysis/attribution 执行多触点归因分析', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: 1, status: 1 });
      const token = app.jwt.sign({ userId: '1', tenantId: '1', role: 'admin' });

      const res = await app.inject({
        method: 'POST',
        url: '/api/analysis/attribution',
        headers: {
          authorization: `Bearer ${token}`,
          'project-id': '1',
        },
        payload: {
          target_event: 'order_pay',
          model: 'position_based',
          time_range: {
            start: '2026-11-01',
            end: '2026-11-20',
          },
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.code).toBe(200);
      expect(body.data.target_event).toBe('order_pay');
      expect(body.data.model).toBe('position_based');
      expect(body.data.channels).toBeInstanceOf(Array);
      expect(body.data.channels.length).toBeGreaterThan(0);
      expect(body.data.channels[0]).toHaveProperty('attributed_conversions');
      expect(body.data.channels[0]).toHaveProperty('share_rate');
    });

    it('POST /api/ai/root-cause 执行多维波动根因诊断', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: 1, status: 1 });
      const token = app.jwt.sign({ userId: '1', tenantId: '1', role: 'admin' });

      const res = await app.inject({
        method: 'POST',
        url: '/api/ai/root-cause',
        headers: {
          authorization: `Bearer ${token}`,
          'project-id': '1',
        },
        payload: {
          project_id: 1,
          metric_name: 'dau',
          baseline_period: { start: '2026-11-01', end: '2026-11-07' },
          current_period: { start: '2026-11-08', end: '2026-11-14' },
          dimensions: ['os', 'browser'],
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.code).toBe(200);
      expect(body.data.metric_name).toBe('dau');
      expect(body.data).toHaveProperty('baseline_total');
      expect(body.data).toHaveProperty('current_total');
      expect(body.data).toHaveProperty('total_delta');
      expect(body.data).toHaveProperty('growth_rate');
      expect(body.data.primary_drivers).toBeInstanceOf(Array);
      expect(body.data.ai_summary).toContain('dau');
    });
  });
});
