/**
 * 版本日历服务 — CRUD 与发布里程碑聚合
 */
import type { FastifyInstance } from 'fastify';

export interface CalendarRoadmapSummary {
  total_events: number;
  upcoming_releases: number;
  active_milestones: number;
  maintenance_windows: number;
}

export class CalendarService {
  private prisma;

  constructor(private app: FastifyInstance) {
    this.prisma = app.prisma;
  }

  async list(
    projectId: number,
    options: { startDate?: string; endDate?: string; type?: string } = {},
  ) {
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

  async get(id: number, projectId: number) {
    return this.prisma.versionCalendar.findFirst({
      where: { id, project_id: projectId },
    });
  }

  async create(
    data: {
      project_id: number;
      title: string;
      description?: string;
      start_date: string;
      end_date?: string;
      type: string;
      status?: number;
    },
    userId: number,
  ) {
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

  async update(
    id: number,
    projectId: number,
    data: {
      title?: string;
      description?: string;
      start_date?: string;
      end_date?: string;
      type?: string;
      status?: number;
    },
  ) {
    const existing = await this.prisma.versionCalendar.findFirst({
      where: { id, project_id: projectId },
    });
    if (!existing) return null;

    const updateData: any = { ...data };
    if (data.start_date) updateData.start_date = new Date(data.start_date);
    if (data.end_date) updateData.end_date = new Date(data.end_date);
    return this.prisma.versionCalendar.update({ where: { id }, data: updateData });
  }

  async delete(id: number, projectId: number): Promise<boolean> {
    const existing = await this.prisma.versionCalendar.findFirst({
      where: { id, project_id: projectId },
    });
    if (!existing) return false;
    await this.prisma.versionCalendar.delete({ where: { id } });
    return true;
  }

  /**
   * 聚合发布计划与里程碑进度概览 (Roadmap Summary)
   */
  async getRoadmapSummary(projectId: number): Promise<CalendarRoadmapSummary> {
    const list = await this.prisma.versionCalendar.findMany({
      where: { project_id: projectId },
    });

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 86400 * 1000);

    let upcomingReleases = 0;
    let activeMilestones = 0;
    let maintenanceWindows = 0;

    for (const item of list) {
      if (item.type === 'release') {
        const start = new Date(item.start_date);
        if (start >= now && start <= in30Days && item.status === 1) {
          upcomingReleases++;
        }
      } else if (item.type === 'milestone') {
        if (item.status === 1) activeMilestones++;
      } else if (item.type === 'maintenance') {
        if (item.status === 1) maintenanceWindows++;
      }
    }

    return {
      total_events: list.length,
      upcoming_releases: upcomingReleases,
      active_milestones: activeMilestones,
      maintenance_windows: maintenanceWindows,
    };
  }
}
