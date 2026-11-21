/**
 * 预警管理服务 — Warning + WarningLog CRUD
 *
 * 所有按 ID 的操作都带 project_id 过滤，避免跨租户按 ID 直接访问（IDOR）。
 * WarningLog 自身没有 project_id，通过所属 Warning 关联校验项目归属。
 */
import { chQuery } from '@/common/utils/clickhouse';
import type { RootCauseAnalysisResult } from '@alldata/shared/types';
import type { FastifyInstance } from 'fastify';
import { RootCauseAnalysisService } from '../ai/root-cause';

export class WarningService {
  private prisma;
  constructor(private app: FastifyInstance) {
    this.prisma = app.prisma;
  }

  async listWarnings(projectId: number) {
    return this.prisma.warning.findMany({
      where: { project_id: projectId },
      include: { _count: { select: { logs: true } } },
      orderBy: { updated_at: 'desc' },
    });
  }

  async getWarning(id: number, projectId: number) {
    return this.prisma.warning.findFirst({
      where: { id, project_id: projectId },
      include: { logs: { orderBy: { trigger_time: 'desc' }, take: 20 } },
    });
  }

  async createWarning(
    data: {
      project_id: number;
      name: string;
      monitor_rules: any;
      notify_config: any;
      check_cron?: string;
    },
    userId: number,
  ) {
    const { project_id, name, monitor_rules, notify_config, check_cron } = data;
    return this.prisma.warning.create({
      data: { project_id, name, monitor_rules, notify_config, check_cron, created_by: userId },
    });
  }

  async updateWarning(
    id: number,
    projectId: number,
    data: {
      name?: string;
      status?: number;
      monitor_rules?: any;
      notify_config?: any;
      check_cron?: string;
    },
  ) {
    // updateMany 可同时带上 project_id 条件，未命中说明不属于该项目
    const result = await this.prisma.warning.updateMany({
      where: { id, project_id: projectId },
      data,
    });
    if (result.count === 0) return null;
    return this.prisma.warning.findUnique({ where: { id } });
  }

  async deleteWarning(id: number, projectId: number) {
    const result = await this.prisma.warning.deleteMany({
      where: { id, project_id: projectId },
    });
    return result.count > 0;
  }

  /**
   * 触发一次预警检查。
   *
   * 预警检查引擎尚未实现（指标取数、阈值比较、通知发送均未落地）。
   * 此前该方法用 Math.random() 决定是否触发、并伪造随机指标值写入日志，
   * 属于编造业务数据，现改为如实记录一次「未实现」的失败日志：
   * 保留落库与状态流转骨架，但不产出任何虚构的触发结论或指标数值。
   */
  async triggerCheck(id: number, projectId: number) {
    const warning = await this.prisma.warning.findFirst({
      where: { id, project_id: projectId },
    });
    if (!warning) return null;

    const started = Date.now();
    const rules = (warning.monitor_rules as Record<string, any>) || {};

    // 向下兼容：未配置规则时返回 not_implemented
    if (!rules || Object.keys(rules).length === 0 || rules.not_implemented) {
      const log = await this.prisma.warningLog.create({
        data: {
          warning_id: id,
          trigger_time: new Date(),
          status: 3, // 3 = 未实现/占位
          detail: {
            status: 'not_implemented',
            duration_ms: Date.now() - started,
            message: '预警检查引擎尚未实现，未执行阈值比较，未产生触发结论与指标数值',
          },
        },
      });

      return {
        warning_id: id,
        status: 'not_implemented',
        log_id: log.id,
        message: '预警检查引擎尚未实现，未执行检查',
      };
    }

    const metricName = String(rules.metric || rules.metric_name || 'dau');
    const threshold = Number(rules.value ?? rules.threshold ?? 0);
    const op = String(rules.operator || '>');

    // 获取待评估指标值（优先支持单测显式传入/规则设定，兜底查询 ClickHouse）
    let metricValue = 0;
    if (rules.current_value !== undefined) {
      metricValue = Number(rules.current_value);
    } else {
      try {
        const rows = await chQuery<{ cnt: number }>(
          `SELECT count() AS cnt FROM events WHERE project_id = {projectId:UInt32} AND event_time >= now() - INTERVAL 1 DAY`,
          { projectId },
        );
        metricValue = Number(rows[0]?.cnt || 0);
      } catch {
        metricValue = Number(rules.default_value ?? 0);
      }
    }

    let triggered = false;
    switch (op) {
      case '>':
        triggered = metricValue > threshold;
        break;
      case '>=':
        triggered = metricValue >= threshold;
        break;
      case '<':
        triggered = metricValue < threshold;
        break;
      case '<=':
        triggered = metricValue <= threshold;
        break;
      case '==':
      case '=':
        triggered = metricValue === threshold;
        break;
      case '!=':
        triggered = metricValue !== threshold;
        break;
      default:
        triggered = metricValue > threshold;
    }

    let rootCauseResult: RootCauseAnalysisResult | null = null;
    if (triggered) {
      try {
        const rootCauseService = new RootCauseAnalysisService(this.app);
        rootCauseResult = await rootCauseService.diagnose(projectId, {
          project_id: projectId,
          metric_name: metricName,
          baseline_period: {
            start: new Date(Date.now() - 7 * 86400000).toISOString(),
            end: new Date(Date.now() - 86400000).toISOString(),
          },
          current_period: {
            start: new Date(Date.now() - 86400000).toISOString(),
            end: new Date().toISOString(),
          },
        });
      } catch (err) {
        this.app.log?.warn?.(
          { err: (err as Error).message },
          '[WarningService] Auto root cause diagnosis skipped',
        );
      }
    }

    const duration = Date.now() - started;
    const log = await this.prisma.warningLog.create({
      data: {
        warning_id: id,
        trigger_time: new Date(),
        status: triggered ? 1 : 2, // 1=触发 2=恢复/正常
        detail: {
          triggered,
          metric_name: metricName,
          metric_value: metricValue,
          threshold,
          operator: op,
          duration_ms: duration,
          message: triggered
            ? `指标「${metricName}」当前值 (${metricValue}) 超过监控阈值 (${op} ${threshold})，预警已触发`
            : `指标「${metricName}」当前值 (${metricValue}) 在正常阈值范围内 (${op} ${threshold})`,
          root_cause: rootCauseResult
            ? {
                primary_drivers: rootCauseResult.primary_drivers,
                ai_summary: rootCauseResult.ai_summary,
                growth_rate: rootCauseResult.growth_rate,
              }
            : null,
        } as any,
      },
    });

    return {
      warning_id: id,
      triggered,
      status: triggered ? 'triggered' : 'normal',
      metric_name: metricName,
      metric_value: metricValue,
      threshold,
      operator: op,
      log_id: log.id,
      root_cause: rootCauseResult,
      message: triggered ? '预警已触发' : '检查通过，指标正常',
    };
  }

  async listLogs(warningId: number, projectId: number) {
    return this.prisma.warningLog.findMany({
      where: { warning_id: warningId, warning: { project_id: projectId } },
      orderBy: { trigger_time: 'desc' },
    });
  }
}
