/**
 * 数据资产服务 — 数据表/数据集/属性/分类 CRUD + 质量巡检引擎 + 全链路血缘图谱
 *
 * 所有操作均带 project_id 严格隔离（防止跨租户越权 IDOR）。
 */
import type { FastifyInstance } from 'fastify';
import {
  type ImpactAnalysisResult,
  type LineageGraph,
  type UpstreamProvenanceResult,
  buildLineageGraph,
  getImpactAnalysis,
  getUpstreamProvenance,
} from './lineage';
import {
  type ProjectQualityOverview,
  type TableQualityProfile,
  calculateProjectQualityOverview,
  calculateTableQuality,
} from './quality';

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
    const table = await this.prisma.dataTable.findFirst({
      where: { id: data.datatable_id, project_id: projectId },
      select: { id: true },
    });
    if (!table) return null;

    return this.prisma.dataTableColumn.create({ data });
  }

  async deleteColumn(id: number, projectId: number) {
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

  // ─── 数据资产质量巡检 (Data Asset Quality Profiler) ─────
  async getQualityOverview(projectId: number): Promise<ProjectQualityOverview> {
    const tables = await this.prisma.dataTable.findMany({
      where: { project_id: projectId },
      include: { columns: true },
      orderBy: { created_at: 'desc' },
    });

    return calculateProjectQualityOverview(projectId, tables);
  }

  async getTableQuality(tableId: number, projectId: number): Promise<TableQualityProfile | null> {
    const table = await this.prisma.dataTable.findFirst({
      where: { id: tableId, project_id: projectId },
      include: { columns: { orderBy: { sort_order: 'asc' } } },
    });

    if (!table) return null;
    return calculateTableQuality(table, table.columns);
  }

  async scanQuality(projectId: number): Promise<ProjectQualityOverview> {
    return this.getQualityOverview(projectId);
  }

  // ─── 全链路血缘图谱与影响面分析 (Data Lineage & Impact) ───
  async getLineageGraph(projectId: number): Promise<LineageGraph> {
    const [tables, datasets, metrics, dashboards, warnings] = await Promise.all([
      this.prisma.dataTable.findMany({
        where: { project_id: projectId },
        select: { id: true, name: true, display_name: true, type: true, row_count: true },
      }),
      this.prisma.dataset.findMany({
        where: { project_id: projectId },
        select: {
          id: true,
          name: true,
          display_name: true,
          type: true,
          sql_content: true,
          config: true,
        },
      }),
      this.prisma.metric.findMany({
        where: { project_id: projectId },
        select: { id: true, name: true, display_name: true, formula: true, category_id: true },
      }),
      this.prisma.dashboard.findMany({
        where: { project_id: projectId },
        select: {
          id: true,
          name: true,
          description: true,
          reports: {
            select: { id: true, name: true, query_config: true, sql_content: true },
          },
        },
      }),
      this.prisma.warning.findMany({
        where: { project_id: projectId },
        select: { id: true, name: true, status: true, monitor_rules: true },
      }),
    ]);

    return buildLineageGraph({
      tables,
      datasets,
      metrics,
      dashboards,
      warnings,
    });
  }

  async getImpactAnalysis(nodeId: string, projectId: number): Promise<ImpactAnalysisResult | null> {
    const graph = await this.getLineageGraph(projectId);
    const exists = graph.nodes.some((n) => n.id === nodeId);
    if (!exists) return null;
    return getImpactAnalysis(graph, nodeId);
  }

  async getUpstreamProvenance(
    nodeId: string,
    projectId: number,
  ): Promise<UpstreamProvenanceResult | null> {
    const graph = await this.getLineageGraph(projectId);
    const exists = graph.nodes.some((n) => n.id === nodeId);
    if (!exists) return null;
    return getUpstreamProvenance(graph, nodeId);
  }
}
