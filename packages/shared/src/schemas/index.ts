import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().min(2).max(50),
  displayName: z.string().min(1).max(100),
  avatarUrl: z.string().url().optional(),
  role: z.enum(['admin', 'manager', 'analyst', 'viewer', 'operator']),
  status: z.enum(['active', 'inactive', 'locked']),
  lastLoginAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(2).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  status: z.enum(['active', 'inactive', 'archived', 'draft']),
  ownerId: z.string().uuid(),
  timezone: z.string().default('Asia/Shanghai'),
  locale: z.string().default('zh-CN'),
  settings: z.record(z.unknown()).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const EventSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  code: z.string().min(2).max(100).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(['draft', 'pending_review', 'approved', 'rejected', 'published', 'archived']),
  version: z.number().int().positive(),
  properties: z.record(z.unknown()).default({}),
  createdBy: z.string().uuid(),
  approvedBy: z.string().uuid().optional(),
  approvedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const TagSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['sql', 'condition', 'indicator', 'first_last', 'id']),
  definition: z.record(z.unknown()),
  groupId: z.string().uuid().optional(),
  isActive: z.boolean().default(true),
  createdBy: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const DashboardSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  layout: z.enum(['grid', 'free', 'responsive']),
  layoutConfig: z.record(z.unknown()).default({}),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  createdBy: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const IndicatorSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  code: z.string().min(2).max(100).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  formula: z.string().min(1),
  unit: z.string().max(50).optional(),
  precision: z.number().int().min(0).max(10).default(2),
  categoryId: z.string().uuid().optional(),
  ownerId: z.string().uuid(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const AlertRuleSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  indicatorId: z.string().uuid(),
  condition: z.record(z.unknown()),
  severity: z.enum(['info', 'warning', 'critical', 'emergency']),
  channels: z.array(z.enum(['email', 'webhook', 'dingtalk', 'feishu', 'sms'])),
  recipients: z.array(z.string()),
  schedule: z.record(z.unknown()),
  isActive: z.boolean().default(true),
  createdBy: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const FinanceRecordSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  type: z.enum(['receivable', 'payable', 'revenue', 'cost', 'asset', 'liability']),
  amount: z.number().positive(),
  currency: z.string().length(3).default('CNY'),
  exchangeRate: z.number().positive().default(1),
  accountId: z.string().uuid(),
  counterparty: z.string().max(200),
  description: z.string().max(500).optional(),
  invoiceNumber: z.string().max(100).optional(),
  invoiceDate: z.date().optional(),
  dueDate: z.date().optional(),
  status: z.enum(['pending', 'partial', 'paid', 'overdue', 'cancelled']),
  createdBy: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const KOCRMRecordSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  channel: z.enum(['douyin', 'kuaishou', 'xiaohongshu', 'wechat', 'bilibili', 'weibo']),
  accountId: z.string().max(100),
  accountName: z.string().max(200),
  campaignId: z.string().max(100).optional(),
  materialId: z.string().max(100).optional(),
  metrics: z.record(z.number()),
  cost: z.number().nonnegative().optional(),
  revenue: z.number().nonnegative().optional(),
  date: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ApiKeySchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string().min(1).max(100),
  keyHash: z.string(),
  keyPrefix: z.string().length(8),
  permissions: z.array(z.string()),
  expiresAt: z.date().optional(),
  lastUsedAt: z.date().optional(),
  isActive: z.boolean().default(true),
  createdBy: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  action: z.string().max(100),
  resource: z.string().max(100),
  resourceId: z.string().optional(),
  oldData: z.record(z.unknown()).optional(),
  newData: z.record(z.unknown()).optional(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: z.date(),
});

export const UserCreateSchema = UserSchema.omit({ id: true, createdAt: true, updatedAt: true, lastLoginAt: true });
export const UserUpdateSchema = UserCreateSchema.partial();

export const ProjectCreateSchema = ProjectSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const ProjectUpdateSchema = ProjectCreateSchema.partial();

export const EventCreateSchema = EventSchema.omit({ id: true, createdAt: true, updatedAt: true, version: true, approvedBy: true, approvedAt: true });
export const EventUpdateSchema = EventCreateSchema.partial();

