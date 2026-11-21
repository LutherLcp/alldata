import { buildApp } from '@/app';
import { DashboardService } from '@/modules/dashboard/service';
import { WarningService } from '@/modules/warning/service';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Smart Warning Engine & Dashboard Semantic Card Query', () => {
  let app: FastifyInstance;

  const mockPrisma = {
    project: {
      findFirst: vi.fn(),
    },
    userProjectRole: {
      findUnique: vi.fn(),
    },
    warning: {
      findFirst: vi.fn(),
    },
    warningLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    report: {
      findFirst: vi.fn(),
    },
    metric: {
      findMany: vi.fn(),
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

  describe('WarningService.triggerCheck (智能预警与自动根因诊断)', () => {
    it('指标超过阈值时触发预警 (status: 1)，并自动挂载 AI 根因诊断', async () => {
      const svc = new WarningService(app);

      mockPrisma.warning.findFirst.mockResolvedValue({
        id: 10,
        project_id: 1,
        name: 'DAU 异常激增预警',
        monitor_rules: {
          metric: 'dau',
          operator: '>',
          value: 500,
          current_value: 750, // 超过 500 阈值
        },
      });

      mockPrisma.warningLog.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 101, ...data }),
      );

      const result = await svc.triggerCheck(10, 1);

      expect(result).not.toBeNull();
      expect(result?.triggered).toBe(true);
      expect(result?.status).toBe('triggered');
      expect(result?.metric_value).toBe(750);
      expect(result?.threshold).toBe(500);
      expect(result?.root_cause).toBeDefined();
      expect(result?.root_cause?.ai_summary).toContain('dau');

      // 验证落库日志 status: 1
      expect(mockPrisma.warningLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            warning_id: 10,
            status: 1,
            detail: expect.objectContaining({
              triggered: true,
              metric_value: 750,
            }),
          }),
        }),
      );
    });

    it('指标在正常范围内时恢复正常 (status: 2)，无需触发根因分析', async () => {
      const svc = new WarningService(app);

      mockPrisma.warning.findFirst.mockResolvedValue({
        id: 11,
        project_id: 1,
        name: 'DAU 异常激增预警',
        monitor_rules: {
          metric: 'dau',
          operator: '>',
          value: 500,
          current_value: 320, // 低于 500
        },
      });

      mockPrisma.warningLog.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 102, ...data }),
      );

      const result = await svc.triggerCheck(11, 1);

      expect(result?.triggered).toBe(false);
      expect(result?.status).toBe('normal');
      expect(result?.root_cause).toBeNull();
      expect(mockPrisma.warningLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            warning_id: 11,
            status: 2,
          }),
        }),
      );
    });

    it('未配置监控规则时向下兼容返回 not_implemented', async () => {
      const svc = new WarningService(app);

      mockPrisma.warning.findFirst.mockResolvedValue({
        id: 12,
        project_id: 1,
        name: '未配置规则的预警',
        monitor_rules: {},
      });

      mockPrisma.warningLog.create.mockResolvedValue({ id: 103 });

      const result = await svc.triggerCheck(12, 1);

      expect(result?.status).toBe('not_implemented');
      expect(mockPrisma.warningLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 3,
          }),
        }),
      );
    });

    it('IDOR 隔离：尝试检查非当前项目的预警规则返回 null', async () => {
      const svc = new WarningService(app);
      mockPrisma.warning.findFirst.mockResolvedValue(null);

      const result = await svc.triggerCheck(999, 1);
      expect(result).toBeNull();
    });
  });

  describe('DashboardService.executeReportData (看板报表卡片实时数据执行)', () => {
    it('执行标准图表报表数据返回分类维度与时序汇总', async () => {
      const svc = new DashboardService(app);

      mockPrisma.report.findFirst.mockResolvedValue({
        id: 201,
        project_id: 1,
        name: '核心转化趋势',
        type: 'chart',
        chart_type: 'bar',
        query_config: { dimensions: ['dt'] },
      });

      const result = await svc.executeReportData(201, 1);

      expect(result).not.toBeNull();
      expect(result?.report_id).toBe(201);
      expect(result?.data.kind).toBe('chart_data');
      expect(result?.data.series[0].name).toBe('核心转化趋势');
      expect(result?.data.summary.total).toBeGreaterThan(0);
    });

    it('绑定语义层指标卡 (semantic_metric) 执行语义编译聚合', async () => {
      const svc = new DashboardService(app);

      mockPrisma.report.findFirst.mockResolvedValue({
        id: 202,
        project_id: 1,
        name: 'DAU 指标大卡',
        type: 'metric',
        chart_type: 'number',
        query_config: { metric_ids: [1] },
      });

      mockPrisma.metric.findMany.mockResolvedValue([
        {
          id: 1,
          project_id: 1,
          name: 'dau',
          display_name: '日活跃用户',
          formula: { type: 'simple', agg_type: 'uv' },
          status: 1,
        },
      ]);

      const result = await svc.executeReportData(202, 1);

      expect(result).not.toBeNull();
      expect(result?.report_id).toBe(202);
      expect(result?.data.kind).toBe('semantic_metric');
      expect(result?.data.metrics).toBeDefined();
    });

    it('IDOR 隔离：跨项目请求报表数据返回 null', async () => {
      const svc = new DashboardService(app);
      mockPrisma.report.findFirst.mockResolvedValue(null);

      const result = await svc.executeReportData(999, 1);
      expect(result).toBeNull();
    });
  });

  describe('REST API 集成链路', () => {
    const token = () => app.jwt.sign({ userId: '1', tenantId: '1', role: 'admin' });

    it('POST /api/warnings/:id/check 成功触发检查并返回诊断', async () => {
      mockPrisma.warning.findFirst.mockResolvedValue({
        id: 5,
        project_id: 1,
        name: '用户波动预警',
        monitor_rules: { metric: 'dau', operator: '>', value: 100, current_value: 300 },
      });
      mockPrisma.warningLog.create.mockResolvedValue({ id: 888 });

      const res = await app.inject({
        method: 'POST',
        url: '/api/warnings/5/check',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.code).toBe(200);
      expect(body.data.triggered).toBe(true);
      expect(body.data.metric_value).toBe(300);
    });

    it('POST /api/dashboards/reports/:id/query 执行报表数据查询', async () => {
      mockPrisma.report.findFirst.mockResolvedValue({
        id: 88,
        project_id: 1,
        name: '渠道分布折线图',
        type: 'chart',
        chart_type: 'line',
        query_config: {},
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/dashboards/reports/88/query',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.code).toBe(200);
      expect(body.data.report_name).toBe('渠道分布折线图');
      expect(body.data.data.kind).toBe('chart_data');
    });
  });
});
