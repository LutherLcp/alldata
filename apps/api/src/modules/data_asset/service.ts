/**
 * 数据资产服务 — 数据表/数据集/属性/分类 CRUD
 */
import { FastifyInstance } from 'fastify';

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

  async getTable(id: number) {
    return this.prisma.dataTable.findUnique({
      where: { id },
      include: { columns: { orderBy: { sort_order: 'asc' } } },
    });
  }

  async createTable(data: {
    project_id: number; name: string; display_name?: string;
    description?: string; type: string; created_by: number;
  }) {
    return this.prisma.dataTable.create({ data });
  }

  async updateTable(id: number, data: { display_name?: string; description?: string; status?: number }) {
    return this.prisma.dataTable.update({ where: { id }, data });
  }

  async deleteTable(id: number) {
    return this.prisma.dataTable.delete({ where: { id } });
  }

  // ─── 数据表字段 ──────────────────────────
  async listColumns(tableId: number) {
    return this.prisma.dataTableColumn.findMany({
      where: { datatable_id: tableId },
      orderBy: { sort_order: 'asc' },
    });
  }

  async createColumn(data: {
    datatable_id: number; name: string; display_name?: string;
    data_type: string; is_dimension?: boolean; description?: string; sort_order?: number;
  }) {
    return this.prisma.dataTableColumn.create({ data });
  }

  async deleteColumn(id: number) {
    return this.prisma.dataTableColumn.delete({ where: { id } });
  }

  // ─── 数据集 ──────────────────────────────
  async listDatasets(projectId: number, type?: string) {
    const where: any = { project_id: projectId };
    if (type) where.type = type;
    return this.prisma.dataset.findMany({ where, orderBy: { created_at: 'desc' } });
  }

  async getDataset(id: number) {
    return this.prisma.dataset.findUnique({ where: { id } });
  }

  async createDataset(data: {
    project_id: number; name: string; display_name?: string;
    description?: string; type: string; sql_content?: string; config?: any;
    created_by: number;
  }) {
    return this.prisma.dataset.create({
      data: { ...data, config: data.config ?? {} },
    });
  }

  async updateDataset(id: number, data: {
    name?: string; display_name?: string; description?: string;
    sql_content?: string; config?: any; status?: number;
  }) {
    return this.prisma.dataset.update({ where: { id }, data });
  }

  async deleteDataset(id: number) {
    return this.prisma.dataset.delete({ where: { id } });
  }

  // ─── 属性管理 ────────────────────────────
  async listAttributes(projectId: number, categoryId?: number) {
    const where: any = { project_id: projectId };
    if (categoryId) where.category_id = categoryId;
    return this.prisma.attribute.findMany({ where, orderBy: { id: 'desc' } });
  }

  async createAttribute(data: {
    project_id: number; name: string; display_name?: string;
    data_type: string; entity_type?: string; is_dimension?: boolean;
    category_id?: number; description?: string; created_by: number;
  }) {
    return this.prisma.attribute.create({ data });
  }

  async updateAttribute(id: number, data: {
    display_name?: string; data_type?: string; is_dimension?: boolean;
    category_id?: number; status?: number; description?: string;
  }) {
    return this.prisma.attribute.update({ where: { id }, data });
  }

  async deleteAttribute(id: number) {
    return this.prisma.attribute.delete({ where: { id } });
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
    project_id: number; parent_id?: number; name: string;
    type: string; level?: number; sort_order?: number;
  }) {
    return this.prisma.category.create({ data });
  }

  async deleteCategory(id: number) {
    return this.prisma.category.delete({ where: { id } });
  }
}
