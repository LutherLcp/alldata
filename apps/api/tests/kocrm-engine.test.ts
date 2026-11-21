import { buildApp } from '@/app';
import { KocrmService } from '@/modules/kocrm/service';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

describe('KoCRM Creator Matrix & Social Influence Engine', () => {
  let app: FastifyInstance;

  const mockPrisma = {
    project: {
      findFirst: vi.fn(),
    },
    userProjectRole: {
      findUnique: vi.fn(),
    },
    kocrmAccount: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    kocrmCreator: {
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

  describe('KocrmService (业务层与租户 IDOR 隔离)', () => {
    let service: KocrmService;

    beforeEach(() => {
      service = new KocrmService(app);
    });

    it('Account CRUD 能够正确按 project_id 隔离，防止跨租户越权', async () => {
      mockPrisma.kocrmAccount.findMany.mockResolvedValue([
        { id: 1, project_id: 1, account_name: '抖音官方号' },
      ]);
      const list = await service.listAccounts(1);
      expect(list).toHaveLength(1);
      expect(mockPrisma.kocrmAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { project_id: 1 } }),
      );

      // 更新账号：租户不匹配时返回 null
      mockPrisma.kocrmAccount.findFirst.mockResolvedValue(null);
      const updateDenied = await service.updateAccount(1, 2, { account_name: '黑客修改' });
      expect(updateDenied).toBeNull();

      // 更新账号：租户匹配时成功
      mockPrisma.kocrmAccount.findFirst.mockResolvedValue({ id: 1, project_id: 1 });
      mockPrisma.kocrmAccount.update.mockResolvedValue({ id: 1, account_name: '抖音官方号V2' });
      const updateOk = await service.updateAccount(1, 1, { account_name: '抖音官方号V2' });
      expect(updateOk?.account_name).toBe('抖音官方号V2');

      // 删除账号：跨租户删除被阻止
      mockPrisma.kocrmAccount.findFirst.mockResolvedValue(null);
      const deleteDenied = await service.deleteAccount(1, 2);
      expect(deleteDenied).toBe(false);
    });

    it('Creator CRUD 能够正确按 project_id 隔离', async () => {
      mockPrisma.kocrmCreator.create.mockResolvedValue({
        id: 10,
        project_id: 1,
        name: '头部美妆博主',
        followers: 1200000,
      });

      const created = await service.createCreator({
        project_id: 1,
        platform: '抖音',
        name: '头部美妆博主',
        uid: 'UID_9988',
        followers: 1200000,
      });
      expect(created.name).toBe('头部美妆博主');

      // 跨项目删除
      mockPrisma.kocrmCreator.findFirst.mockResolvedValue(null);
      const deleteDenied = await service.deleteCreator(10, 2);
      expect(deleteDenied).toBe(false);
    });

    it('calculateCreatorInfluence 能够精准计算粉丝量级、平台加权与 S/A/B/C 评级', async () => {
      // 头部百万抖音博主 -> S 级
      mockPrisma.kocrmCreator.findFirst.mockResolvedValue({
        id: 100,
        project_id: 1,
        platform: '抖音',
        name: '顶流达人',
        followers: 1500000,
        meta: {},
      });
      mockPrisma.kocrmCreator.update.mockImplementation(async ({ data }) => ({
        id: 100,
        ...data,
      }));

      const resS = await service.calculateCreatorInfluence(100, 1);
      expect(resS).toBeDefined();
      expect(resS?.influence.tier).toBe('S');
      expect(resS?.influence.score).toBeGreaterThanOrEqual(95);

      // 腰部小红书达人 (50k 粉丝) -> B 级
      mockPrisma.kocrmCreator.findFirst.mockResolvedValue({
        id: 101,
        project_id: 1,
        platform: '小红书',
        name: '种草小能手',
        followers: 50000,
        meta: {},
      });

      const resB = await service.calculateCreatorInfluence(101, 1);
      expect(resB?.influence.tier).toBe('B');
      expect(resB?.influence.score).toBe(67); // 65 + 2
    });
  });

  describe('REST API 路由与安全保护 (Fastify Integration)', () => {
    const token = () => app.jwt.sign({ userId: '1', tenantId: '1', role: 'admin' });

    it('GET /api/kocrm/accounts 正常返回项目关联账户', async () => {
      mockPrisma.kocrmAccount.findMany.mockResolvedValue([{ id: 1, account_name: '快手官方店' }]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/kocrm/accounts',
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

    it('POST /api/kocrm/accounts 能够创建并执行参数校验', async () => {
      // 缺少必填字段
      const badRes = await app.inject({
        method: 'POST',
        url: '/api/kocrm/accounts',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
        payload: { platform: '抖音' },
      });
      expect(badRes.statusCode).toBe(400);

      // 正常创建
      mockPrisma.kocrmAccount.create.mockResolvedValue({
        id: 5,
        account_name: '微博资讯号',
      });
      const goodRes = await app.inject({
        method: 'POST',
        url: '/api/kocrm/accounts',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
        payload: {
          platform: '微博',
          account_name: '微博资讯号',
        },
      });
      expect(goodRes.statusCode).toBe(201);
    });

    it('POST /api/kocrm/creators/:id/influence 执行影响力评估', async () => {
      mockPrisma.kocrmCreator.findFirst.mockResolvedValue({
        id: 30,
        project_id: 1,
        platform: '抖音',
        followers: 800000,
        meta: {},
      });
      mockPrisma.kocrmCreator.update.mockResolvedValue({ id: 30 });

      const res = await app.inject({
        method: 'POST',
        url: '/api/kocrm/creators/30/influence',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.influence.tier).toBe('S');
    });

    it('IDOR 鉴权防护: 无权限用户请求应被拦截 403', async () => {
      mockPrisma.userProjectRole.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/api/kocrm/accounts',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '999',
        },
      });
      expect(res.statusCode).toBe(403);
    });
  });
});
