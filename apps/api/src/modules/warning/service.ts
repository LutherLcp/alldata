/**
 * 预警管理服务 — Warning + WarningLog CRUD
 *
 * 所有按 ID 的操作都带 project_id 过滤，避免跨租户按 ID 直接访问（IDOR）。
 * WarningLog 自身没有 project_id，通过所属 Warning 关联校验项目归属。
 */
import type { FastifyInstance } from 'fastify';

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
      select: { id: true },
    });
    if (!warning) return null;

    const started = Date.now();
    const log = await this.prisma.warningLog.create({
      data: {
        warning_id: id,
        trigger_time: new Date(),
        status: 3, // 3 = 检查失败/未实现（schema 注释仅定义 1=触发 2=恢复）
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

  async listLogs(warningId: number, projectId: number) {
    return this.prisma.warningLog.findMany({
      where: { warning_id: warningId, warning: { project_id: projectId } },
      orderBy: { trigger_time: 'desc' },
    });
  }
}
