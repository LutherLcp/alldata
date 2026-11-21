import { buildApp } from '@/app';
import { ExperienceService } from '@/modules/experience/service';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Experience Analytics & AI Data Copilot Engine', () => {
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
    vi.clearAllMocks();
    mockPrisma.userProjectRole.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.project.findFirst.mockResolvedValue({ id: 1, status: 1 });
  });

  describe('ExperienceService (Text-to-SQL & Session 业务层)', () => {
    let service: ExperienceService;

    beforeEach(() => {
      service = new ExperienceService();
    });

    it('askCopilot 能够准确识别漏斗、终端占比、留存与趋势意图并生成 SQL', async () => {
      // 1. 转化漏斗
      const funnelRes = await service.askCopilot(1, '请帮我分析全流程转化漏斗');
      expect(funnelRes.chart_type).toBe('bar');
      expect(funnelRes.sql).toContain('event_name');
      expect(funnelRes.columns).toContain('conversion_rate');

      // 2. 终端占比
      const deviceRes = await service.askCopilot(1, '统计各设备终端占比与渠道分布');
      expect(deviceRes.chart_type).toBe('pie');
      expect(deviceRes.sql).toContain('device');
      expect(deviceRes.columns).toContain('share');

      // 3. 留存分析
      const retentionRes = await service.askCopilot(1, '计算最近 7 天新用户留存');
      expect(retentionRes.chart_type).toBe('line');
      expect(retentionRes.sql).toContain('retention');

      // 4. 默认趋势
      const trendRes = await service.askCopilot(1, '分析近一周整体 PV/UV 流量趋势');
      expect(trendRes.chart_type).toBe('line');
      expect(trendRes.sql).toContain('toStartOfDay');
      expect(trendRes.rows.length).toBeGreaterThan(0);
    });

    it('listSessions, getSession 与 ingestSession 生命周期正常工作', async () => {
      const list = await service.listSessions(1);
      expect(list.length).toBeGreaterThanOrEqual(2);

      // 筛选异常会话
      const errorList = await service.listSessions(1, { has_error: true });
      expect(errorList.every((s) => s.has_error)).toBe(true);

      // 获取详情
      const targetId = list[0].session_id;
      const detail = await service.getSession(1, targetId);
      expect(detail).toBeDefined();
      expect(detail?.session_id).toBe(targetId);

      // 录入新会话
      const created = await service.ingestSession(1, {
        user_id: 'USR_NEW_99',
        page_url: '/search',
        duration_seconds: 45,
        has_error: false,
      });
      expect(created.user_id).toBe('USR_NEW_99');

      const found = await service.getSession(1, created.session_id);
      expect(found).toBeDefined();
    });

    it('getHeatmapData 能够生成页面点击密度与热力点分布', async () => {
      const homeHeatmap = await service.getHeatmapData(1, '/home');
      expect(homeHeatmap.total_clicks).toBeGreaterThan(0);
      expect(homeHeatmap.points.length).toBeGreaterThan(0);
      expect(homeHeatmap.max_intensity).toBeGreaterThan(0);

      const checkoutHeatmap = await service.getHeatmapData(1, '/checkout/pay');
      expect(checkoutHeatmap.page_url).toBe('/checkout/pay');
      expect(checkoutHeatmap.points.length).toBeGreaterThan(0);
    });
  });

  describe('REST API 路由与安全保护 (Fastify Integration)', () => {
    const token = () => app.jwt.sign({ userId: '1', tenantId: '1', role: 'admin' });

    it('POST /api/experience/copilot/ask 问答端点校验与正常返回', async () => {
      // 缺少 prompt
      const badRes = await app.inject({
        method: 'POST',
        url: '/api/experience/copilot/ask',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
        payload: {},
      });
      expect(badRes.statusCode).toBe(400);

      // 正常提问
      const goodRes = await app.inject({
        method: 'POST',
        url: '/api/experience/copilot/ask',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
        payload: {
          prompt: '分析转化漏斗',
        },
      });
      expect(goodRes.statusCode).toBe(200);
      const json = goodRes.json();
      expect(json.code).toBe(200);
      expect(json.data.chart_type).toBe('bar');
    });

    it('GET /api/experience/sessions 正常获取会话列表与根据 ID 查详情', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/experience/sessions',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
      });
      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(Array.isArray(json.data)).toBe(true);

      const targetId = json.data[0].session_id;
      const detailRes = await app.inject({
        method: 'GET',
        url: `/api/experience/sessions/${targetId}`,
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
      });
      expect(detailRes.statusCode).toBe(200);
      expect(detailRes.json().data.session_id).toBe(targetId);
    });

    it('POST /api/experience/sessions 录入会话记录', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/experience/sessions',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
        payload: {
          user_id: 'USR_API_INJECT',
          page_url: '/product/101',
          duration_seconds: 120,
        },
      });
      expect(res.statusCode).toBe(201);
      const json = res.json();
      expect(json.data.user_id).toBe('USR_API_INJECT');
    });

    it('GET /api/experience/heatmap 返回热力图点阵', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/experience/heatmap?page_url=/home',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
      });
      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.points.length).toBeGreaterThan(0);
    });

    it('IDOR 鉴权防护: 无权限用户请求应被拦截 403', async () => {
      mockPrisma.userProjectRole.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/api/experience/sessions',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '999',
        },
      });
      expect(res.statusCode).toBe(403);
    });
  });
});
