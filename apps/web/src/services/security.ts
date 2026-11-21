/**
 * 安全合规、数据血缘与 GDPR 隐私审计 API 服务
 */
import type { DataLineageEdge, DataLineageNode } from '@alldata/shared';
import { get, post } from './request';

export interface GDPRForgetResult {
  success: boolean;
  purged_distinct_id: string;
  purged_clickhouse_records: number;
  purged_postgres_records: number;
  audit_log_id: number;
  timestamp: string;
}

export interface GDPRAuditItem {
  id: number;
  user_id: number;
  project_id: number;
  action: string;
  resource: string;
  distinct_id: string;
  purged_records: number;
  created_at: string;
}

export interface MaskingPreviewResult {
  [field: string]: {
    original: string;
    masked: string;
  };
}

export const securityApi = {
  // 获取数据血缘拓扑结构
  getLineage: (projectId: number) =>
    get<{ nodes: DataLineageNode[]; edges: DataLineageEdge[] }>('/security/lineage', {
      project_id: projectId,
    }),

  // 执行 GDPR 物理遗忘擦除
  gdprForget: (projectId: number, distinctId: string) =>
    post<GDPRForgetResult>(`/security/gdpr/forget?project_id=${projectId}`, {
      distinct_id: distinctId,
    }),

  // 获取 GDPR 擦除合规存证记录
  getGDPRHistory: (projectId: number) =>
    get<GDPRAuditItem[]>('/security/gdpr/history', { project_id: projectId }),

  // 动态脱敏规则实时预检
  previewMasking: (
    projectId: number,
    payload: Record<string, string>,
    rules: Record<string, string>,
  ) =>
    post<MaskingPreviewResult>(`/security/masking/preview?project_id=${projectId}`, {
      payload,
      rules,
    }),
};
