import { z } from 'zod';

export const UserRole = z.enum(['admin', 'manager', 'analyst', 'viewer', 'operator']);
export type UserRole = z.infer<typeof UserRole>;

export const ProjectStatus = z.enum(['active', 'inactive', 'archived', 'draft']);
export type ProjectStatus = z.infer<typeof ProjectStatus>;

export const EventStatus = z.enum(['draft', 'pending_review', 'approved', 'rejected', 'published', 'archived']);
export type EventStatus = z.infer<typeof EventStatus>;

export const TagType = z.enum(['sql', 'condition', 'indicator', 'first_last', 'id']);
export type TagType = z.infer<typeof TagType>;

export const AnalysisType = z.enum(['event', 'retention', 'funnel', 'distribution', 'interval', 'sql', 'log']);
export type AnalysisType = z.infer<typeof AnalysisType>;

export const DashboardLayoutType = z.enum(['grid', 'free', 'responsive']);
export type DashboardLayoutType = z.infer<typeof DashboardLayoutType>;

export const AlertSeverity = z.enum(['info', 'warning', 'critical', 'emergency']);
export type AlertSeverity = z.infer<typeof AlertSeverity>;

export const AlertStatus = z.enum(['firing', 'resolved', 'acknowledged', 'suppressed']);
export type AlertStatus = z.infer<typeof AlertStatus>;

export const FinanceAccountType = z.enum(['receivable', 'payable', 'revenue', 'cost', 'asset', 'liability']);
export type FinanceAccountType = z.infer<typeof FinanceAccountType>;

export const KOCRMChannel = z.enum(['douyin', 'kuaishou', 'xiaohongshu', 'wechat', 'bilibili', 'weibo']);
export type KOCRMChannel = z.infer<typeof KOCRMChannel>;

export const LanguageCode = z.enum(['zh-CN', 'en-US', 'zh-TW', 'ko-KR', 'ja-JP', 'vi-VN', 'id-ID', 'th-TH']);
export type LanguageCode = z.infer<typeof LanguageCode>;

export const TimeGranularity = z.enum(['hour', 'day', 'week', 'month', 'quarter', 'year']);
export type TimeGranularity = z.infer<typeof TimeGranularity>;

export const AggregationType = z.enum(['count', 'sum', 'avg', 'min', 'max', 'distinct_count', 'percentile']);
export type AggregationType = z.infer<typeof AggregationType>;

export const OperatorType = z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'like', 'nlike', 'between', 'is_null', 'is_not_null']);
export type OperatorType = z.infer<typeof OperatorType>;

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface SoftDeleteEntity extends BaseEntity {
  deletedAt?: Date;
  deletedBy?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ResponseMeta {
  requestId: string;
  timestamp: string;
  duration: number;
}

export interface FilterCondition {
  field: string;
  operator: OperatorType;
  value: unknown;
  logic?: 'AND' | 'OR';
}

export interface SortOption {
  field: string;
  order: 'asc' | 'desc';
}

export interface QueryOptions {
  filters?: FilterCondition[];
  sorts?: SortOption[];
  pagination?: PaginationParams;
  fields?: string[];
}

export interface SelectOption<T = string> {
  label: string;
  value: T;
  disabled?: boolean;
  children?: SelectOption<T>[];
}

export interface TreeNode<T = unknown> {
  id: string;
  label: string;
  children?: TreeNode<T>[];
  data?: T;
  disabled?: boolean;
  selectable?: boolean;
}

export interface FileUpload {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface BatchOperationResult {
  success: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
  requestId?: string;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: Record<string, { status: 'up' | 'down'; latency?: number; error?: string }>;
}

export const createApiResponse = <T>(data: T, meta?: Partial<ResponseMeta>): ApiResponse<T> => ({
  success: true,
  data,
  meta: {
    requestId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    duration: 0,
    ...meta,
  },
});

export const createApiError = (code: string, message: string, details?: Record<string, unknown>): ApiResponse<never> => ({
  success: false,
  error: { code, message, details },
  meta: {
    requestId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    duration: 0,
  },
});

export const paginateResponse = <T>(data: T[], total: number, page: number, pageSize: number): PaginatedResponse<T> => ({
  data,
  total,
  page,
  pageSize,
  totalPages: Math.ceil(total / pageSize),
});