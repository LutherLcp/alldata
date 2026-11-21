import { buildApp } from '@/app';
import {
  MarketingFlowParser,
  evaluateConditionRule,
  hashDiverter,
} from '@/modules/marketing/parser';
import { MarketingService } from '@/modules/marketing/service';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Marketing Flow Canvas & Automation Engine', () => {
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

  describe('MarketingFlowParser (画布拓扑解析与规则引擎)', () => {
    it('evaluateConditionRule 能够准确判定数值与业务简写条件', () => {
      // 业务简写 min_ltv
      expect(evaluateConditionRule({ min_ltv: 80 }, { ltv: 95 })).toBe(true);
      expect(evaluateConditionRule({ min_ltv: 80 }, { ltv: 50 })).toBe(false);

      // 业务简写 days
      expect(evaluateConditionRule({ days: 14 }, { days: 20 })).toBe(true);
      expect(evaluateConditionRule({ days: 14 }, { days: 10 })).toBe(false);

      // 业务简写 timeout_min
      expect(evaluateConditionRule({ timeout_min: 30 }, { timeout_min: 35 })).toBe(true);
      expect(evaluateConditionRule({ timeout_min: 30 }, { timeout_min: 20 })).toBe(false);

      // 结构化操作符 (gt / eq / contains)
      expect(
        evaluateConditionRule(
          { property: 'city', operator: 'eq', value: 'Beijing' },
          { city: 'Beijing' },
        ),
      ).toBe(true);
      expect(
        evaluateConditionRule({ property: 'score', operator: 'gt', value: 60 }, { score: 85 }),
      ).toBe(true);
      expect(
        evaluateConditionRule(
          { property: 'tag', operator: 'contains', value: 'vip' },
          { tag: 'vip_gold_user' },
        ),
      ).toBe(true);
    });

    it('当事件与触发器要求不匹配时，正确跳过执行', () => {
      const flow = {
        id: 99,
        name: '订单触发流',
        nodes: [
          {
            id: 't1',
            type: 'trigger' as const,
            label: '下单触发',
            config: { event: 'submit_order' },
          },
          { id: 'a1', type: 'action' as const, label: '发送短信', config: { channel: 'sms' } },
        ],
        edges: [{ source: 't1', target: 'a1' }],
      };

      const result = MarketingFlowParser.parseAndExecute(flow, {
        user_id: 'USR_101',
        event_name: 'page_view',
      });

      expect(result.triggered).toBe(false);
      expect(result.executed_actions).toHaveLength(0);
      expect(result.trace[0].status).toBe('skipped');
    });

    it('条件成立时顺着正向出边执行多触点动作', () => {
      const flow = {
        id: 101,
        name: '高价值关怀流',
        nodes: [
          { id: 'n1', type: 'trigger' as const, label: '事件触发', config: { event: 'leave_app' } },
          { id: 'n2', type: 'condition' as const, label: 'LTV判定', config: { min_ltv: 80 } },
          {
            id: 'n3',
            type: 'action' as const,
            label: '飞书卡片推送',
            config: { channel: 'feishu' },
          },
          {
            id: 'n4',
            type: 'action' as const,
            label: '普通打标',
            config: { channel: 'tag_user', tag: 'normal' },
          },
        ],
        edges: [
          { source: 'n1', target: 'n2' },
          { source: 'n2', target: 'n3', label: '是' },
          { source: 'n2', target: 'n4', label: '否' },
        ],
      };

      // 高 LTV 用户 -> 命中 n3 (飞书)
      const resHigh = MarketingFlowParser.parseAndExecute(flow, {
        user_id: 'USR_HIGH',
        event_name: 'leave_app',
        properties: { ltv: 90 },
      });
      expect(resHigh.triggered).toBe(true);
      expect(resHigh.executed_actions).toHaveLength(1);
      expect(resHigh.executed_actions[0].channel).toBe('feishu');
      expect(resHigh.executed_actions[0].detail).toContain('USR_HIGH');

      // 低 LTV 用户 -> 命中 n4 (打标)
      const resLow = MarketingFlowParser.parseAndExecute(flow, {
        user_id: 'USR_LOW',
        event_name: 'leave_app',
        properties: { ltv: 40 },
      });
      expect(resLow.triggered).toBe(true);
      expect(resLow.executed_actions).toHaveLength(1);
      expect(resLow.executed_actions[0].channel).toBe('tag_user');
    });

    it('split 分流节点基于一致性哈希稳定分流', () => {
      const b1 = hashDiverter('USER_A', 'split_node_1') % 100;
      const b2 = hashDiverter('USER_A', 'split_node_1') % 100;
      expect(b1).toBe(b2);

      const flow = {
        id: 102,
        name: 'A/B 分流触达',
        nodes: [
          { id: 'n1', type: 'trigger' as const, label: '触发' },
          { id: 's1', type: 'split' as const, label: '50/50 分流', config: { ratio: 50 } },
          { id: 'a1', type: 'action' as const, label: '方案A: 短信', config: { channel: 'sms' } },
          {
            id: 'a2',
            type: 'action' as const,
            label: '方案B: 站内弹窗',
            config: { channel: 'in_app' },
          },
        ],
        edges: [
          { source: 'n1', target: 's1' },
          { source: 's1', target: 'a1', label: '分支A' },
          { source: 's1', target: 'a2', label: '分支B' },
        ],
      };

      const res = MarketingFlowParser.parseAndExecute(flow, {
        user_id: 'USER_A',
      });
      expect(res.triggered).toBe(true);
      expect(res.executed_actions.length).toBe(1);
      expect(['sms', 'in_app']).toContain(res.executed_actions[0].channel);
    });
  });

  describe('MarketingService (业务服务层与生命周期管理)', () => {
    let service: MarketingService;

    beforeEach(() => {
      service = new MarketingService();
    });

    it('listFlows 自动初始化预置 Flow 并支持多租户隔离', async () => {
      const p1Flows = await service.listFlows(1);
      expect(p1Flows.length).toBeGreaterThanOrEqual(2);

      const p2Flows = await service.listFlows(2);
      expect(p2Flows.length).toBeGreaterThanOrEqual(2);
      expect(p2Flows[0].project_id).toBe(2);
    });

    it('createFlow, updateFlow 与 deleteFlow 生命周期正常工作', async () => {
      const created = await service.createFlow(
        1,
        {
          name: '新客欢迎礼包流',
          description: '注册即赠送新手福利券',
          trigger_type: 'event',
        },
        1,
      );
      expect(created.name).toBe('新客欢迎礼包流');
      expect(created.status).toBe(1);

      const updated = await service.updateFlow(1, created.id, {
        name: '新客欢迎礼包流 V2',
        status: 2,
      });
      expect(updated?.name).toBe('新客欢迎礼包流 V2');
      expect(updated?.status).toBe(2);

      const deleted = await service.deleteFlow(1, created.id);
      expect(deleted).toBe(true);

      const notFound = await service.getFlow(1, created.id);
      expect(notFound).toBeNull();
    });

    it('executeFlow 触发后自动累加触达人数与更新转化率', async () => {
      const flows = await service.listFlows(1);
      const targetFlow = flows[0];
      const prevTriggered = targetFlow.triggered_count;
      const prevConversion = targetFlow.conversion_count;

      const res = await service.executeFlow(1, targetFlow.id, {
        user_id: 'USR_ACTIVE_001',
        event_name: 'test',
        properties: { ltv: 95, days: 20 },
        is_converted: true,
      });

      expect(res.triggered).toBe(true);
      expect(targetFlow.triggered_count).toBe(prevTriggered + 1);
      expect(targetFlow.conversion_count).toBe(prevConversion + 1);
      expect(targetFlow.conversion_rate).toBeGreaterThan(0);
    });
  });

  describe('REST API 路由与安全保护 (Fastify Integration)', () => {
    const token = () => app.jwt.sign({ userId: '1', tenantId: '1', role: 'admin' });

    it('GET /api/marketing/flows 返回项目下的 Flow 列表', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/marketing/flows',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.code).toBe(200);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(2);
    });

    it('POST /api/marketing/flows 能够成功创建并验证必填字段', async () => {
      // 缺少 name
      const badRes = await app.inject({
        method: 'POST',
        url: '/api/marketing/flows',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
        payload: {
          project_id: 1,
        },
      });
      expect(badRes.statusCode).toBe(400);

      // 正常创建
      const goodRes = await app.inject({
        method: 'POST',
        url: '/api/marketing/flows',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
        payload: {
          project_id: 1,
          name: '智能推送回归流',
          trigger_type: 'cohort',
        },
      });
      expect(goodRes.statusCode).toBe(201);
      const json = JSON.parse(goodRes.payload);
      expect(json.data.name).toBe('智能推送回归流');
    });

    it('POST /api/marketing/flows/:id/execute 模拟执行并返回完整 trace', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/marketing/flows/1/execute',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
        payload: {
          user_id: 'USR_AUTO_TEST',
          properties: { ltv: 99, days: 18 },
          is_converted: true,
        },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.code).toBe(200);
      expect(json.data.triggered).toBe(true);
      expect(json.data.trace.length).toBeGreaterThan(0);
      expect(json.data.executed_actions.length).toBeGreaterThan(0);
    });

    it('IDOR 鉴权防护: 无项目权限用户访问应被拦截 403', async () => {
      mockPrisma.userProjectRole.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/api/marketing/flows',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '999',
        },
      });

      expect(res.statusCode).toBe(403);
    });
  });
});
