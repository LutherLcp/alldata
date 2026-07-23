/**
 * 看板服务 — 文件夹/看板/报表/软链 CRUD
 */
import { FastifyInstance } from 'fastify';

export class DashboardService {
  private prisma;

  constructor(private app: FastifyInstance) {
    this.prisma = app.prisma;
  }

  // ─── 文件夹 ────────────────────────────────────────

  async getFolderTree(projectId: number) {
    const folders = await this.prisma.dashboardFolder.findMany({
      where: { project_id: projectId },
      include: { dashboards: { select: { id: true, name: true, type: true, status: true } } },
      orderBy: { sort_order: 'asc' },
    });

    // 构建树形结构
    const map = new Map<number, any>();
    const roots: any[] = [];
    folders.forEach((f: any) => map.set(f.id, { ...f, children: [] }));
    folders.forEach((f: any) => {
      const node = map.get(f.id);
      if (f.parent_id && map.has(f.parent_id)) {
        map.get(f.parent_id).children.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  }

  async createFolder(data: { project_id: number; parent_id?: number; name: string; type?: number }, userId: number) {
    return this.prisma.dashboardFolder.create({
      data: { ...data, created_by: userId },
    });
  }

  async updateFolder(id: number, data: { name?: string; sort_order?: number; parent_id?: number }) {
    return this.prisma.dashboardFolder.update({ where: { id }, data });
  }

  async deleteFolder(id: number) {
    return this.prisma.dashboardFolder.delete({ where: { id } });
  }

  // ─── 看板 ──────────────────────────────────────────

  async listDashboards(projectId: number, folderId?: number) {
    const where: any = { project_id: projectId, status: 1 };
    if (folderId) where.folder_id = folderId;
    return this.prisma.dashboard.findMany({
      where,
      include: { reports: { select: { id: true, name: true, type: true, chart_type: true } } },
      orderBy: { updated_at: 'desc' },
    });
  }

  async getDashboard(id: number) {
    return this.prisma.dashboard.findUnique({
      where: { id },
      include: {
        reports: { orderBy: { created_at: 'asc' } },
        soft_links: { where: { status: 1 } },
        folder: { select: { id: true, name: true } },
      },
    });
  }

  async createDashboard(data: {
    project_id: number; folder_id?: number; name: string;
    description?: string; type?: number; layout?: any; config?: any;
  }, userId: number) {
    return this.prisma.dashboard.create({
      data: { ...data, created_by: userId, updated_by: userId },
    });
  }

  async updateDashboard(id: number, data: {
    name?: string; description?: string; layout?: any;
    config?: any; common_filters?: any; folder_id?: number;
  }, userId: number) {
    return this.prisma.dashboard.update({
      where: { id },
      data: { ...data, updated_by: userId },
    });
  }

  async archiveDashboard(id: number) {
    return this.prisma.dashboard.update({
      where: { id },
      data: { status: 2 },
    });
  }

  // ─── 报表 ──────────────────────────────────────────

  async createReport(data: {
    project_id: number; dashboard_id?: number; name: string;
    type: string; chart_type?: string; query_config?: any;
    chart_config?: any; sql_content?: string; position?: any;
  }, userId: number) {
    return this.prisma.report.create({
      data: { ...data, created_by: userId },
    });
  }

  async updateReport(id: number, data: {
    name?: string; chart_type?: string; query_config?: any;
    chart_config?: any; sql_content?: string; position?: any;
  }) {
    return this.prisma.report.update({ where: { id }, data });
  }

  async deleteReport(id: number) {
    return this.prisma.report.delete({ where: { id } });
  }

  // ─── 软链 ──────────────────────────────────────────

  async createSoftLink(dashboardId: number, userId: number, name?: string, expireAt?: Date) {
    const token = crypto.randomUUID().replace(/-/g, '');
    return this.prisma.softLink.create({
      data: { dashboard_id: dashboardId, token, name, expire_at: expireAt, created_by: userId },
    });
  }

  async getSoftLink(token: string) {
    return this.prisma.softLink.findUnique({
      where: { token, status: 1 },
      include: { dashboard: { include: { reports: true } } },
    });
  }

  async revokeSoftLink(id: number) {
    return this.prisma.softLink.update({ where: { id }, data: { status: 2 } });
  }
}
