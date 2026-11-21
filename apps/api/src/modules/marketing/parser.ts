/**
 * Marketing Flow 画布节点解析与执行引擎
 */
import type { FlowEdge, FlowNode, MarketingFlow } from '@alldata/shared/types';

export interface FlowExecutionContext {
  user_id: string;
  event_name?: string;
  properties?: Record<string, unknown>;
  is_converted?: boolean;
}

export interface FlowTraceStep {
  node_id: string;
  type: string;
  label: string;
  status: 'passed' | 'matched' | 'not_matched' | 'executed' | 'skipped';
  detail?: string;
  timestamp: string;
}

export interface FlowExecutedAction {
  node_id: string;
  label: string;
  channel: string;
  action_type: string;
  status: string;
  detail: string;
}

export interface FlowExecutionResult {
  success: boolean;
  flow_id?: number;
  flow_name?: string;
  user_id: string;
  triggered: boolean;
  executed_actions: FlowExecutedAction[];
  trace: FlowTraceStep[];
  converted: boolean;
  reason?: string;
}

/** 一致性哈希分流计算 */
export function hashDiverter(userId: string, salt: string): number {
  const str = `${userId}:${salt}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** 属性条件比对 */
export function evaluateConditionRule(
  config: Record<string, unknown> = {},
  properties: Record<string, unknown> = {},
): boolean {
  // 1. 结构化字段条件 (property, operator, value)
  if (config.property && config.operator) {
    const propVal = properties[config.property as string];
    const targetVal = config.value;
    switch (config.operator) {
      case 'eq':
      case '==':
        return propVal === targetVal;
      case 'neq':
      case '!=':
        return propVal !== targetVal;
      case 'gt':
      case '>':
        return Number(propVal) > Number(targetVal);
      case 'gte':
      case '>=':
        return Number(propVal) >= Number(targetVal);
      case 'lt':
      case '<':
        return Number(propVal) < Number(targetVal);
      case 'lte':
      case '<=':
        return Number(propVal) <= Number(targetVal);
      case 'contains':
        return String(propVal ?? '').includes(String(targetVal ?? ''));
      default:
        return false;
    }
  }

  // 2. 常用业务简写条件
  if (config.min_ltv !== undefined) {
    const ltv = Number(properties.ltv ?? properties.min_ltv ?? 0);
    return ltv >= Number(config.min_ltv);
  }
  if (config.days !== undefined) {
    const days = Number(properties.days ?? properties.inactive_days ?? 0);
    return days >= Number(config.days);
  }
  if (config.timeout_min !== undefined) {
    const timeout = Number(properties.timeout_min ?? properties.unpaid_min ?? 0);
    return timeout >= Number(config.timeout_min);
  }
  if (config.cohort_id !== undefined) {
    const cohortIds = Array.isArray(properties.cohort_ids)
      ? properties.cohort_ids
      : [properties.cohort_id];
    return cohortIds.includes(config.cohort_id);
  }

  // 默认若上下文显式指定 matched: false 则为 false，其余默认为 true
  return properties.matched !== false;
}

export class MarketingFlowParser {
  /**
   * 解析 Flow 画布图拓扑结构并执行触发与多触点动作
   */
  static parseAndExecute(
    flow: MarketingFlow | { nodes: FlowNode[]; edges: FlowEdge[]; id?: number; name?: string },
    context: FlowExecutionContext,
  ): FlowExecutionResult {
    const nodes = flow.nodes || [];
    const edges = flow.edges || [];

    const triggerNode = nodes.find((n) => n.type === 'trigger');
    if (!triggerNode) {
      return {
        success: false,
        user_id: context.user_id,
        flow_id: flow.id,
        flow_name: flow.name,
        triggered: false,
        executed_actions: [],
        trace: [],
        converted: false,
        reason: '缺少触发节点',
      };
    }

    const triggerConfig = triggerNode.config || {};
    if (triggerConfig.event && context.event_name && triggerConfig.event !== context.event_name) {
      return {
        success: true,
        user_id: context.user_id,
        flow_id: flow.id,
        flow_name: flow.name,
        triggered: false,
        executed_actions: [],
        trace: [
          {
            node_id: triggerNode.id,
            type: 'trigger',
            label: triggerNode.label,
            status: 'skipped',
            detail: `事件不匹配: 期望 [${triggerConfig.event}], 收到 [${context.event_name}]`,
            timestamp: new Date().toISOString(),
          },
        ],
        converted: false,
        reason: '事件未满足触发规则',
      };
    }

    const trace: FlowTraceStep[] = [];
    const executedActions: FlowExecutedAction[] = [];
    const visitedNodes = new Set<string>();
    const nodeQueue: FlowNode[] = [triggerNode];

    while (nodeQueue.length > 0) {
      const currentNode = nodeQueue.shift()!;
      if (visitedNodes.has(currentNode.id)) continue;
      visitedNodes.add(currentNode.id);

      const now = new Date().toISOString();

      if (currentNode.type === 'trigger') {
        trace.push({
          node_id: currentNode.id,
          type: 'trigger',
          label: currentNode.label,
          status: 'passed',
          detail: '触发条件已达成',
          timestamp: now,
        });

        // 寻找出边
        const nextEdges = edges.filter((e) => e.source === currentNode.id);
        for (const edge of nextEdges) {
          const target = nodes.find((n) => n.id === edge.target);
          if (target) nodeQueue.push(target);
        }
      } else if (currentNode.type === 'condition') {
        const matched = evaluateConditionRule(currentNode.config, context.properties);
        trace.push({
          node_id: currentNode.id,
          type: 'condition',
          label: currentNode.label,
          status: matched ? 'matched' : 'not_matched',
          detail: matched ? '判定条件通过' : '判定条件未达成',
          timestamp: now,
        });

        const nextEdges = edges.filter((e) => e.source === currentNode.id);
        if (nextEdges.length > 0) {
          let chosenEdge = nextEdges.find((e) => {
            const lbl = (e.label || '').toLowerCase();
            if (matched) {
              return (
                lbl === '是' || lbl === 'yes' || lbl === 'true' || lbl === '未支付' || lbl === ''
              );
            }
            return lbl === '否' || lbl === 'no' || lbl === 'false' || lbl === '已支付';
          });
          if (!chosenEdge && nextEdges.length === 1 && matched) {
            chosenEdge = nextEdges[0];
          }

          if (chosenEdge) {
            const target = nodes.find((n) => n.id === chosenEdge.target);
            if (target) nodeQueue.push(target);
          }
        }
      } else if (currentNode.type === 'split') {
        // A/B 实验分流节点
        const bucket = hashDiverter(context.user_id, currentNode.id) % 100;
        const nextEdges = edges.filter((e) => e.source === currentNode.id);
        const splitRatio = Number(currentNode.config?.ratio ?? 50);

        let chosenEdge = nextEdges[0];
        if (nextEdges.length >= 2) {
          chosenEdge = bucket < splitRatio ? nextEdges[0] : nextEdges[1];
        }

        trace.push({
          node_id: currentNode.id,
          type: 'split',
          label: currentNode.label,
          status: 'passed',
          detail: `哈希分流分桶: ${bucket}%, 选中分支: ${chosenEdge?.label || '默认分支'}`,
          timestamp: now,
        });

        if (chosenEdge) {
          const target = nodes.find((n) => n.id === chosenEdge.target);
          if (target) nodeQueue.push(target);
        }
      } else if (currentNode.type === 'action') {
        const config = currentNode.config || {};
        const channel = String(config.channel || 'system');
        let actionResult: FlowExecutedAction;

        if (channel === 'feishu') {
          actionResult = {
            node_id: currentNode.id,
            label: currentNode.label,
            channel: 'feishu',
            action_type: 'bot_card_message',
            status: 'delivered',
            detail: `飞书关怀卡片已成功下发至用户 [${context.user_id}]`,
          };
        } else if (channel === 'sms') {
          actionResult = {
            node_id: currentNode.id,
            label: currentNode.label,
            channel: 'sms',
            action_type: 'sms_push',
            status: 'delivered',
            detail: `短信催付已下发至用户 [${context.user_id}]`,
          };
        } else if (channel === 'in_app') {
          actionResult = {
            node_id: currentNode.id,
            label: currentNode.label,
            channel: 'in_app',
            action_type: 'popup_modal',
            status: 'delivered',
            detail: `站内弹窗已就绪并触达至用户 [${context.user_id}]`,
          };
        } else if (channel === 'tag_user') {
          const tag = String(config.tag || 'high_value_customer');
          actionResult = {
            node_id: currentNode.id,
            label: currentNode.label,
            channel: 'tag_user',
            action_type: 'profile_tagging',
            status: 'tagged',
            detail: `用户画像已打上标签 [${tag}]`,
          };
        } else {
          actionResult = {
            node_id: currentNode.id,
            label: currentNode.label,
            channel: channel,
            action_type: 'custom_action',
            status: 'completed',
            detail: `执行动作: ${currentNode.label}`,
          };
        }

        executedActions.push(actionResult);
        trace.push({
          node_id: currentNode.id,
          type: 'action',
          label: currentNode.label,
          status: 'executed',
          detail: actionResult.detail,
          timestamp: now,
        });

        // 寻找后续出边
        const nextEdges = edges.filter((e) => e.source === currentNode.id);
        for (const edge of nextEdges) {
          const target = nodes.find((n) => n.id === edge.target);
          if (target) nodeQueue.push(target);
        }
      }
    }

    const isConverted =
      Boolean(context.is_converted) ||
      (executedActions.length > 0 && Boolean(context.properties?.converted));

    return {
      success: true,
      user_id: context.user_id,
      flow_id: flow.id,
      flow_name: flow.name,
      triggered: true,
      executed_actions: executedActions,
      trace,
      converted: isConverted,
    };
  }
}
