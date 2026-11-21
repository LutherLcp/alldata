import { buildApp } from '@/app';
import {
  buildLineageGraph,
  getImpactAnalysis,
  getUpstreamProvenance,
} from '@/modules/data_asset/lineage';
import {
  calculateProjectQualityOverview,
  calculateTableQuality,
} from '@/modules/data_asset/quality';
import { DataAssetService } from '@/modules/data_asset/service';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Data Asset Quality & Lineage Graph Engine', () => {
  let app: FastifyInstance;

  const mockPrisma = {
    project: {
      findFirst: vi.fn(),
    },
    userProjectRole: {
      findUnique: vi.fn(),
    },
    dataTable: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    dataTableColumn: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    dataset: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    metric: {
      findMany: vi.fn(),
    },
    dashboard: {
      findMany: vi.fn(),
    },
    warning: {
      findMany: vi.fn(),
    },
    attribute: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
    category: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
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

  const token = () =>
    app.jwt.sign({
      userId: '1',
      tenantId: '1',
      role: 'admin',
    });

  // ─── 1. 数据质量巡检纯算法测试 (Zero-Fake-Data) ───
  describe('Data Quality Profiler Engine (确定性算法与零伪造数据)', () => {
    const fixedNow = new Date('2026-11-21T12:00:00Z');

    it('标准高优数据表获得高健康分 (Grade A/A+)', () => {
      const table = {
        id: 1,
        name: 'ods_orders',
        display_name: '订单明细表',
        type: 'event',
        row_count: 50000,
        updated_at: new Date('2026-11-21T08:00:00Z'), // 4 小时前
      };
      const columns = [
        {
          id: 1,
          name: 'order_id',
          display_name: '订单编号',
          data_type: 'varchar',
          is_dimension: true,
          description: '主键唯一标识',
        },
        {
          id: 2,
          name: 'pay_amount',
          display_name: '实付金额',
          data_type: 'decimal',
          is_dimension: false,
          description: '单位元',
        },
        {
          id: 3,
          name: 'created_time',
          display_name: '下单时间',
          data_type: 'datetime',
          is_dimension: true,
          description: '时间戳',
        },
      ];

      const profile = calculateTableQuality(table, columns, fixedNow);

      expect(profile.healthScore).toBeGreaterThanOrEqual(90);
      expect(profile.grade).toBe('A+');
      expect(profile.completenessScore).toBe(100);
      expect(profile.freshnessScore).toBe(100);
      expect(profile.anomalies).toHaveLength(0);
      expect(profile.columns.every((c) => c.qualityStatus === 'GOOD')).toBe(true);
    });

    it('空表、缺失字段说明及长期未维护表准确降级并报告异常', () => {
      const staleTable = {
        id: 2,
        name: 'legacy_data',
        display_name: null,
        type: 'upload',
        row_count: 0,
        updated_at: new Date('2026-06-01T00:00:00Z'), // 超过 150 天
      };
      const poorColumns = [
        {
          id: 10,
          name: 'raw_col_1',
          display_name: null,
          data_type: 'varchar',
          is_dimension: false,
          description: null,
        },
      ];

      const profile = calculateTableQuality(staleTable, poorColumns, fixedNow);

      expect(profile.healthScore).toBeLessThan(70);
      expect(['C', 'D']).toContain(profile.grade);
      expect(profile.anomalies.some((a) => a.includes('数据表行数为 0'))).toBe(true);
      expect(profile.anomalies.some((a) => a.includes('缺少中文业务描述'))).toBe(true);
      expect(profile.anomalies.some((a) => a.includes('未更新'))).toBe(true);
    });

    it('项目级数据质量概况聚合计算准确无误', () => {
      const tables = [
        {
          id: 1,
          name: 't1',
          display_name: '表一',
          type: 'event',
          row_count: 100,
          updated_at: fixedNow,
          columns: [
            {
              id: 1,
              name: 'id',
              display_name: '主键',
              data_type: 'int',
              is_dimension: true,
              description: '主键',
            },
          ],
        },
        {
          id: 2,
          name: 't2',
          display_name: '表二',
          type: 'user',
          row_count: 0,
          updated_at: fixedNow,
          columns: [
            {
              id: 2,
              name: 'col',
              display_name: null,
              data_type: 'unknown_type',
              is_dimension: false,
              description: null,
            },
          ],
        },
      ];

      const overview = calculateProjectQualityOverview(1, tables, fixedNow);

      expect(overview.totalTables).toBe(2);
      expect(overview.totalColumns).toBe(2);
      expect(overview.avgHealthScore).toBeGreaterThan(0);
      expect(overview.tables).toHaveLength(2);
      expect(overview.topAnomalies.length).toBeGreaterThan(0);
    });
  });

  // ─── 2. 全链路血缘图谱与影响面分析测试 ───
  describe('Data Lineage & Impact Analysis Engine (血缘图与爆炸半径)', () => {
    const mockGraphData = {
      tables: [{ id: 101, name: 'ods_events', display_name: '全站事件流水表', type: 'event' }],
      datasets: [
        {
          id: 201,
          name: 'dwd_user_clicks',
          display_name: '用户点击明细',
          type: 'sql',
          sql_content: 'SELECT * FROM ods_events WHERE event = "click"',
        },
      ],
      metrics: [
        {
          id: 301,
          name: 'daily_pv',
          display_name: '日均浏览量',
          formula: { type: 'count' },
          category_id: 1,
        },
      ],
      dashboards: [
        {
          id: 401,
          name: 'CEO 核心经营看板',
          description: '公司核心大盘',
          reports: [{ id: 501, name: 'PV 趋势卡片' }],
        },
      ],
      warnings: [
        {
          id: 601,
          name: 'PV 跌幅超 20% 监控预警',
          status: 1,
        },
      ],
    };

    it('正确生成拓扑连通的血缘图 (Nodes & Edges)', () => {
      const graph = buildLineageGraph(mockGraphData);

      expect(graph.nodes).toHaveLength(5);
      expect(graph.summary.tableCount).toBe(1);
      expect(graph.summary.datasetCount).toBe(1);
      expect(graph.summary.metricCount).toBe(1);
      expect(graph.summary.dashboardCount).toBe(1);
      expect(graph.summary.warningCount).toBe(1);

      // 验证边类型
      const edgeTypes = graph.edges.map((e) => e.type);
      expect(edgeTypes).toContain('EXTRACTS_FROM');
      expect(edgeTypes).toContain('CALCULATES');
      expect(edgeTypes).toContain('DISPLAYS');
      expect(edgeTypes).toContain('ALERTS_ON');
    });

    it('向下影响面分析能够沿着血缘链追踪到所有下游波及资产并评估风险', () => {
      const graph = buildLineageGraph(mockGraphData);
      const impact = getImpactAnalysis(graph, 'table-101');

      expect(impact.targetNode.id).toBe('table-101');
      expect(impact.summary.totalImpacted).toBeGreaterThanOrEqual(3);
      expect(impact.summary.affectedDashboards).toBe(1);
      expect(impact.summary.affectedWarnings).toBe(1);
      expect(['HIGH', 'CRITICAL', 'MEDIUM']).toContain(impact.summary.riskLevel);
      expect(impact.impactedNodes.some((item) => item.node.type === 'DASHBOARD')).toBe(true);
    });

    it('向上溯源能够从最下游的看板或预警反查到根源数据表', () => {
      const graph = buildLineageGraph(mockGraphData);
      const prov = getUpstreamProvenance(graph, 'dashboard-401');

      expect(prov.targetNode.id).toBe('dashboard-401');
      expect(prov.summary.totalUpstream).toBeGreaterThanOrEqual(1);
      expect(prov.upstreamNodes.some((item) => item.node.type === 'TABLE')).toBe(true);
    });
  });

  // ─── 3. 服务层与 API 接口多租户 IDOR 隔离测试 ───
  describe('DataAssetService & API Routes (多租户安全与 HTTP 接口)', () => {
    let service: DataAssetService;

    beforeEach(() => {
      service = new DataAssetService(app);
    });

    it('质量巡检 API GET /api/assets/quality/overview 成功返回数据', async () => {
      mockPrisma.dataTable.findMany.mockResolvedValue([
        {
          id: 1,
          project_id: 1,
          name: 'ods_orders',
          display_name: '订单表',
          type: 'event',
          row_count: 100,
          updated_at: new Date(),
          columns: [
            {
              id: 1,
              name: 'id',
              display_name: 'ID',
              data_type: 'int',
              is_dimension: true,
              description: '主键',
            },
          ],
        },
      ]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/assets/quality/overview',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.totalTables).toBe(1);
      expect(json.data.avgHealthScore).toBeGreaterThanOrEqual(90);
    });

    it('单表质量查询具备 IDOR 隔离，非本租户返回 404', async () => {
      mockPrisma.dataTable.findFirst.mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/api/assets/quality/tables/999',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
      });

      expect(res.statusCode).toBe(404);
    });

    it('血缘图谱与影响面分析接口正常响应', async () => {
      mockPrisma.dataTable.findMany.mockResolvedValue([
        { id: 1, name: 't1', display_name: '表1', type: 'event', row_count: 10 },
      ]);
      mockPrisma.dataset.findMany.mockResolvedValue([]);
      mockPrisma.metric.findMany.mockResolvedValue([]);
      mockPrisma.dashboard.findMany.mockResolvedValue([]);
      mockPrisma.warning.findMany.mockResolvedValue([]);

      const graphRes = await app.inject({
        method: 'GET',
        url: '/api/assets/lineage',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
      });

      expect(graphRes.statusCode).toBe(200);
      const graphData = graphRes.json().data;
      expect(graphData.nodes).toHaveLength(1);

      const impactRes = await app.inject({
        method: 'GET',
        url: '/api/assets/lineage/impact?node_id=table-1',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
      });

      expect(impactRes.statusCode).toBe(200);
      expect(impactRes.json().data.targetNode.id).toBe('table-1');
    });

    it('未提供 project-id 头时，访问质量或血缘接口被拦截 (400)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/assets/lineage',
        headers: {
          authorization: `Bearer ${token()}`,
        },
      });

      expect(res.statusCode).toBe(400);
    });
  });
});
