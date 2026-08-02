/**
 * 营销自动化 Flow 业务服务
 */
import { FastifyInstance } from 'fastify';
import { MarketingFlow } from '@alldata/shared/types';
import { MarketingFlowParser } from './parser';

export class MarketingService {
  private prisma;
  constructor(private app: FastifyInstance) {
    this.prisma = app.prisma;
  }

  async listFlows(projectId: number): Promise<MarketingFlow[]> {
    return [
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
          { id: 'n3', type: 'action', label: '触达: 发送飞书机器人关怀卡片', config: { channel: 'feishu' } },
        ],
        edges: [
          { source: 'n1', target: 'n2' },
          { source: 'n2', target: 'n3', label: '是' },
        ],
        triggered_count: 1250,
        conversion_count: 312,
        conversion_rate: 24.96, // 24.96%
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
          { id: 'n1', type: 'trigger', label: '触发: 提交订单', config: { event: 'submit_order' } },
          { id: 'n2', type: 'condition', label: '判断: 30分钟未支付', config: { timeout_min: 30 } },
          { id: 'n3', type: 'action', label: '触达: 触发短信催付通知', config: { channel: 'sms' } },
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
    ];
  }

  async createFlow(projectId: number, data: any, userId: number): Promise<MarketingFlow> {
    return {
      id: Date.now(),
      project_id: projectId,
      name: data.name,
      description: data.description,
      status: 1,
      trigger_type: data.trigger_type || 'event',
      nodes: data.nodes || [],
      edges: data.edges || [],
      triggered_count: 0,
      conversion_count: 0,
      conversion_rate: 0,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  async triggerTestFlow(flowId: number, userId: string) {
    const mockFlow = {
      nodes: [
        { type: 'trigger', label: '触发' },
        { type: 'action', label: '飞书推送' },
      ],
    };
    return MarketingFlowParser.parseAndExecute(mockFlow, { user_id: userId, event_name: 'test' });
  }
}
