import { buildApp } from '@/app';
import { SubscriptionService } from '@/modules/subscription/service';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Scheduled Subscription & Notification Delivery Engine', () => {
  let app: FastifyInstance;

  const mockPrisma = {
    project: {
      findFirst: vi.fn(),
    },
    userProjectRole: {
      findUnique: vi.fn(),
    },
    subscription: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    pushConfig: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
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

  // ─── 1. 服务层业务逻辑与多渠道分发测试 ───
  describe('SubscriptionService (租户隔离与报表分发)', () => {
    let service: SubscriptionService;

    beforeEach(() => {
      service = new SubscriptionService(app);
    });

    it('listSubscriptions 能够严格按 project_id 隔离检索', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([
        { id: 1, project_id: 1, name: '晨报推送', schedule_cron: '0 9 * * *' },
      ]);

      const list = await service.listSubscriptions(1);
      expect(list).toHaveLength(1);
      expect(mockPrisma.subscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { project_id: 1 },
        }),
      );
    });

    it('update 与 delete 具备严格的租户 IDOR 隔离防护', async () => {
      // 跨项目更新返回 null
      mockPrisma.subscription.updateMany.mockResolvedValue({ count: 0 });
      const updateDenied = await service.updateSubscription(1, 2, { name: '非法改名' });
      expect(updateDenied).toBeNull();

      // 跨项目删除返回 false
      mockPrisma.subscription.deleteMany.mockResolvedValue({ count: 0 });
      const deleteDenied = await service.deleteSubscription(1, 2);
      expect(deleteDenied).toBe(false);

      // 同项目删除成功
      mockPrisma.subscription.deleteMany.mockResolvedValue({ count: 1 });
      const deleteOk = await service.deleteSubscription(1, 1);
      expect(deleteOk).toBe(true);
    });

    it('triggerSend 能够针对飞书、邮件多渠道生成定制化报告分发负载', async () => {
      // 飞书渠道
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: 1,
        project_id: 1,
        name: 'CEO 每日核心指标大盘',
        entity_type: 'dashboard',
        entity_id: 101,
        notify_type: 'feishu',
        notify_config: { webhook_url: 'https://open.feishu.cn/hook/xxx' },
        schedule_cron: '0 8 * * *',
      });

      const feishuDispatch = await service.triggerSend(1, 1);
      expect(feishuDispatch?.sent).toBe(true);
      expect(feishuDispatch?.channel).toBe('feishu');
      expect(feishuDispatch?.payload_preview?.msg_type).toBe('interactive');
      expect(feishuDispatch?.payload_preview?.card?.header?.title?.content).toContain(
        'CEO 每日核心指标大盘',
      );

      // 邮件渠道
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: 2,
        project_id: 1,
        name: '周度运营日报',
        entity_type: 'report',
        entity_id: 202,
        notify_type: 'email',
        notify_config: { recipients: ['ceo@company.com', 'cfo@company.com'] },
        schedule_cron: '0 10 * * 1',
      });

      const emailDispatch = await service.triggerSend(2, 1);
      expect(emailDispatch?.sent).toBe(true);
      expect(emailDispatch?.channel).toBe('email');
      expect(emailDispatch?.recipients_count).toBe(2);
      expect(emailDispatch?.payload_preview?.recipients).toContain('ceo@company.com');
    });

    it('getSubscriptionSummary 能够正确汇总活跃订阅与渠道占比', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([
        { id: 1, notify_type: 'feishu', entity_type: 'dashboard', status: 1 },
        { id: 2, notify_type: 'email', entity_type: 'report', status: 1 },
        { id: 3, notify_type: 'feishu', entity_type: 'dashboard', status: 2 },
      ]);

      const summary = await service.getSubscriptionSummary(1);
      expect(summary.total).toBe(3);
      expect(summary.active).toBe(2);
      expect(summary.channels.feishu).toBe(2);
      expect(summary.channels.email).toBe(1);
      expect(summary.entity_breakdown.dashboard).toBe(2);
    });
  });

  // ─── 2. REST API 鉴权与租户隔离测试 ───
  describe('Fastify REST API (鉴权与 IDOR 拦截)', () => {
    it('GET /api/subscriptions/subscriptions 成功返回列表', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/subscriptions/subscriptions',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toEqual([]);
    });

    it('POST /api/subscriptions/subscriptions 成功创建订阅', async () => {
      mockPrisma.subscription.create.mockResolvedValue({
        id: 1,
        name: '月度经营分析',
        schedule_cron: '0 0 1 * *',
        notify_type: 'email',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/subscriptions/subscriptions',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
        payload: {
          name: '月度经营分析',
          schedule_cron: '0 0 1 * *',
          notify_type: 'email',
        },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().data.name).toBe('月度经营分析');
    });

    it('POST /api/subscriptions/subscriptions/:id/send 跨项目调用被拦截 (404)', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);

      const res = await app.inject({
        method: 'POST',
        url: '/api/subscriptions/subscriptions/999/send',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
      });

      expect(res.statusCode).toBe(404);
    });

    it('缺失 project-id 请求头访问订阅接口被 400 拦截', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/subscriptions/subscriptions',
        headers: {
          authorization: `Bearer ${token()}`,
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('非项目成员访问订阅接口被 403 权限守卫拒绝', async () => {
      mockPrisma.userProjectRole.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/api/subscriptions/subscriptions',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '99',
        },
      });

      expect(res.statusCode).toBe(403);
    });
  });
});
