import { buildApp } from '@/app';
import {
  MARKETPLACE_CATALOG,
  MarketplaceService,
  generateSDKBundle,
} from '@/modules/marketplace/service';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Marketplace Plugin Registry & SDK Factory Engine', () => {
  let app: FastifyInstance;

  const mockPrisma = {
    project: {
      findFirst: vi.fn(),
    },
    userProjectRole: {
      findUnique: vi.fn(),
    },
    pushConfig: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
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

  // ─── 1. SDK 动态编译工厂测试 ───
  describe('SDK Factory (多端轻量代码编译引擎)', () => {
    it('正确编译生成 Web JavaScript SDK 产物 (小于 10KB)', () => {
      const bundle = generateSDKBundle({
        platform: 'web_js',
        enable_auto_pv: true,
        enable_auto_click: true,
        enable_encrypt: false,
        enable_beacon: true,
        batch_interval_ms: 3000,
        batch_max_size: 10,
      });

      expect(bundle.fileName).toBe('alldata-sdk-web_js.min.js');
      expect(bundle.bundleSizeKB).toBeLessThan(10);
      expect(bundle.code).toContain('AllDataTracker');
      expect(bundle.code).toContain('$pageview');
      expect(bundle.code).toContain('$click');
    });

    it('支持微信小程序与移动原生端 (WeChat, iOS Swift, Android Kotlin) 代码生成', () => {
      const wechat = generateSDKBundle({
        platform: 'wechat_mp',
        enable_auto_pv: true,
        enable_auto_click: false,
        enable_encrypt: false,
        enable_beacon: false,
        batch_interval_ms: 2000,
        batch_max_size: 5,
      });
      expect(wechat.code).toContain('wx.request');

      const swift = generateSDKBundle({
        platform: 'ios_swift',
        enable_auto_pv: true,
        enable_auto_click: false,
        enable_encrypt: false,
        enable_beacon: false,
        batch_interval_ms: 5000,
        batch_max_size: 20,
      });
      expect(swift.code).toContain('import Foundation');

      const kotlin = generateSDKBundle({
        platform: 'android_kotlin',
        enable_auto_pv: true,
        enable_auto_click: false,
        enable_encrypt: false,
        enable_beacon: false,
        batch_interval_ms: 5000,
        batch_max_size: 20,
      });
      expect(kotlin.code).toContain('package io.alldata.tracker');
    });
  });

  // ─── 2. 服务层多租户插件管理与沙箱测试 ───
  describe('MarketplaceService (租户安装、配置与连通性测试)', () => {
    let service: MarketplaceService;

    beforeEach(() => {
      service = new MarketplaceService(app);
    });

    it('listPlugins 正确合并官方市场目录与项目安装状态', async () => {
      mockPrisma.pushConfig.findMany.mockResolvedValue([
        {
          id: 10,
          project_id: 1,
          entity_type: 'marketplace_plugin',
          push_type: 'plugin_feishu',
          name: '飞书/钉钉 异常预警机器人',
          status: 1,
          config: { webhook_url: 'https://open.feishu.cn/hook' },
          created_at: new Date('2026-08-01T00:00:00Z'),
        },
      ]);

      const list = await service.listPlugins(1);
      expect(list.length).toBe(MARKETPLACE_CATALOG.length);

      const feishu = list.find((p) => p.id === 'plugin_feishu');
      expect(feishu?.is_installed).toBe(true);
      expect(feishu?.status).toBe(1);
      expect(feishu?.config?.webhook_url).toBe('https://open.feishu.cn/hook');

      const uninstalled = list.find((p) => p.id === 'plugin_shopify');
      expect(uninstalled?.is_installed).toBe(false);
      expect(uninstalled?.status).toBe(2);
    });

    it('installPlugin 能够正确为当前项目创建或激活插件', async () => {
      mockPrisma.pushConfig.findFirst.mockResolvedValue(null);
      mockPrisma.pushConfig.create.mockResolvedValue({ id: 1 });
      mockPrisma.pushConfig.findMany.mockResolvedValue([
        {
          id: 1,
          project_id: 1,
          entity_type: 'marketplace_plugin',
          push_type: 'plugin_shopify',
          status: 1,
          config: { store_domain: 'shop.myshopify.com' },
          created_at: new Date(),
        },
      ]);

      const result = await service.installPlugin(1, 'plugin_shopify', 1, {
        store_domain: 'shop.myshopify.com',
      });

      expect(result?.is_installed).toBe(true);
      expect(mockPrisma.pushConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            project_id: 1,
            push_type: 'plugin_shopify',
            status: 1,
          }),
        }),
      );
    });

    it('testPlugin 能够执行确定性连通性测试并记录健康状态', async () => {
      mockPrisma.pushConfig.findFirst.mockResolvedValue({
        id: 1,
        project_id: 1,
        push_type: 'plugin_feishu',
        config: { webhook_url: 'https://open.feishu.cn/hook' },
      });
      mockPrisma.pushConfig.updateMany.mockResolvedValue({ count: 1 });

      const testRes = await service.testPlugin(1, 'plugin_feishu', { ping: true });

      expect(testRes?.success).toBe(true);
      expect(testRes?.latencyMs).toBeGreaterThan(0);
      expect(testRes?.echoPayload?.ping).toBe(true);
      expect(mockPrisma.pushConfig.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1, project_id: 1 },
          data: expect.objectContaining({
            config: expect.objectContaining({
              health_status: 'HEALTHY',
            }),
          }),
        }),
      );
    });

    it('uninstallPlugin 严格限制在当前项目边界内执行删除', async () => {
      mockPrisma.pushConfig.deleteMany.mockResolvedValue({ count: 1 });

      const removed = await service.uninstallPlugin(1, 'plugin_feishu');
      expect(removed).toBe(true);
      expect(mockPrisma.pushConfig.deleteMany).toHaveBeenCalledWith({
        where: {
          project_id: 1,
          entity_type: 'marketplace_plugin',
          push_type: 'plugin_feishu',
        },
      });
    });
  });

  // ─── 3. REST API 鉴权与多租户隔离测试 ───
  describe('Fastify REST API (鉴权与 IDOR 隔离)', () => {
    it('POST /api/marketplace/sdk/build 在线编译成功返回 200', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/marketplace/sdk/build',
        headers: {
          authorization: `Bearer ${token()}`,
        },
        payload: {
          platform: 'web_js',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.bundleSizeKB).toBeGreaterThan(0);
    });

    it('GET /api/marketplace/plugins 正确响应当前项目的插件列表', async () => {
      mockPrisma.pushConfig.findMany.mockResolvedValue([]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/marketplace/plugins',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
      });

      expect(res.statusCode).toBe(200);
      const plugins = res.json().data;
      expect(plugins.length).toBe(MARKETPLACE_CATALOG.length);
    });

    it('缺少 project-id 请求头访问插件接口被 400 拦截', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/marketplace/plugins',
        headers: {
          authorization: `Bearer ${token()}`,
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('非项目成员访问插件接口被 403 权限守卫拒绝', async () => {
      mockPrisma.userProjectRole.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/api/marketplace/plugins',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '99',
        },
      });

      expect(res.statusCode).toBe(403);
    });
  });
});
