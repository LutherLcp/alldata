/**
 * 版本日历服务 — CRUD
 */
import { FastifyInstance } from 'fastify';

export class CalendarService {
  private prisma;

  constructor(private app: FastifyInstance) {
    this.prisma = app.prisma;
  }

  async list(projectId: number, options: { startDate?: string; endDate?: string; type?: string }) {
    const where: any = { project_id: projectId };
    if (options.type) where.type = options.type;
    if (options.startDate || options.endDate) {
      where.start_date = {};
      if (options.startDate) where.start_date.gte = new Date(options.startDate);
      if (options.endDate) where.start_date.lte = new Date(options.endDate);
    }
    return this.prisma.versionCalendar.findMany({
      where,
      orderBy: { start_date: 'desc' },
    });
  }

  async get(id: number) {
    return this.prisma.versionCalendar.findUnique({ where: { id } });
  }

  async create(data: {
    project_id: number;
    title: string;
    description?: string;
    start_date: string;
    end_date?: string;
    type: string;
    status?: number;
  }, userId: number) {
    return this.prisma.versionCalendar.create({
      data: {
        project_id: data.project_id,
        title: data.title,
        description: data.description,
        start_date: new Date(data.start_date),
        end_date: data.end_date ? new Date(data.end_date) : null,
        type: data.type,
        status: data.status ?? 1,
        created_by: userId,
      },
    });
  }

  async update(id: number, data: {
    title?: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    type?: string;
    status?: number;
  }) {
    const updateData: any = { ...data };
    if (data.start_date) updateData.start_date = new Date(data.start_date);
    if (data.end_date) updateData.end_date = new Date(data.end_date);
    return this.prisma.versionCalendar.update({ where: { id }, data: updateData });
  }

  async delete(id: number) {
    return this.prisma.versionCalendar.delete({ where: { id } });
  }
}