export const TagCreateSchema = TagSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const TagUpdateSchema = TagCreateSchema.partial();

export const DashboardCreateSchema = DashboardSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const DashboardUpdateSchema = DashboardCreateSchema.partial();

export const IndicatorCreateSchema = IndicatorSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const IndicatorUpdateSchema = IndicatorCreateSchema.partial();

export const AlertRuleCreateSchema = AlertRuleSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const AlertRuleUpdateSchema = AlertRuleCreateSchema.partial();

export const FinanceRecordCreateSchema = FinanceRecordSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const FinanceRecordUpdateSchema = FinanceRecordCreateSchema.partial();

export const KOCRMRecordCreateSchema = KOCRMRecordSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const KOCRMRecordUpdateSchema = KOCRMRecordCreateSchema.partial();

export const ApiKeyCreateSchema = ApiKeySchema.omit({ id: true, keyHash: true, keyPrefix: true, createdAt: true, updatedAt: true, lastUsedAt: true });
export const ApiKeyUpdateSchema = ApiKeyCreateSchema.partial();

export type User = z.infer<typeof UserSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Event = z.infer<typeof EventSchema>;
export type Tag = z.infer<typeof TagSchema>;
export type Dashboard = z.infer<typeof DashboardSchema>;
export type Indicator = z.infer<typeof IndicatorSchema>;
export type AlertRule = z.infer<typeof AlertRuleSchema>;
export type FinanceRecord = z.infer<typeof FinanceRecordSchema>;
export type KOCRMRecord = z.infer<typeof KOCRMRecordSchema>;
export type ApiKey = z.infer<typeof ApiKeySchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;

export type UserCreate = z.infer<typeof UserCreateSchema>;
export type UserUpdate = z.infer<typeof UserUpdateSchema>;
export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;
export type ProjectUpdate = z.infer<typeof ProjectUpdateSchema>;
export type EventCreate = z.infer<typeof EventCreateSchema>;
export type EventUpdate = z.infer<typeof EventUpdateSchema>;
export type TagCreate = z.infer<typeof TagCreateSchema>;
export type TagUpdate = z.infer<typeof TagUpdateSchema>;
export type DashboardCreate = z.infer<typeof DashboardCreateSchema>;
export type DashboardUpdate = z.infer<typeof DashboardUpdateSchema>;
export type IndicatorCreate = z.infer<typeof IndicatorCreateSchema>;
export type IndicatorUpdate = z.infer<typeof IndicatorUpdateSchema>;
export type AlertRuleCreate = z.infer<typeof AlertRuleCreateSchema>;
export type AlertRuleUpdate = z.infer<typeof AlertRuleUpdateSchema>;
export type FinanceRecordCreate = z.infer<typeof FinanceRecordCreateSchema>;
export type FinanceRecordUpdate = z.infer<typeof FinanceRecordUpdateSchema>;
export type KOCRMRecordCreate = z.infer<typeof KOCRMRecordCreateSchema>;
export type KOCRMRecordUpdate = z.infer<typeof KOCRMRecordUpdateSchema>;
export type ApiKeyCreate = z.infer<typeof ApiKeyCreateSchema>;
export type ApiKeyUpdate = z.infer<typeof ApiKeyUpdateSchema>;

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const filterSchema = z.object({
  field: z.string(),
  operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'like', 'nlike', 'between', 'is_null', 'is_not_null']),
  value: z.unknown(),
  logic: z.enum(['AND', 'OR']).optional(),
});

export const sortSchema = z.object({
  field: z.string(),
  order: z.enum(['asc', 'desc']),
});

export const queryOptionsSchema = z.object({
  filters: z.array(filterSchema).optional(),
  sorts: z.array(sortSchema).optional(),
  pagination: paginationSchema.optional(),
  fields: z.array(z.string()).optional(),
});

export type PaginationParams = z.infer<typeof paginationSchema>;
export type FilterCondition = z.infer<typeof filterSchema>;
export type SortOption = z.infer<typeof sortSchema>;
export type QueryOptions = z.infer<typeof queryOptionsSchema>;