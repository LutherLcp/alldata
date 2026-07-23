/**
 * @alldata/shared — Zod 验证 Schema
 *
 * 前后端共享的参数验证，确保接口数据一致性。
 */
import { z } from 'zod';

// ============================================================
// 通用 Schema
// ============================================================

export const pageParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  page_size: z.number().int().min(1).max(200).default(20),
  keyword: z.string().optional(),
  sort_field: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
});

export const dateRangeSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  granularity: z.enum(['hour', 'day', 'week', 'month']).optional(),
});

export const filterConditionSchema = z.object({
  property: z.string().min(1),
  operator: z.enum([
    'eq', 'ne', 'gt', 'gte', 'lt', 'lte',
    'in', 'not_in', 'like', 'not_like',
    'is_null', 'is_not_null', 'between', 'not_between',
  ]),
  value: z.unknown(),
  data_type: z.enum(['string', 'number', 'date', 'boolean', 'array', 'object']).optional(),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ============================================================
// 认证 Schema
// ============================================================

export const loginSchema = z.object({
  username: z.string().min(2).max(100),
  password: z.string().min(6).max(128),
  login_method: z.enum(['password', 'oauth', 'sso']).default('password'),
});

export const registerSchema = z.object({
  username: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1),
});

// ============================================================
// 项目 Schema
// ============================================================

export const projectCreateSchema = z.object({
  code: z.string().min(2).max(100).regex(/^[a-z0-9_-]+$/),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  config: z.record(z.unknown()).optional(),
});

export const projectUpdateSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  config: z.record(z.unknown()).optional(),
});

// ============================================================
// 看板 Schema
// ============================================================

export const dashboardCreateSchema = z.object({
  name: z.string().min(1).max(300),
  folder_id: z.number().int().optional(),
  description: z.string().optional(),
  type: z.number().int().min(1).max(2).default(1),
});

export const dashboardUpdateSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(300).optional(),
  description: z.string().optional(),
  layout: z.array(z.object({
    i: z.string(),
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
    minW: z.number().optional(),
    minH: z.number().optional(),
  })).optional(),
  config: z.record(z.unknown()).optional(),
  common_filters: z.array(filterConditionSchema).optional(),
});

export const folderCreateSchema = z.object({
  name: z.string().min(1).max(200),
  parent_id: z.number().int().optional().nullable(),
  type: z.number().int().min(1).max(2).default(1),
});

export const reportCreateSchema = z.object({
  dashboard_id: z.number().int().optional(),
  name: z.string().min(1).max(300),
  type: z.enum(['chart', 'table', 'metric', 'sql', 'ai', 'text']),
  chart_type: z.string().optional(),
  query_config: z.record(z.unknown()).optional(),
  chart_config: z.record(z.unknown()).optional(),
  sql_content: z.string().optional(),
});

// ============================================================
// 分析查询 Schema
// ============================================================

export const analysisMetricSchema = z.object({
  event_name: z.string().min(1),
  agg_type: z.enum(['count', 'uv', 'sum', 'avg', 'max', 'min', 'median']),
  property: z.string().optional(),
  filters: z.array(filterConditionSchema).optional(),
  alias: z.string().optional(),
});

export const analysisQuerySchema = z.object({
  project_id: z.string().min(1),
  report_id: z.string().optional(),
  request_id: z.string().min(1),
  config: z.object({
    analysis_type: z.enum([
      'event', 'retention', 'funnel', 'scatter',
      'interval', 'user', 'self_service', 'sql',
    ]),
    date_range: dateRangeSchema,
    metrics: z.array(analysisMetricSchema).min(1),
    group_by: z.array(z.object({
      property: z.string(),
      datatable: z.string().optional(),
    })).optional(),
    global_filters: z.array(filterConditionSchema).optional(),
    user_group: z.object({
      tag_id: z.number().optional(),
      conditions: z.array(filterConditionSchema).optional(),
    }).optional(),
    funnel_steps: z.array(z.object({
      event_name: z.string(),
      filters: z.array(filterConditionSchema).optional(),
    })).optional(),
    funnel_window: z.number().optional(),
    retention_event: z.string().optional(),
    retention_window: z.number().optional(),
  }),
});

// ============================================================
// 埋点管理 Schema
// ============================================================

export const storyCreateSchema = z.object({
  name: z.string().min(1).max(300),
  docs_url: z.string().url().optional(),
});

export const eventDefCreateSchema = z.object({
  story_id: z.number().int().optional(),
  name: z.string().min(1).max(200).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  display_name: z.string().optional(),
  description: z.string().optional(),
  properties: z.array(z.object({
    name: z.string().min(1),
    data_type: z.enum(['string', 'number', 'date', 'boolean', 'array', 'object']),
    is_required: z.boolean().default(false),
    description: z.string().optional(),
  })).optional(),
});

// ============================================================
// 标签 Schema
// ============================================================

export const tagCreateSchema = z.object({
  name: z.string().min(1).max(200),
  display_name: z.string().optional(),
  tag_type: z.enum(['sql', 'condition', 'metric', 'id', 'times', 'group']),
  entity_type: z.string().optional(),
  category_id: z.number().int().optional(),
  config: z.record(z.unknown()).optional(),
  sql_content: z.string().optional(),
  description: z.string().optional(),
  refresh_cron: z.string().optional(),
});

// ============================================================
// 指标 Schema
// ============================================================

export const metricCreateSchema = z.object({
  name: z.string().min(1).max(200),
  display_name: z.string().optional(),
  category_id: z.number().int().optional(),
  formula: z.object({
    type: z.enum(['simple', 'composite']),
    event_name: z.string().optional(),
    agg_type: z.enum(['count', 'uv', 'sum', 'avg', 'max', 'min', 'median']).optional(),
    property: z.string().optional(),
    expression: z.string().optional(),
  }),
  description: z.string().optional(),
});

// ============================================================
// 预警 Schema
// ============================================================

export const warningCreateSchema = z.object({
  name: z.string().min(1).max(300),
  monitor_rules: z.array(z.object({
    metric: analysisMetricSchema,
    condition: z.object({
      operator: z.string(),
      threshold: z.number(),
    }),
    date_range: dateRangeSchema,
  })).min(1),
  notify_config: z.object({
    channels: z.array(z.enum(['email', 'feishu', 'webhook', 'in_app'])),
    recipients: z.array(z.number()).optional(),
  }),
  check_cron: z.string().optional(),
});

// ============================================================
// SQL 分析 Schema
// ============================================================

export const sqlRunSchema = z.object({
  sql: z.string().min(1).max(10000),
  project_id: z.string().min(1),
  limit: z.number().int().min(1).max(10000).default(1000),
});

// ============================================================
// 文件上传 Schema
// ============================================================

export const uploadSchema = z.object({
  type: z.enum(['image', 'excel', 'csv', 'pdf', 'other']).default('other'),
  extra: z.record(z.unknown()).optional(),
});