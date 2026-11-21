/**
 * 数据资产 API 服务 — 数据表/数据集/属性/分类/全链路血缘/数据质量巡检
 */
import { del, get, post, put } from './request';

// ─── 基础资产类型 ─────────────────────────
export interface DataTableItem {
  id: number;
  project_id: number;
  name: string;
  display_name: string | null;
  description: string | null;
  type: string;
  status: number;
  row_count: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  _count?: { columns: number };
  columns?: DataTableColumn[];
}

export interface DataTableColumn {
  id: number;
  datatable_id: number;
  name: string;
  display_name: string | null;
  data_type: string;
  is_dimension: boolean;
  description: string | null;
  sort_order: number;
}

export interface DatasetItem {
  id: number;
  project_id: number;
  name: string;
  display_name: string | null;
  description: string | null;
  type: string;
  sql_content: string | null;
  config: any;
  status: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface AttributeItem {
  id: number;
  project_id: number;
  name: string;
  display_name: string | null;
  data_type: string;
  entity_type: string | null;
  is_dimension: boolean;
  category_id: number | null;
  status: number;
  description: string | null;
  created_by: number;
}

export interface CategoryItem {
  id: number;
  project_id: number;
  parent_id: number | null;
  name: string;
  type: string;
  level: number;
  sort_order: number;
  created_at: string;
}

// ─── 数据质量巡检类型 ───────────────────────
export interface ColumnQualityProfile {
  id: number;
  name: string;
  displayName: string | null;
  dataType: string;
  isDimension: boolean;
  hasDescription: boolean;
  qualityStatus: 'GOOD' | 'WARNING' | 'CRITICAL';
  issueDescription?: string;
}

export interface TableQualityProfile {
  tableId: number;
  tableName: string;
  displayName: string | null;
  tableType: string;
  healthScore: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  completenessScore: number;
  freshnessScore: number;
  validityScore: number;
  rowCount: number;
  columnCount: number;
  updatedAt: string;
  anomalies: string[];
  columns?: ColumnQualityProfile[];
}

export interface ProjectQualityOverview {
  projectId: number;
  totalTables: number;
  totalColumns: number;
  avgHealthScore: number;
  gradeDistribution: {
    'A+': number;
    A: number;
    B: number;
    C: number;
    D: number;
  };
  healthyTableCount: number;
  atRiskTableCount: number;
  topAnomalies: { issue: string; count: number }[];
  tables: Array<Omit<TableQualityProfile, 'columns'>>;
  evaluatedAt: string;
}

// ─── 全链路血缘与影响面类型 ──────────────────
export type LineageNodeType = 'TABLE' | 'DATASET' | 'METRIC' | 'DASHBOARD' | 'WARNING';
export type LineageEdgeType = 'EXTRACTS_FROM' | 'CALCULATES' | 'DISPLAYS' | 'ALERTS_ON';

export interface LineageNode {
  id: string;
  rawId: number;
  type: LineageNodeType;
  name: string;
  displayName: string;
  meta?: Record<string, any>;
}

export interface LineageEdge {
  id: string;
  source: string;
  target: string;
  type: LineageEdgeType;
  label?: string;
}

export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
  summary: {
    tableCount: number;
    datasetCount: number;
    metricCount: number;
    dashboardCount: number;
    warningCount: number;
    totalEdges: number;
  };
}

export interface ImpactAnalysisResult {
  targetNode: LineageNode;
  impactedNodes: Array<{
    node: LineageNode;
    depth: number;
    path: string[];
  }>;
  summary: {
    totalImpacted: number;
    affectedDashboards: number;
    affectedMetrics: number;
    affectedWarnings: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
}

export interface UpstreamProvenanceResult {
  targetNode: LineageNode;
  upstreamNodes: Array<{
    node: LineageNode;
    depth: number;
    path: string[];
  }>;
  summary: {
    totalUpstream: number;
    sourceTablesCount: number;
    transformationsCount: number;
    maxDepth: number;
  };
}

// ─── API ─────────────────────────────────
export const tableApi = {
  list: (projectId: number, type?: string) =>
    get<DataTableItem[]>('/assets/tables', { project_id: projectId, type }),
  get: (id: number) => get<DataTableItem>(`/assets/tables/${id}`),
  create: (data: {
    project_id: number;
    name: string;
    display_name?: string;
    description?: string;
    type: string;
  }) => post<DataTableItem>('/assets/tables', data),
  update: (id: number, data: Partial<DataTableItem>) =>
    put<DataTableItem>(`/assets/tables/${id}`, data),
  delete: (id: number) => del(`/assets/tables/${id}`),
  listColumns: (id: number) => get<DataTableColumn[]>(`/assets/tables/${id}/columns`),
  createColumn: (
    tableId: number,
    data: { name: string; data_type: string; is_dimension?: boolean; description?: string },
  ) => post<DataTableColumn>(`/assets/tables/${tableId}/columns`, data),
  deleteColumn: (id: number) => del(`/assets/columns/${id}`),
};

export const datasetApi = {
  list: (projectId: number, type?: string) =>
    get<DatasetItem[]>('/assets/datasets', { project_id: projectId, type }),
  get: (id: number) => get<DatasetItem>(`/assets/datasets/${id}`),
  create: (data: {
    project_id: number;
    name: string;
    type: string;
    sql_content?: string;
    description?: string;
    config?: any;
  }) => post<DatasetItem>('/assets/datasets', data),
  update: (id: number, data: Partial<DatasetItem>) =>
    put<DatasetItem>(`/assets/datasets/${id}`, data),
  delete: (id: number) => del(`/assets/datasets/${id}`),
};

export const attributeApi = {
  list: (projectId: number, categoryId?: number) =>
    get<AttributeItem[]>('/assets/attributes', { project_id: projectId, category_id: categoryId }),
  create: (data: {
    project_id: number;
    name: string;
    data_type: string;
    entity_type?: string;
    is_dimension?: boolean;
    description?: string;
  }) => post<AttributeItem>('/assets/attributes', data),
  update: (id: number, data: Partial<AttributeItem>) =>
    put<AttributeItem>(`/assets/attributes/${id}`, data),
  delete: (id: number) => del(`/assets/attributes/${id}`),
};

export const categoryApi = {
  list: (projectId: number, type?: string) =>
    get<CategoryItem[]>('/assets/categories', { project_id: projectId, type }),
  create: (data: { project_id: number; parent_id?: number; name: string; type: string }) =>
    post<CategoryItem>('/assets/categories', data),
  delete: (id: number) => del(`/assets/categories/${id}`),
};

export const qualityApi = {
  getOverview: (projectId: number) =>
    get<ProjectQualityOverview>('/assets/quality/overview', { project_id: projectId }),
  getTableQuality: (tableId: number) =>
    get<TableQualityProfile>(`/assets/quality/tables/${tableId}`),
  scanQuality: (projectId: number) =>
    post<ProjectQualityOverview>(`/assets/quality/scan?project_id=${projectId}`, {}),
};

export const lineageApi = {
  getGraph: (projectId: number) => get<LineageGraph>('/assets/lineage', { project_id: projectId }),
  getImpact: (nodeId: string) =>
    get<ImpactAnalysisResult>('/assets/lineage/impact', { node_id: nodeId }),
  getProvenance: (nodeId: string) =>
    get<UpstreamProvenanceResult>('/assets/lineage/provenance', { node_id: nodeId }),
};
