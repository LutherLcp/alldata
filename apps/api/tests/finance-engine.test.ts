import { buildApp } from '@/app';
import { FinanceService } from '@/modules/finance/service';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Finance Revenue Share & Reconciliation Engine', () => {
  let app: FastifyInstance;

  const mockPrisma = {
    financeSupplier: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    financeShareRatio: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    financeReconciliation: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
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
  });

  describe('FinanceService (业务服务层与自动结算核算)', () => {
    let service: FinanceService;

    beforeEach(() => {
      service = new FinanceService(app);
    });

    it('listSuppliers, createSupplier, updateSupplier, deleteSupplier 正常调用 Prisma', async () => {
      mockPrisma.financeSupplier.findMany.mockResolvedValue([
        { id: 1, supplier_name: '米哈游科技' },
      ]);
      mockPrisma.financeSupplier.create.mockResolvedValue({
        id: 2,
        supplier_name: '网易互动娱乐',
      });
      mockPrisma.financeSupplier.update.mockResolvedValue({
        id: 2,
        supplier_name: '网易雷火',
      });
      mockPrisma.financeSupplier.delete.mockResolvedValue({ id: 2 });

      const list = await service.listSuppliers();
      expect(list).toHaveLength(1);
      expect(list[0].supplier_name).toBe('米哈游科技');

      const created = await service.createSupplier({ supplier_name: '网易互动娱乐' });
      expect(created.id).toBe(2);

      const updated = await service.updateSupplier(2, { supplier_name: '网易雷火' });
      expect(updated.supplier_name).toBe('网易雷火');

      const deleted = await service.deleteSupplier(2);
      expect(deleted.id).toBe(2);
    });

    it('settleReconciliation 能够根据供应商与平台分成比例准确计算结算金', async () => {
      mockPrisma.financeReconciliation.findUnique.mockResolvedValue({
        id: 10,
        supplier_id: 1,
        platform: '抖音',
        game: '原神',
        period: '2026-07',
        status: 1,
        meta: { gross_revenue: 200000.0 },
      });

      mockPrisma.financeShareRatio.findFirst.mockResolvedValue({
        id: 5,
        supplier_id: 1,
        platform: '抖音',
        ratio: 40.0, // 40% 分成
        status: 1,
      });

      mockPrisma.financeReconciliation.update.mockImplementation(async ({ data }) => ({
        id: 10,
        ...data,
      }));

      const settlement = await service.settleReconciliation(10);
      expect(settlement).toBeDefined();
      expect(settlement?.gross_revenue).toBe(200000.0);
      expect(settlement?.share_ratio).toBe(40.0);
      expect(settlement?.supplier_amount).toBe(80000.0); // 200000 * 0.4
      expect(settlement?.platform_amount).toBe(120000.0); // 200000 - 80000
      expect(settlement?.status).toBe('settled');

      expect(mockPrisma.financeReconciliation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 10 },
          data: expect.objectContaining({ status: 2 }),
        }),
      );
    });

    it('exportReport 统计真实行数且无任何伪造数据', async () => {
      mockPrisma.financeSupplier.count.mockResolvedValue(12);
      mockPrisma.financeShareRatio.count.mockResolvedValue(25);
      mockPrisma.financeReconciliation.count.mockResolvedValue(48);

      const resSupplier = await service.exportReport('supplier');
      expect(resSupplier.rows).toBe(12);

      const resAll = await service.exportReport('summary');
      expect(resAll.rows).toBe(12 + 25 + 48);
    });
  });

  describe('REST API 路由与鉴权保护 (Fastify Integration)', () => {
    const token = () => app.jwt.sign({ userId: '1', tenantId: '1', role: 'admin' });

    it('未授权请求应被拦截 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/finance/suppliers',
      });
      expect(res.statusCode).toBe(401);
    });

    it('GET /api/finance/suppliers 带 token 正常返回供应商列表', async () => {
      mockPrisma.financeSupplier.findMany.mockResolvedValue([
        { id: 1, supplier_name: '测试供应商' },
      ]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/finance/suppliers',
        headers: {
          authorization: `Bearer ${token()}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.code).toBe(200);
      expect(json.data).toHaveLength(1);
    });

    it('POST /api/finance/suppliers 参数校验', async () => {
      // 缺少 supplier_name
      const badRes = await app.inject({
        method: 'POST',
        url: '/api/finance/suppliers',
        headers: {
          authorization: `Bearer ${token()}`,
        },
        payload: {},
      });
      expect(badRes.statusCode).toBe(400);

      // 正常创建
      mockPrisma.financeSupplier.create.mockResolvedValue({ id: 8, supplier_name: '鹰角网络' });
      const goodRes = await app.inject({
        method: 'POST',
        url: '/api/finance/suppliers',
        headers: {
          authorization: `Bearer ${token()}`,
        },
        payload: { supplier_name: '鹰角网络' },
      });
      expect(goodRes.statusCode).toBe(201);
    });

    it('POST /api/finance/reconciliations/:id/settle 执行一键核算', async () => {
      mockPrisma.financeReconciliation.findUnique.mockResolvedValue({
        id: 20,
        supplier_id: 2,
        platform: '快手',
        game: '明日方舟',
        period: '2026-08',
        meta: { gross_revenue: 150000.0 },
      });
      mockPrisma.financeShareRatio.findFirst.mockResolvedValue({
        supplier_id: 2,
        platform: '快手',
        ratio: 35.0,
      });
      mockPrisma.financeReconciliation.update.mockResolvedValue({ id: 20, status: 2 });

      const res = await app.inject({
        method: 'POST',
        url: '/api/finance/reconciliations/20/settle',
        headers: {
          authorization: `Bearer ${token()}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.code).toBe(200);
      expect(json.data.supplier_amount).toBe(52500.0); // 150000 * 0.35
    });

    it('POST /api/finance/export 导出生成报表', async () => {
      mockPrisma.financeSupplier.count.mockResolvedValue(10);

      const res = await app.inject({
        method: 'POST',
        url: '/api/finance/export',
        headers: {
          authorization: `Bearer ${token()}`,
        },
        payload: { type: 'supplier' },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.exported).toBe(true);
      expect(json.data.rows).toBe(10);
    });
  });
});
