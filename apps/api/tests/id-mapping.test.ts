import { buildApp } from '@/app';
import { IdMappingService } from '@/modules/tracking/id-mapping.service';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

describe('ID-Mapping & Identity Graph Engine', () => {
  let app: FastifyInstance;

  const mockPrisma = {
    project: {
      findFirst: vi.fn(),
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
    IdMappingService.clearCache();
    mockPrisma.project.findFirst.mockReset();
  });

  describe('IdMappingService (单元逻辑)', () => {
    it('正确记录并在内存中检索 anonymous_id 与 user_id 的映射', async () => {
      const svc = new IdMappingService();
      await svc.recordMapping(1, 'device_uuid_001', 9527);

      const resolved = await svc.resolveUserId(1, 'device_uuid_001');
      expect(resolved).toBe(9527);

      const unmapped = await svc.resolveUserId(1, 'unknown_device');
      expect(unmapped).toBeNull();
    });

    it('多设备绑定至同一用户可聚合生成 Identity Graph', async () => {
      const svc = new IdMappingService();
      await svc.recordMapping(1, 'device_phone_1', 8888);
      await svc.recordMapping(1, 'device_web_2', 8888);

      const graphByUser = await svc.getIdentityGraph(1, 8888);
      expect(graphByUser.project_id).toBe(1);
      expect(graphByUser.user_id).toBe(8888);
      expect(graphByUser.anonymous_ids).toContain('device_phone_1');
      expect(graphByUser.anonymous_ids).toContain('device_web_2');
      expect(graphByUser.total_devices).toBe(2);

      const graphByDevice = await svc.getIdentityGraph(1, 'device_phone_1');
      expect(graphByDevice.user_id).toBe(8888);
      expect(graphByDevice.anonymous_ids).toContain('device_phone_1');
    });
  });

  describe('API 端点与事件采集 ID 贯通集成', () => {
    it('接收 $identify 事件后能自动建立身份映射并通过 resolve 端点查询', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: 1, status: 1 });

      // 1. 发送 $identify 事件
      const collectRes = await app.inject({
        method: 'POST',
        url: '/api/tracking/collect',
        payload: {
          project_id: 1,
          events: [
            {
              event_name: '$identify',
              distinct_id: 'user_1001',
              anonymous_id: 'anon_device_xyz',
              user_id: 1001,
              properties: {
                $original_id: 'anon_device_xyz',
                $identified_id: 1001,
              },
            },
          ],
        },
      });

      expect(collectRes.statusCode).toBe(200);
      const collectBody = collectRes.json();
      expect(collectBody.data.accepted).toBe(1);

      // 2. 查询 /identity/resolve 解析匿名设备标识
      const resolveRes = await app.inject({
        method: 'GET',
        url: '/api/tracking/identity/resolve',
        query: {
          project_id: '1',
          distinct_id: 'anon_device_xyz',
        },
      });

      expect(resolveRes.statusCode).toBe(200);
      const resolveBody = resolveRes.json();
      expect(resolveBody.data.canonical_user_id).toBe(1001);
      expect(resolveBody.data.is_identified).toBe(true);

      // 3. 查询 /identity/graph 获取设备图谱
      const graphRes = await app.inject({
        method: 'GET',
        url: '/api/tracking/identity/graph',
        query: {
          project_id: '1',
          user_id: '1001',
        },
      });

      expect(graphRes.statusCode).toBe(200);
      const graphBody = graphRes.json();
      expect(graphBody.data.user_id).toBe(1001);
      expect(graphBody.data.anonymous_ids).toContain('anon_device_xyz');
      expect(graphBody.data.total_devices).toBe(1);
    });

    it('未绑定的设备在 resolve 时返回 canonical_user_id 为 null', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/tracking/identity/resolve',
        query: {
          project_id: '1',
          distinct_id: 'completely_new_device_uuid',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.canonical_user_id).toBeNull();
      expect(body.data.is_identified).toBe(false);
    });

    it('identity 接口缺少必要参数时返回 400', async () => {
      const res1 = await app.inject({
        method: 'GET',
        url: '/api/tracking/identity/resolve',
        query: { distinct_id: 'test' },
      });
      expect(res1.statusCode).toBe(400);

      const res2 = await app.inject({
        method: 'GET',
        url: '/api/tracking/identity/resolve',
        query: { project_id: '1' },
      });
      expect(res2.statusCode).toBe(400);

      const res3 = await app.inject({
        method: 'GET',
        url: '/api/tracking/identity/graph',
        query: { project_id: '1' },
      });
      expect(res3.statusCode).toBe(400);
    });
  });
});
