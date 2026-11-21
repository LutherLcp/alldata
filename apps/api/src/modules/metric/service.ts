/**
 * 指标管理服务 — Metric CRUD
 *
 * 所有按 ID 的操作都带 project_id 过滤，避免跨租户按 ID 直接访问（IDOR）。
 */
import type { FastifyInstance } from 'fastify';

export class MetricService {
  private prisma;
  constructor(private app: FastifyInstance) {
    this.prisma = app.prisma;
  }

  async listMetrics(projectId: number) {
    return this.prisma.metric.findMany({
      where: { project_id: projectId },
      orderBy: { updated_at: 'desc' },
    });
  }

  async getMetric(id: number, projectId: number) {
    return this.prisma.metric.findFirst({ where: { id, project_id: projectId } });
  }

  async createMetric(
    data: {
      project_id: number;
      name: string;
      display_name?: string;
      category_id?: number;
      formula?: any;
      metric_type?: string;
      description?: string;
    },
    userId: number,
  ) {
    const { project_id, name, display_name, category_id, description } = data;
    const formula = data.formula || { type: data.metric_type || 'number', expression: '' };
    return this.prisma.metric.create({
      data: {
        project_id,
        name,
        display_name,
        category_id,
        formula,
        description,
        created_by: userId,
      },
    });
  }

  async updateMetric(
    id: number,
    projectId: number,
    data: { display_name?: string; formula?: any; description?: string; status?: number },
  ) {
    // updateMany 可同时带上 project_id 条件，未命中说明不属于该项目
    const result = await this.prisma.metric.updateMany({
      where: { id, project_id: projectId },
      data,
    });
    if (result.count === 0) return null;
    return this.prisma.metric.findUnique({ where: { id } });
  }

  async deleteMetric(id: number, projectId: number) {
    const result = await this.prisma.metric.deleteMany({
      where: { id, project_id: projectId },
    });
    return result.count > 0;
  }
}
