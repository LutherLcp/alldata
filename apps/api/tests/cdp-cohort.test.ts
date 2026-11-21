import { buildApp } from '@/app';
import { CDPClickHouseEngine } from '@/modules/cdp/clickhouse';
import { CDPService } from '@/modules/cdp/service';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

describe('CDP Dynamic Cohort & Zero-Fake-Data User Analytics', () => {
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

  describe('CDPService.getUser360Profile (零伪造数据确定性全景画像)', () => {
    it('返回结构完整且指标确定可复现的用户 360° 画像', async () => {
      const svc = new CDPService(app);
      const uid = 'USR_TEST_888';

      const p1 = await svc.getUser360Profile(1, uid);
      const p2 = await svc.getUser360Profile(1, uid);

      // 验证字段完整
      expect(p1.user_id).toBe(uid);
      expect(p1.project_id).toBe(1);
      expect(p1.ltv_score).toBeGreaterThanOrEqual(60);
      expect(p1.ltv_score).toBeLessThanOrEqual(100);
      expect(p1.tags).toBeInstanceOf(Array);
      expect(p1.recent_events).toBeInstanceOf(Array);

      // 核心断言：杜绝 Math.random()，两次调用结果完全确定且一致
      expect(p1.ltv_score).toBe(p2.ltv_score);
      expect(p1.total_events).toBe(p2.total_events);
      expect(p1.total_spend).toBe(p2.total_spend);
      expect(p1.city).toBe(p2.city);
    });
  });

  describe('CDPClickHouseEngine & Cohort 圈选计算', () => {
    it('buildCohortSQL 与 buildCohortCountSQL 能够准确生成多操作符过滤条件', () => {
      const rules = [
        { property: 'event_count', operator: 'gt', value: 5 },
        { property: 'total_spend', operator: 'gte', value: 1000 },
        { property: 'city', operator: 'eq', value: '上海' },
      ];

      const filterSql = CDPClickHouseEngine.buildCohortSQL(1, rules);
      expect(filterSql).toContain('SELECT DISTINCT user_id FROM events WHERE project_id = 1');
      expect(filterSql).toContain('event_count > 5');
      expect(filterSql).toContain('total_spend >= 1000');
      expect(filterSql).toContain("city = '上海'");

      const countSql = CDPClickHouseEngine.buildCohortCountSQL(1, rules);
      expect(countSql).toContain(
        'SELECT uniqExact(user_id) AS cnt FROM events WHERE project_id = 1',
      );
    });

    it('estimateCohortSize 能够根据规则复杂度给出确定性预估人数与 SQL', async () => {
      const svc = new CDPService(app);
      const rules = [{ property: 'order_count', operator: 'gt', value: 2 }];

      const res = await svc.estimateCohortSize(1, rules);
      expect(res.count).toBeGreaterThan(0);
      expect(res.sql).toBeDefined();
    });

    it('listCohorts 与 createCohort 能够正常管理动态人群生命周期', async () => {
      const svc = new CDPService(app);

      const initial = await svc.listCohorts(1);
      expect(initial.length).toBeGreaterThanOrEqual(2);

      const created = await svc.createCohort(
        1,
        {
          name: '高潜转化群体',
          description: '近7天加购但未支付',
          rules: [{ property: 'add_to_cart_cnt', operator: 'gt', value: 0 }],
        },
        1,
      );

      expect(created.name).toBe('高潜转化群体');
      expect(created.user_count).toBeGreaterThan(0);

      const after = await svc.listCohorts(1);
      expect(after.some((c) => c.name === '高潜转化群体')).toBe(true);

      const deleted = await svc.deleteCohort(created.id, 1);
      expect(deleted).toBe(true);
    });

    it('getCustomerJourneyPath 返回桑基图节点、边与流失率', async () => {
      const svc = new CDPService(app);
      const journey = await svc.getCustomerJourneyPath(1, {
        start: '2026-11-01',
        end: '2026-11-20',
      });

      expect(journey.nodes).toBeInstanceOf(Array);
      expect(journey.links).toBeInstanceOf(Array);
      expect(journey.dropoff_rate).toBeGreaterThan(0);
    });
  });

  describe('CDP REST API 集成与租户隔离', () => {
    const token = () => app.jwt.sign({ userId: '1', tenantId: '1', role: 'admin' });

    it('GET /api/cdp/users/:id/profile 正常获取用户全景画像', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/cdp/users/U1001/profile',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.code).toBe(200);
      expect(body.data.user_id).toBe('U1001');
    });

    it('POST /api/cdp/cohorts/estimate 预估分群规模', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/cdp/cohorts/estimate',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
        payload: {
          rules: [{ property: 'view_cnt', operator: 'gt', value: 10 }],
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.code).toBe(200);
      expect(body.data.count).toBeGreaterThan(0);
    });

    it('POST /api/cdp/cohorts 缺少 name 返回 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/cdp/cohorts',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
        payload: {},
      });

      expect(res.statusCode).toBe(400);
    });
  });
});
