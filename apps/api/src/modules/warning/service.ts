/**
 * 预警管理服务 — Warning + WarningLog CRUD
 */
import { FastifyInstance } from 'fastify';

export class WarningService {
  private prisma;
  constructor(private app: FastifyInstance) { this.prisma = app.prisma; }

  async listWarnings(projectId: number) {
    return this.prisma.warning.findMany({ where: { project_id: projectId }, include: { _count: { select: { logs: true } } }, orderBy: { updated_at: 'desc' } });
  }

  async getWarning(id: number) {
    return this.prisma.warning.findUnique({ where: { id }, include: { logs: { orderBy: { trigger_time: 'desc' }, take: 20 } } });
  }

  async createWarning(data: { project_id: number; name: string; monitor_rules: any; notify_config: any; check_cron?: string }, userId: number) {
    const { project_id, name, monitor_rules, notify_config, check_cron } = data;
    return this.prisma.warning.create({ data: { project_id, name, monitor_rules, notify_config, check_cron, created_by: userId } });
  }

  async updateWarning(id: number, data: { name?: string; status?: number; monitor_rules?: any; notify_config?: any; check_cron?: string }) {
    return this.prisma.warning.update({ where: { id }, data });
  }

  async deleteWarning(id: number) { return this.prisma.warning.delete({ where: { id } }); }

  async triggerCheck(id: number) {
    // 模拟预警检查
    const triggered = Math.random() > 0.5;
    const log = await this.prisma.warningLog.create({
      data: { warning_id: id, trigger_time: new Date(), status: triggered ? 1 : 2, detail: { value: Math.floor(Math.random() * 1000), threshold: 500, message: triggered ? '指标超过阈值' : '指标恢复正常' } },
    });
    return { triggered, log_id: log.id };
  }

  async listLogs(warningId: number) {
    return this.prisma.warningLog.findMany({ where: { warning_id: warningId }, orderBy: { trigger_time: 'desc' } });
  }
}
