/**
 * 数据资产服务 — 数据表/数据集/属性/分类 CRUD
 *
 * 所有按 ID 的操作都带 project_id 过滤，避免跨租户按 ID 直接访问（IDOR）。
 * DataTableColumn 自身没有 project_id，通过所属数据表关联校验项目归属。
 */
import type { FastifyInstance } from 'fastify';

export class DataAssetService {
  private prisma;

  constructor(private app: FastifyInstance) {
    this.prisma = app.prisma;
  }

  // ─── 数据表 ──────────────────────────────
  async listTables(projectId: number, type?: string) {
    const where: any = { project_id: projectId };
    if (type) where.type = type;
    return this.prisma.dataTable.findMany({
      where,
      include: { _count: { select: { columns: true } } },
      orderBy: { created_at: 'desc' },
    });
  }

  async getTable(id: number, projectId: number) {
    return this.prisma.dataTable.findFirst({
      where: { id, project_id: projectId },
      include: { columns: { orderBy: { sort_order: 'asc' } } },
    });
  }

  async createTable(data: {
    project_id: number;
    name: string;
    display_name?: string;
    description?: string;
    type: string;
    created_by: number;
  }) {
    return this.prisma.dataTable.create({ data });
  }

  async updateTable(
    id: number,
    projectId: number,
    data: { display_name?: string; description?: string; status?: number },
  ) {
    // updateMany 可同时带上 project_id 条件，未命中说明不属于该项目
    const result = await this.prisma.dataTable.updateMany({
      where: { id, project_id: projectId },
      data,
    });
    if (result.count === 0) return null;
    return this.prisma.dataTable.findUnique({ where: { id } });
  }

  async deleteTable(id: number, projectId: number) {
    const result = await this.prisma.dataTable.deleteMany({
      where: { id, project_id: projectId },
    });
    return result.count > 0;
  }

  // ─── 数据表字段 ──────────────────────────
  async listColumns(tableId: number, projectId: number) {
    // 字段表没有 project_id，先确认所属数据表属于该项目
    const table = await this.prisma.dataTable.findFirst({
      where: { id: tableId, project_id: projectId },
      select: { id: true },
    });
    if (!table) return null;

    return this.prisma.dataTableColumn.findMany({
      where: { datatable_id: tableId },
      orderBy: { sort_order: 'asc' },
    });
  }

  async createColumn(
    data: {
      datatable_id: number;
      name: string;
      display_name?: string;
      data_type: string;
      is_dimension?: boolean;
      description?: string;
      sort_order?: number;
    },
    projectId: number,
  ) {
    // 先确认所属数据表属于该项目
    const table = await this.prisma.dataTable.findFirst({
      where: { id: data.datatable_id, project_id: projectId },
      select: { id: true },
    });
    if (!table) return null;

    return this.prisma.dataTableColumn.create({ data });
  }

  async deleteColumn(id: number, projectId: number) {
    // 通过所属数据表关联校验项目归属
    const result = await this.prisma.dataTableColumn.deleteMany({
      where: { id, datatable: { project_id: projectId } },
    });
    return result.count > 0;
  }

  // ─── 数据集 ──────────────────────────────
  async listDatasets(projectId: number, type?: string) {
    const where: any = { project_id: projectId };
    if (type) where.type = type;
    return this.prisma.dataset.findMany({ where, orderBy: { created_at: 'desc' } });
  }

  async getDataset(id: number, projectId: number) {
    return this.prisma.dataset.findFirst({ where: { id, project_id: projectId } });
  }

  async createDataset(data: {
    project_id: number;
    name: string;
    display_name?: string;
    description?: string;
    type: string;
    sql_content?: string;
    config?: any;
    created_by: number;
  }) {
    return this.prisma.dataset.create({
      data: { ...data, config: data.config ?? {} },
    });
  }

  async updateDataset(
    id: number,
    projectId: number,
    data: {
      name?: string;
      display_name?: string;
      description?: string;
      sql_content?: string;
      config?: any;
      status?: number;
    },
  ) {
    const result = await this.prisma.dataset.updateMany({
      where: { id, project_id: projectId },
      data,
    });
    if (result.count === 0) return null;
    return this.prisma.dataset.findUnique({ where: { id } });
  }

  async deleteDataset(id: number, projectId: number) {
    const result = await this.prisma.dataset.deleteMany({
      where: { id, project_id: projectId },
    });
    return result.count > 0;
  }

  // ─── 属性管理 ────────────────────────────
  async listAttributes(projectId: number, categoryId?: number) {
    const where: any = { project_id: projectId };
    if (categoryId) where.category_id = categoryId;
    return this.prisma.attribute.findMany({ where, orderBy: { id: 'desc' } });
  }

  async createAttribute(data: {
    project_id: number;
    name: string;
    display_name?: string;
    data_type: string;
    entity_type?: string;
    is_dimension?: boolean;
    category_id?: number;
    description?: string;
    created_by: number;
  }) {
    return this.prisma.attribute.create({ data });
  }

  async updateAttribute(
    id: number,
    projectId: number,
    data: {
      display_name?: string;
      data_type?: string;
      is_dimension?: boolean;
      category_id?: number;
      status?: number;
      description?: string;
    },
  ) {
    const result = await this.prisma.attribute.updateMany({
      where: { id, project_id: projectId },
      data,
    });
    if (result.count === 0) return null;
    return this.prisma.attribute.findUnique({ where: { id } });
  }

  async deleteAttribute(id: number, projectId: number) {
    const result = await this.prisma.attribute.deleteMany({
      where: { id, project_id: projectId },
    });
    return result.count > 0;
  }

  // ─── 分类管理（树形） ────────────────────
  async listCategories(projectId: number, type?: string) {
    const where: any = { project_id: projectId };
    if (type) where.type = type;
    return this.prisma.category.findMany({
      where,
      orderBy: { sort_order: 'asc' },
    });
  }

  async createCategory(data: {
    project_id: number;
    parent_id?: number;
    name: string;
    type: string;
    level?: number;
    sort_order?: number;
  }) {
    return this.prisma.category.create({ data });
  }

  async deleteCategory(id: number, projectId: number) {
    const result = await this.prisma.category.deleteMany({
      where: { id, project_id: projectId },
    });
    return result.count > 0;
  }
}
