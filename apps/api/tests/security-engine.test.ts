import { buildApp } from '@/app';
import { SecurityService, maskSensitiveData } from '@/modules/security/service';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Enterprise Security & GDPR Compliance Engine', () => {
  let app: FastifyInstance;

  const mockPrisma = {
    project: {
      findFirst: vi.fn(),
    },
    userProjectRole: {
      findUnique: vi.fn(),
    },
    dataTable: {
      count: vi.fn(),
    },
    dataset: {
      count: vi.fn(),
    },
    metric: {
      count: vi.fn(),
    },
    dashboard: {
      count: vi.fn(),
    },
    userTag: {
      deleteMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
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

  const token = () =>
    app.jwt.sign({
      userId: '1',
      tenantId: '1',
      role: 'admin',
    });

  // ─── 1. 动态敏感数据脱敏规则测试 ───
  describe('Data Masking Policies (多维敏感信息脱敏算法)', () => {
    it('手机号规范脱敏 (保留前三后四)', () => {
      expect(maskSensitiveData('13812345678', 'phone')).toBe('138****5678');
      expect(maskSensitiveData('18688889999', 'phone')).toBe('186****9999');
    });

    it('邮箱规范脱敏 (保留前两位与域名)', () => {
      expect(maskSensitiveData('alex@company.com', 'email')).toBe('al***@company.com');
      expect(maskSensitiveData('service@alldata.io', 'email')).toBe('se***@alldata.io');
    });

    it('身份证、姓名、银行卡与 IP 地址脱敏', () => {
      expect(maskSensitiveData('110101199003072345', 'id_card')).toBe('110101********2345');
      expect(maskSensitiveData('张小凡', 'name')).toBe('张*凡');
      expect(maskSensitiveData('李明', 'name')).toBe('李*');
      expect(maskSensitiveData('6222021234567890123', 'bank_card')).toBe('6222********0123');
      expect(maskSensitiveData('192.168.1.100', 'ip_address')).toBe('192.168.*.*');
    });
  });

  // ─── 2. 服务层真实血缘与 GDPR 遗忘擦除 ───
  describe('SecurityService (真实数据血缘与 GDPR 物理擦除存证)', () => {
    let service: SecurityService;

    beforeEach(() => {
      service = new SecurityService(app);
    });

    it('getProjectDataLineage 基于真实实体统计生成血缘节点 (无随机数伪造)', async () => {
      mockPrisma.dataTable.count.mockResolvedValue(5);
      mockPrisma.dataset.count.mockResolvedValue(3);
      mockPrisma.metric.count.mockResolvedValue(8);
      mockPrisma.dashboard.count.mockResolvedValue(2);

      const lineage = await service.getProjectDataLineage(1);

      expect(lineage.nodes).toHaveLength(6);
      const tableNode = lineage.nodes.find((n) => n.id === 'node_datatables');
      expect(tableNode?.record_count).toBe(5);

      const metricNode = lineage.nodes.find((n) => n.id === 'node_metrics');
      expect(metricNode?.record_count).toBe(8);

      expect(lineage.edges.length).toBeGreaterThan(0);
    });

    it('executeGDPRForget 执行物理擦除并在 AuditLog 中存证', async () => {
      mockPrisma.userTag.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.auditLog.create.mockResolvedValue({
        id: 99,
        created_at: new Date('2026-11-21T12:00:00Z'),
      });

      const res = await service.executeGDPRForget('user_abc123', 1, 1, '127.0.0.1', 'Vitest');

      expect(res.success).toBe(true);
      expect(res.purged_distinct_id).toBe('user_abc123');
      expect(res.purged_postgres_records).toBe(2);
      expect(res.audit_log_id).toBe(99);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            project_id: 1,
            action: 'DELETE',
            resource: 'gdpr_forget',
            detail: expect.objectContaining({
              distinct_id: 'user_abc123',
            }),
          }),
        }),
      );
    });

    it('getGDPRHistory 仅返回当前租户所属的擦除存证档案 (IDOR 防护)', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: 99,
          user_id: 1,
          project_id: 1,
          action: 'DELETE',
          resource: 'gdpr_forget',
          detail: { distinct_id: 'user_abc123', purged_clickhouse_records: 10 },
          created_at: new Date('2026-11-21T12:00:00Z'),
        },
      ]);

      const history = await service.getGDPRHistory(1);

      expect(history).toHaveLength(1);
      expect(history[0].distinct_id).toBe('user_abc123');
      expect(history[0].purged_records).toBe(10);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            project_id: 1,
            resource: 'gdpr_forget',
          }),
        }),
      );
    });
  });

  // ─── 3. REST API 鉴权与租户隔离测试 ───
  describe('Fastify REST API (鉴权与 IDOR 拦截)', () => {
    it('GET /api/security/lineage 响应真实血缘数据', async () => {
      mockPrisma.dataTable.count.mockResolvedValue(1);
      mockPrisma.dataset.count.mockResolvedValue(1);
      mockPrisma.metric.count.mockResolvedValue(1);
      mockPrisma.dashboard.count.mockResolvedValue(1);

      const res = await app.inject({
        method: 'GET',
        url: '/api/security/lineage',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.nodes.length).toBeGreaterThan(0);
    });

    it('POST /api/security/gdpr/forget 成功物理擦除并返回存证', async () => {
      mockPrisma.userTag.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.auditLog.create.mockResolvedValue({
        id: 101,
        created_at: new Date(),
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/security/gdpr/forget',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
        payload: {
          distinct_id: 'user_test_999',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.purged_distinct_id).toBe('user_test_999');
    });

    it('POST /api/security/masking/preview 成功返回字段脱敏比对结果', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/security/masking/preview',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
        payload: {
          payload: { phone: '13812345678', email: 'alex@company.com' },
          rules: { phone: 'phone', email: 'email' },
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.phone.masked).toBe('138****5678');
      expect(data.email.masked).toBe('al***@company.com');
    });

    it('缺失 project-id 请求头访问安全接口被 400 拦截', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/security/lineage',
        headers: {
          authorization: `Bearer ${token()}`,
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('非项目成员访问安全中心接口被 403 权限守卫拒绝', async () => {
      mockPrisma.userProjectRole.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/api/security/lineage',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '99',
        },
      });

      expect(res.statusCode).toBe(403);
    });
  });
});
