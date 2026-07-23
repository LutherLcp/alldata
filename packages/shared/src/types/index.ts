/**
 * @alldata/shared — 全域数据运营平台 公共类型定义
 *
 * 前后端共享的类型系统，所有业务域 Types 统一在此定义。
 */

// ============================================================
// 通用类型
// ============================================================

/** 统一 API 响应格式 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/** 分页信息 */
export interface PageInfo {
  current_page: number;
  page_size: number;
  total_page: number;
  total: number;
}

/** 分页请求参数 */
export interface PageParams {
  page?: number;
  page_size?: number;
  keyword?: string;
  sort_field?: string;
  sort_order?: 'asc' | 'desc';
}

/** 分页响应 */
export interface PaginatedResult<T> {
  list: T[];
  page_info: PageInfo;
}

/** 时间范围 */
export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;
  granularity?: 'hour' | 'day' | 'week' | 'month';
}

/** 筛选条件 */
export interface FilterCondition {
  property: string;
  operator: FilterOperator;
  value: unknown;
  data_type?: DataType;
}

export type FilterOperator =
  | 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'in' | 'not_in' | 'like' | 'not_like'
  | 'is_null' | 'is_not_null'
  | 'between' | 'not_between';

export type DataType = 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';

/** 排序配置 */
export interface SortConfig {
  field: string;
  order: 'asc' | 'desc';
}

/** 树形节点 */
export interface TreeNode<T = unknown> {
  id: string | number;
  parent_id?: string | number | null;
  children?: TreeNode<T>[];
  data?: T;
}

// ============================================================
// 用户与权限域
// ============================================================

export interface User {
  id: number;
  username: string;
  email?: string;
  avatar?: string;
  status: UserStatus;
  lang: string;
  login_method: LoginMethod;
  created_at: string;
  updated_at: string;
}

export type UserStatus = 1 | 2; // 1=启用 2=禁用
export type LoginMethod = 'password' | 'oauth' | 'sso';

export interface UserInfo {
  id: number;
  username: string;
  email?: string;
  avatar?: string;
  lang: string;
  permissions?: string[];
  projects?: ProjectSimple[];
}

export interface LoginRequest {
  username: string;
  password: string;
  login_method?: LoginMethod;
}

export interface LoginResponse {
  token: string;
  refresh_token: string;
  user_info: UserInfo;
  expire_at: number;
}

export interface AuthTree {
  [key: string]: {
    allowed: boolean;
    children?: AuthTree;
  };
}

// ============================================================
// 项目域
// ============================================================

