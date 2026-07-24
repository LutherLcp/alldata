/**
 * 指标管理服务 — Metric CRUD
 */
import { FastifyInstance } from 'fastify';

export class MetricService {
  private prisma;
  constructor(private app: FastifyInstance) { this.prisma = app.prisma; }

  async listMetrics(projectId: number) {
    return this.prisma.metric.findMany({ where: { project_id: projectId }, orderBy: { updated_at: 'desc' } });
  }

  async getMetric(id: number) { return this.prisma.metric.findUnique({ where: { id } }); }

  async createMetric(data: { project_id: number; name: string; display_name?: string; category_id?: number; formula?: any; metric_type?: string; description?: string }, userId: number) {
    const { project_id, name, display_name, category_id, description } = data;
    const formula = data.formula || { type: data.metric_type || 'number', expression: '' };
    return this.prisma.metric.create({ data: { project_id, name, display_name, category_id, formula, description, created_by: userId } });
  }

  async updateMetric(id: number, data: { display_name?: string; formula?: any; description?: string; status?: number }) {
    return this.prisma.metric.update({ where: { id }, data });
  }

  async deleteMetric(id: number) { return this.prisma.metric.delete({ where: { id } }); }
}
