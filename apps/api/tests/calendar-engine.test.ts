import { buildApp } from '@/app';
import { CalendarService } from '@/modules/calendar/service';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Release Calendar & Milestone Roadmap Engine', () => {
  let app: FastifyInstance;

  const mockPrisma = {
    project: {
      findFirst: vi.fn(),
    },
    userProjectRole: {
      findUnique: vi.fn(),
    },
    versionCalendar: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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

  describe('CalendarService (业务层与租户 IDOR 隔离)', () => {
    let service: CalendarService;

    beforeEach(() => {
      service = new CalendarService(app);
    });

    it('list 能够正确按 project_id、时间范围和类型筛选', async () => {
      mockPrisma.versionCalendar.findMany.mockResolvedValue([
        { id: 1, project_id: 1, title: 'V2.0 大版本发布', type: 'release' },
      ]);

      const list = await service.list(1, {
        startDate: '2026-08-01',
        endDate: '2026-08-31',
        type: 'release',
      });

      expect(list).toHaveLength(1);
      expect(mockPrisma.versionCalendar.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            project_id: 1,
            type: 'release',
          }),
        }),
      );
    });

    it('get, update, delete 具备严格的租户隔离防护，阻止跨项目越权', async () => {
      // get 跨项目不存在时返回 null
      mockPrisma.versionCalendar.findFirst.mockResolvedValue(null);
      const getDenied = await service.get(1, 2);
      expect(getDenied).toBeNull();

      // update 跨项目
      const updateDenied = await service.update(1, 2, { title: '非法修改' });
      expect(updateDenied).toBeNull();

      // update 同项目成功
      mockPrisma.versionCalendar.findFirst.mockResolvedValue({ id: 1, project_id: 1 });
      mockPrisma.versionCalendar.update.mockResolvedValue({
        id: 1,
        title: 'V2.0 正式上线',
      });
      const updateOk = await service.update(1, 1, { title: 'V2.0 正式上线' });
      expect(updateOk?.title).toBe('V2.0 正式上线');

      // delete 跨项目
      mockPrisma.versionCalendar.findFirst.mockResolvedValue(null);
      const deleteDenied = await service.delete(1, 2);
      expect(deleteDenied).toBe(false);

      // delete 同项目成功
      mockPrisma.versionCalendar.findFirst.mockResolvedValue({ id: 1, project_id: 1 });
      mockPrisma.versionCalendar.delete.mockResolvedValue({ id: 1 });
      const deleteOk = await service.delete(1, 1);
      expect(deleteOk).toBe(true);
    });

    it('getRoadmapSummary 能够准确聚合即将发布、里程碑与维护窗口指标', async () => {
      const now = new Date();
      const in10Days = new Date(now.getTime() + 10 * 86400 * 1000).toISOString();

      mockPrisma.versionCalendar.findMany.mockResolvedValue([
        { id: 1, type: 'release', status: 1, start_date: in10Days },
        { id: 2, type: 'milestone', status: 1, start_date: in10Days },
        { id: 3, type: 'maintenance', status: 1, start_date: in10Days },
        { id: 4, type: 'meeting', status: 1, start_date: in10Days },
      ]);

      const summary = await service.getRoadmapSummary(1);
      expect(summary.total_events).toBe(4);
      expect(summary.upcoming_releases).toBe(1);
      expect(summary.active_milestones).toBe(1);
      expect(summary.maintenance_windows).toBe(1);
    });
  });

  describe('REST API 路由与安全保护 (Fastify Integration)', () => {
    const token = () => app.jwt.sign({ userId: '1', tenantId: '1', role: 'admin' });

    it('GET /api/calendar 获取版本日历列表', async () => {
      mockPrisma.versionCalendar.findMany.mockResolvedValue([
        { id: 10, title: '双十一运营版本预演' },
      ]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/calendar',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.code).toBe(200);
      expect(json.data).toHaveLength(1);
    });

    it('GET /api/calendar/summary 获取发布里程碑概览', async () => {
      mockPrisma.versionCalendar.findMany.mockResolvedValue([]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/calendar/summary',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.total_events).toBe(0);
    });

    it('POST /api/calendar 校验必填参数与正常创建', async () => {
      // 缺少必填参数
      const badRes = await app.inject({
        method: 'POST',
        url: '/api/calendar',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
        payload: { title: '未指定日期的事件' },
      });
      expect(badRes.statusCode).toBe(400);

      // 正常创建
      mockPrisma.versionCalendar.create.mockResolvedValue({
        id: 25,
        title: '双十二大促版本',
      });

      const goodRes = await app.inject({
        method: 'POST',
        url: '/api/calendar',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
        payload: {
          title: '双十二大促版本',
          start_date: '2026-12-01',
          type: 'release',
        },
      });
      expect(goodRes.statusCode).toBe(201);
      const json = goodRes.json();
      expect(json.data.title).toBe('双十二大促版本');
    });

    it('IDOR 鉴权防护: 无权限用户请求应被拦截 403', async () => {
      mockPrisma.userProjectRole.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/api/calendar',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '999',
        },
      });
      expect(res.statusCode).toBe(403);
    });
  });
});