export interface Project {
  id: number;
  code: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  config: ProjectConfig;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectSimple {
  id: number;
  code: string;
  name: string;
}

export type ProjectStatus = 1 | 2; // 1=正常 2=归档

export interface ProjectConfig {
  timezone?: string;
  currency?: string;
  primary_color?: string;
  [key: string]: unknown;
}

export interface Role {
  id: number;
  project_id: number;
  name: string;
  description?: string;
  permissions: string[];
  is_system: boolean;
  created_at: string;
}

// ============================================================
// 看板域
// ============================================================

export interface DashboardFolder {
  id: number;
  project_id: number;
  parent_id: number | null;
  name: string;
  type: FolderType;
  sort_order: number;
  children?: DashboardFolder[];
  dashboards?: DashboardSimple[];
  created_by: number;
  created_at: string;
}

export type FolderType = 1 | 2; // 1=普通 2=个人

export interface Dashboard {
  id: number;
  project_id: number;
  folder_id?: number;
  name: string;
  description?: string;
  type: DashboardType;
  status: DashboardStatus;
  layout: GridLayoutItem[];
  config: DashboardConfig;
  common_filters: FilterCondition[];
  reports?: Report[];
  created_by: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
}

export interface DashboardSimple {
  id: number;
  name: string;
  type: DashboardType;
  status: DashboardStatus;
  created_by: number;
  updated_at: string;
}

export type DashboardType = 1 | 2; // 1=普通 2=共享
export type DashboardStatus = 1 | 2; // 1=正常 2=归档

export interface DashboardConfig {
  theme?: string;
  auto_refresh?: number; // 秒
  [key: string]: unknown;
}

export interface GridLayoutItem {
  i: string; // report id
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface Report {
  id: number;
  project_id: number;
  dashboard_id?: number;
  name: string;
  type: ReportType;
  chart_type?: ChartType;
  query_config: AnalysisQueryConfig;
  chart_config: Record<string, unknown>;
  sql_content?: string;
  position: GridLayoutItem;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export type ReportType = 'chart' | 'table' | 'metric' | 'sql' | 'ai' | 'text';
export type ChartType =
  | 'line' | 'bar' | 'horizontal_bar' | 'pie' | 'area'
  | 'scatter' | 'heatmap' | 'funnel' | 'wordcloud'
  | 'map' | 'sankey' | 'pivot';

export interface SoftLink {
  id: number;
  dashboard_id: number;
  token: string;
  name?: string;
  expire_at?: string;
  status: 1 | 2;
  config: Record<string, unknown>;
  created_by: number;
  created_at: string;
}

// ============================================================
// 分析查询域
// ============================================================

export interface AnalysisQueryConfig {
  analysis_type: AnalysisType;
  date_range: DateRange;
  metrics: AnalysisMetric[];
  group_by?: GroupByConfig[];
  global_filters?: FilterCondition[];
  user_group?: UserGroupConfig;
  // 漏斗分析
  funnel_steps?: FunnelStep[];
  funnel_window?: number;
  // 留存分析
  retention_event?: string;
  retention_window?: number;
}

export type AnalysisType =
  | 'event' | 'retention' | 'funnel'
  | 'scatter' | 'interval' | 'user'
  | 'self_service' | 'sql';

export interface AnalysisMetric {
  event_name: string;
  agg_type: AggregationType;
  property?: string;
  filters?: FilterCondition[];
  alias?: string;
}

export type AggregationType = 'count' | 'uv' | 'sum' | 'avg' | 'max' | 'min' | 'median';

export interface GroupByConfig {
  property: string;
  datatable?: string;
}

export interface UserGroupConfig {
  tag_id?: number;
  conditions?: FilterCondition[];
}

export interface FunnelStep {
  event_name: string;
  filters?: FilterCondition[];
}

export interface AnalysisQueryRequest {
  project_id: string;
  report_id?: string;
  request_id: string;
  config: AnalysisQueryConfig;
}

export interface AnalysisResult {
  columns: AnalysisColumn[];
  rows: Record<string, unknown>[];
  summary?: Record<string, unknown>;
  chart_data?: ChartDataSeries[];
}

export interface AnalysisColumn {
  key: string;
  label: string;
  data_type: DataType;
}

export interface ChartDataSeries {
  name: string;
  data: Array<{ x: string | number; y: number }>;
}

// ============================================================
// 埋点域（Event Tracking）
// ============================================================

export interface Story {
  id: number;
  project_id: number;
  name: string;
  docs_url?: string;
  status: StoryStatus;
  events?: EventDefinition[];
  created_by: number;
  created_at: string;
  updated_at: string;
}

export type StoryStatus = 1 | 2 | 3 | 4 | 5;
// 1=草稿 2=待审 3=审批中 4=通过 5=验收完成

export interface EventDefinition {
  id: number;
  project_id: number;
  story_id?: number;
  name: string;
  display_name?: string;
  description?: string;
  status: 1 | 2;
  properties?: EventProperty[];
  created_at: string;
}

export interface EventProperty {
  id: number;
  event_id: number;
  name: string;
  data_type: DataType;
  is_required: boolean;
  description?: string;
  sort_order: number;
}

// ============================================================
// 标签域
// ============================================================

export interface UserTag {
  id: number;
  project_id: number;
  name: string;
  display_name?: string;
  tag_type: TagType;
  entity_type?: string;
  category_id?: number;
  status: TagStatus;
  config: Record<string, unknown>;
  sql_content?: string;
  description?: string;
  refresh_cron?: string;
  last_refresh_at?: string;
  entity_count: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export type TagType = 'sql' | 'condition' | 'metric' | 'id' | 'times' | 'group';
export type TagStatus = 1 | 2 | 3; // 1=正常 2=禁用 3=计算中

export interface TagHistory {
  id: number;
  tag_id: number;
  status: 1 | 2 | 3; // 1=进行中 2=成功 3=失败
  entity_count?: number;
  duration_ms?: number;
  error_msg?: string;
  created_at: string;
}

// ============================================================
// 指标域
// ============================================================

export interface Metric {
  id: number;
  project_id: number;
  name: string;
  display_name?: string;
  category_id?: number;
  status: 1 | 2;
  formula: MetricFormula;
  description?: string;
  i18n?: Record<string, string>;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface MetricFormula {
  type: 'simple' | 'composite';
  event_name?: string;
  agg_type?: AggregationType;
  property?: string;
  expression?: string; // 组合指标表达式
}

// ============================================================
// 数据资产域
// ============================================================

export interface Category {
  id: number;
  project_id: number;
  parent_id: number | null;
  name: string;
  type: string;
  level: number;
  sort_order: number;
  children?: Category[];
  created_at: string;
}

export interface EntityType {
  id: number;
  project_id: number;
  label: string;
  value: string;
  sort_order: number;
}

export interface DataTable {
  id: number;
  project_id: number;
  name: string;
  display_name?: string;
  description?: string;
  type: 'event' | 'user' | 'upload';
  status: 1 | 2;
  columns?: DataTableColumn[];
  row_count?: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface DataTableColumn {
  id: number;
  datatable_id: number;
  name: string;
  display_name?: string;
  data_type: DataType;
  is_dimension: boolean;
  description?: string;
  i18n?: Record<string, string>;
  sort_order: number;
}

export interface Dataset {
  id: number;
  project_id: number;
  name: string;
  display_name?: string;
  description?: string;
  type: 'sql' | 'relation' | 'option';
  sql_content?: string;
  config: Record<string, unknown>;
  status: 1 | 2;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface Attribute {
  id: number;
  project_id: number;
  name: string;
  display_name?: string;
  data_type: DataType;
  entity_type?: string;
  is_dimension: boolean;
  category_id?: number;
  status: 1 | 2;
  description?: string;
  i18n?: Record<string, string>;
  created_by: number;
  created_at: string;
}

// ============================================================
// 预警域
// ============================================================

export interface Warning {
  id: number;
  project_id: number;
  name: string;
  status: 1 | 2; // 1=启用 2=禁用
  monitor_rules: MonitorRule[];
  notify_config: NotifyConfig;
  check_cron?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface MonitorRule {
  metric: AnalysisMetric;
  condition: {
    operator: FilterOperator;
    threshold: number;
  };
  date_range: DateRange;
}

export interface NotifyConfig {
  channels: NotifyChannel[];
  recipients?: number[];
}

export type NotifyChannel = 'email' | 'feishu' | 'webhook' | 'in_app';

export interface WarningLog {
  id: number;
  warning_id: number;
  trigger_time: string;
  status: 1 | 2; // 1=触发 2=恢复
  detail: Record<string, unknown>;
  created_at: string;
}

// ============================================================
// 管理功能域
// ============================================================

export interface Subscription {
  id: number;
  project_id: number;
  entity_id: number;
  entity_type: 'report' | 'dashboard';
  name: string;
  status: 1 | 2;
  schedule_cron: string;
  notify_type: 'email' | 'feishu';
  notify_config: Record<string, unknown>;
  created_by: number;
  created_at: string;
}

export interface PushConfig {
  id: number;
  project_id: number;
  entity_id?: number;
  entity_type?: string;
  name: string;
  status: 1 | 2;
  push_type: 'feishu_group' | 'webhook';
  config: Record<string, unknown>;
  created_by: number;
  created_at: string;
}

export interface EnumDefinition {
  id: number;
  project_id: number;
  type_key: string;
  name: string;
  items: EnumItem[];
  description?: string;
  created_by: number;
  created_at: string;
}

export interface EnumItem {
  value: string;
  label: string;
  i18n?: Record<string, string>;
}

export interface VersionCalendar {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  type: string;
  status: 1 | 2;
  created_by: number;
  created_at: string;
}

export interface DownloadTask {
  id: number;
  project_id: number;
  task_name: string;
  task_type: 'report' | 'datatable' | 'analysis';
  status: DownloadStatus;
  progress: number;
  file_url?: string;
  file_size?: number;
  error_msg?: string;
  expire_at?: string;
  created_by: number;
  created_at: string;
  finished_at?: string;
}

export type DownloadStatus = 1 | 2 | 3 | 4;
// 1=排队 2=进行中 3=完成 4=失败

export interface Notice {
  id: number;
  project_id?: number;
  title: string;
  content: string;
  type: string;
  status: 1 | 2 | 3; // 1=草稿 2=已发布 3=已撤回
  publish_at?: string;
  is_read?: boolean;
  created_by: number;
  created_at: string;
}

// ============================================================
// 财务域（骨架）
// ============================================================

export interface FinanceSupplier {
  id: number;
  supplier_name: string;
  subject?: string;
  contact?: string;
  phone?: string;
  status: 1 | 2;
  created_at: string;
}

export interface FinanceReconciliation {
  id: number;
  supplier_id: number;
  platform: string;
  game: string;
  period: string;
  currency: string;
  status: 1 | 2;
  meta: Record<string, unknown>;
  created_at: string;
}

// ============================================================
// KoCRM 域（骨架）
// ============================================================

export interface KocrmAccount {
  id: number;
  project_id: number;
  platform: string;
  account_name: string;
  account_id: string;
  status: 1 | 2;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface KocrmCreator {
  id: number;
  project_id: number;
  platform: string;
  name: string;
  uid: string;
  followers: number;
  status: 1 | 2;
  tags?: string[];
  meta: Record<string, unknown>;
  created_at: string;
}