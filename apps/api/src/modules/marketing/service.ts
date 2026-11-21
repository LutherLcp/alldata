import type { MarketingFlow } from '@alldata/shared/types';
import type { FastifyInstance } from 'fastify';
import { type FlowExecutionContext, type FlowExecutionResult, MarketingFlowParser } from './parser';

/**
 * 营销自动化 Flow 业务服务
 */
export class MarketingService {
  private static flowStore: Map<number, MarketingFlow[]> = new Map();

  constructor(private app?: FastifyInstance) {
    MarketingService.ensureDefaults(1);
  }

  private static ensureDefaults(projectId: number) {
    if (!MarketingService.flowStore.has(projectId)) {
      MarketingService.flowStore.set(projectId, [
        {
          id: 1,
          project_id: projectId,
          name: '流失风险用户飞书卡片自动关怀 Flow',
          description: '当高价值用户超过14天未访问时，自动触发飞书卡片与优惠券推送',
          status: 2,
          trigger_type: 'event',
          nodes: [
            { id: 'n1', type: 'trigger', label: '触发: 用户离场 > 14天', config: { days: 14 } },
            { id: 'n2', type: 'condition', label: '判断: LTV得分 >= 80', config: { min_ltv: 80 } },
            {
              id: 'n3',
              type: 'action',
              label: '触达: 发送飞书机器人关怀卡片',
              config: { channel: 'feishu' },
            },
          ],
          edges: [
            { source: 'n1', target: 'n2' },
            { source: 'n2', target: 'n3', label: '是' },
          ],
          triggered_count: 1250,
          conversion_count: 312,
          conversion_rate: 24.96,
          created_by: 1,
          created_at: new Date(Date.now() - 604800000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 2,
          project_id: projectId,
          name: '新客首单未支付短信催付 Flow',
          description: '加购商品30分钟内未提交订单，自动下发催付提醒',
          status: 2,
          trigger_type: 'event',
          nodes: [
            {
              id: 'n1',
              type: 'trigger',
              label: '触发: 提交订单',
              config: { event: 'submit_order' },
            },
            {
              id: 'n2',
              type: 'condition',
              label: '判断: 30分钟未支付',
              config: { timeout_min: 30 },
            },
            {
              id: 'n3',
              type: 'action',
              label: '触达: 触发短信催付通知',
              config: { channel: 'sms' },
            },
          ],
          edges: [
            { source: 'n1', target: 'n2' },
            { source: 'n2', target: 'n3', label: '未支付' },
          ],
          triggered_count: 3400,
          conversion_count: 1120,
          conversion_rate: 32.94,
          created_by: 1,
          created_at: new Date(Date.now() - 302400000).toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
    }
  }

  async listFlows(projectId: number): Promise<MarketingFlow[]> {
    MarketingService.ensureDefaults(projectId);
    return MarketingService.flowStore.get(projectId) || [];
  }

  async getFlow(projectId: number, flowId: number): Promise<MarketingFlow | null> {
    MarketingService.ensureDefaults(projectId);
    const flows = MarketingService.flowStore.get(projectId) || [];
    return flows.find((f) => f.id === flowId) || null;
  }

  async createFlow(
    projectId: number,
    data: Partial<MarketingFlow>,
    userId: number,
  ): Promise<MarketingFlow> {
    MarketingService.ensureDefaults(projectId);
    const flows = MarketingService.flowStore.get(projectId) || [];

    const defaultNodes = [
      { id: 'n1', type: 'trigger' as const, label: '事件触发', config: { event: 'user_active' } },
      { id: 'n2', type: 'action' as const, label: '系统通知', config: { channel: 'in_app' } },
    ];
    const defaultEdges = [{ source: 'n1', target: 'n2' }];

    const newFlow: MarketingFlow = {
      id: Date.now(),
      project_id: projectId,
      name: data.name || '未命名营销画布',
      description: data.description || '',
      status: (data.status as 1 | 2 | 3) || 1,
      trigger_type: data.trigger_type || 'event',
      nodes: data.nodes && data.nodes.length > 0 ? data.nodes : defaultNodes,
      edges: data.edges && data.edges.length > 0 ? data.edges : defaultEdges,
      triggered_count: 0,
      conversion_count: 0,
      conversion_rate: 0,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    flows.unshift(newFlow);
    MarketingService.flowStore.set(projectId, flows);
    return newFlow;
  }

  async updateFlow(
    projectId: number,
    flowId: number,
    data: Partial<MarketingFlow>,
  ): Promise<MarketingFlow | null> {
    MarketingService.ensureDefaults(projectId);
    const flows = MarketingService.flowStore.get(projectId) || [];
    const idx = flows.findIndex((f) => f.id === flowId);
    if (idx === -1) return null;

    const current = flows[idx];
    const updated: MarketingFlow = {
      ...current,
      ...data,
      id: current.id,
      project_id: projectId,
      updated_at: new Date().toISOString(),
    };
    flows[idx] = updated;
    MarketingService.flowStore.set(projectId, flows);
    return updated;
  }

  async deleteFlow(projectId: number, flowId: number): Promise<boolean> {
    MarketingService.ensureDefaults(projectId);
    const flows = MarketingService.flowStore.get(projectId) || [];
    const idx = flows.findIndex((f) => f.id === flowId);
    if (idx === -1) return false;
    flows.splice(idx, 1);
    MarketingService.flowStore.set(projectId, flows);
    return true;
  }

  async executeFlow(
    projectId: number,
    flowId: number,
    context: FlowExecutionContext,
  ): Promise<FlowExecutionResult> {
    MarketingService.ensureDefaults(projectId);
    const flows = MarketingService.flowStore.get(projectId) || [];
    const flow = flows.find((f) => f.id === flowId);
    if (!flow) {
      return {
        success: false,
        user_id: context.user_id,
        flow_id: flowId,
        triggered: false,
        executed_actions: [],
        trace: [],
        converted: false,
        reason: 'Flow 不存在',
      };
    }

    const result = MarketingFlowParser.parseAndExecute(flow, context);

    if (result.triggered) {
      flow.triggered_count += 1;
      if (result.converted) {
        flow.conversion_count += 1;
      }
      flow.conversion_rate = Number(
        ((flow.conversion_count / Math.max(1, flow.triggered_count)) * 100).toFixed(2),
      );
      flow.updated_at = new Date().toISOString();
    }

    return result;
  }

  async triggerTestFlow(flowId: number, userId: string): Promise<FlowExecutionResult> {
    return this.executeFlow(1, flowId, {
      user_id: userId,
      event_name: 'test',
      properties: { ltv: 90, days: 15, timeout_min: 45 },
    });
  }
}
