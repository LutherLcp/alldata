/**
 * 看板服务 — 文件夹/看板/报表/软链 CRUD
 *
 * 所有按 ID 的操作都带 project_id 过滤：路由层的成员校验只能保证「用户是请求头里
 * 那个项目的成员」，不能阻止用别人的资源 ID 直接访问（IDOR），因此数据访问本身
 * 必须限定在项目范围内。软链（SoftLink）自身没有 project_id，通过所属看板关联校验。
 */
import type { FastifyInstance } from 'fastify';

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

  async createFolder(
    data: { project_id: number; parent_id?: number; name: string; type?: number },
    userId: number,
  ) {
    return this.prisma.dashboardFolder.create({
      data: { ...data, created_by: userId },
    });
  }

  async updateFolder(
    id: number,
    projectId: number,
    data: { name?: string; sort_order?: number; parent_id?: number },
  ) {
    // updateMany 可同时带上 project_id 条件，未命中说明不属于该项目
    const result = await this.prisma.dashboardFolder.updateMany({
      where: { id, project_id: projectId },
      data,
    });
    if (result.count === 0) return null;
    return this.prisma.dashboardFolder.findUnique({ where: { id } });
  }

  async deleteFolder(id: number, projectId: number) {
    const result = await this.prisma.dashboardFolder.deleteMany({
      where: { id, project_id: projectId },
    });
    return result.count > 0;
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

  async getDashboard(id: number, projectId: number) {
    return this.prisma.dashboard.findFirst({
      where: { id, project_id: projectId },
      include: {
        reports: { orderBy: { created_at: 'asc' } },
        soft_links: { where: { status: 1 } },
        folder: { select: { id: true, name: true } },
      },
    });
  }

  async createDashboard(
    data: {
      project_id: number;
      folder_id?: number;
      name: string;
      description?: string;
      type?: number;
      layout?: any;
      config?: any;
    },
    userId: number,
  ) {
    return this.prisma.dashboard.create({
      data: { ...data, created_by: userId, updated_by: userId },
    });
  }

  async updateDashboard(
    id: number,
    projectId: number,
    data: {
      name?: string;
      description?: string;
      layout?: any;
      config?: any;
      common_filters?: any;
      folder_id?: number;
    },
    userId: number,
  ) {
    const result = await this.prisma.dashboard.updateMany({
      where: { id, project_id: projectId },
      data: { ...data, updated_by: userId },
    });
    if (result.count === 0) return null;
    return this.prisma.dashboard.findUnique({ where: { id } });
  }

  async archiveDashboard(id: number, projectId: number) {
    const result = await this.prisma.dashboard.updateMany({
      where: { id, project_id: projectId },
      data: { status: 2 },
    });
    if (result.count === 0) return null;
    return this.prisma.dashboard.findUnique({ where: { id } });
  }

  // ─── 报表 ──────────────────────────────────────────

  async createReport(
    data: {
      project_id: number;
      dashboard_id?: number;
      name: string;
      type: string;
      chart_type?: string;
      query_config?: any;
      chart_config?: any;
      sql_content?: string;
      position?: any;
    },
    userId: number,
  ) {
    return this.prisma.report.create({
      data: { ...data, created_by: userId },
    });
  }

  async updateReport(
    id: number,
    projectId: number,
    data: {
      name?: string;
      chart_type?: string;
      query_config?: any;
      chart_config?: any;
      sql_content?: string;
      position?: any;
    },
  ) {
    const result = await this.prisma.report.updateMany({
      where: { id, project_id: projectId },
      data,
    });
    if (result.count === 0) return null;
    return this.prisma.report.findUnique({ where: { id } });
  }

  async deleteReport(id: number, projectId: number) {
    const result = await this.prisma.report.deleteMany({
      where: { id, project_id: projectId },
    });
    return result.count > 0;
  }

  // ─── 软链 ──────────────────────────────────────────

  async createSoftLink(
    dashboardId: number,
    projectId: number,
    userId: number,
    name?: string,
    expireAt?: Date,
  ) {
    // SoftLink 自身没有 project_id，先确认所属看板属于该项目
    const dashboard = await this.prisma.dashboard.findFirst({
      where: { id: dashboardId, project_id: projectId },
      select: { id: true },
    });
    if (!dashboard) return null;

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

  async revokeSoftLink(id: number, projectId: number) {
    // 通过所属看板关联校验项目归属
    const result = await this.prisma.softLink.updateMany({
      where: { id, dashboard: { project_id: projectId } },
      data: { status: 2 },
    });
    if (result.count === 0) return null;
    return this.prisma.softLink.findUnique({ where: { id } });
  }
}
