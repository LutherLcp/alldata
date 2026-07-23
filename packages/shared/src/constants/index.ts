/**
 * @alldata/shared — 常量枚举定义
 *
 * 前后端共享的常量，去除原始公司特征描述。
 */

// ============================================================
// 错误码
// ============================================================

export const ERROR_CODES = {
  SUCCESS: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  TOKEN_EXPIRED: 10001,
  TOKEN_INVALID: 10002,
  TOKEN_REFRESH_EXPIRED: 10003,
  ACCOUNT_DISABLED: 10004,
  DATA_PERMISSION_DENIED: 20201, // 数据权限不足，触发权限申请弹窗
  INTERNAL_ERROR: 500,
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ============================================================
// API 路由
// ============================================================

export const API_ROUTES = {
  // 认证
  LOGIN: '/api/v1/login',
  LOGOUT: '/api/v1/logout',
  REFRESH_TOKEN: '/api/v1/refresh-token',
  USER_INFO: '/api/v1/user-info',

  // 项目
  PROJECT_LIST: '/api/project/v1/list',
  PROJECT_DETAIL: '/api/project/:id',
  PROJECT_CREATE: '/api/project',
  PROJECT_UPDATE: '/api/project',
  PROJECT_DELETE: '/api/project/:id',
  PROJECT_STATUS: '/api/project/status',

  // 看板
  DASHBOARD: '/api/dashboard',
  DASHBOARD_LIST: '/api/dashboards',
  DASHBOARD_FOLDER_TREE: '/api/dashboard/folder/tree',
  DASHBOARD_FOLDER: '/api/dashboard/folder',
  DASHBOARD_MOVE: '/api/dashboard/move',
  DASHBOARD_COPY: '/api/dashboard/copy',
  DASHBOARD_COMMON_FILTERS: '/api/dashboard/common-filters',
  DASHBOARD_MANAGE_LIST: '/api/dashboard/v1/list',
  DASHBOARD_SOFT_LINK_ADD: '/api/dashboard/soft-link/v1/add',
  DASHBOARD_SOFT_LINK_LIST: '/api/dashboard/soft-link/v1/list',
  DASHBOARD_SOFT_LINK_CANCEL: '/api/dashboard/soft-link/v1/cancel',

  // 报表
  REPORT: '/api/report',
  REPORT_LIST: '/api/reports',
  REPORT_DOWNLOAD: '/api/report/v1/download',
  REPORT_BIG_DOWNLOAD_LIST: '/api/report/v1/big-download/list',

  // 分析
  ANALYSIS_QUERY: '/api/query',
  ANALYSIS_CANCEL: '/api/query/cancel',

  // SQL 分析
  SQL_RUN: '/api/sqlAnalysis/v1/run',
  SQL_HISTORY: '/api/sqlanalysis/v1/history',

  // 埋点管理
  STORY_LIST: '/api/story/v1/list',
  STORY_CREATE: '/api/story/v1/new',
  STORY_UPDATE: '/api/story/v1/modify',
  STORY_DELETE: '/api/story/v1/remove',
  STORY_DETAIL: '/api/story/v1/info',
  EVENT_LIST: '/api/event/v1/list',
  EVENT_LOGS: '/api/event/v1/event-logs',

  // 标签
  TAG_LIST: '/api/user-tags',
  TAG_SIMPLE_LIST: '/api/user-tags/simple',
  TAG_DETAIL: '/api/user-tag',
  TAG_CREATE: '/api/user-tag',
  TAG_UPDATE: '/api/user-tag',
  TAG_DELETE: '/api/user-tag',
  TAG_REFRESH: '/api/user-tag/refresh',
  TAG_HISTORY: '/api/user-tag/history-list',

  // 指标
  METRIC_LIST: '/api/metric/list',
  METRIC_DETAIL: '/api/metric/:id',
  METRIC_CREATE: '/api/metric',
  METRIC_UPDATE: '/api/metric',
  METRIC_DELETE: '/api/metric/:id',

  // 数据资产
  DATATABLE_LIST: '/api/datatable/v1/list',
  DATATABLE_DETAIL: '/api/datatable/v1/:id',
  DATASET_LIST: '/api/dataset/v1/list',
  DATASET_DETAIL: '/api/dataset/v1/:id',
  ATTRIBUTE_LIST: '/api/attribute/v1/list',

  // 预警
  WARNING_LIST: '/api/warning/list',
  WARNING_CREATE: '/api/warning',
  WARNING_UPDATE: '/api/warning',
  WARNING_DELETE: '/api/warning/:id',
  WARNING_DASHBOARD: '/api/warning/dashboard',
  WARNING_LOGS: '/api/warning/log-list',

  // 用户查询
  USER_QUERY_SIMPLE: '/api/user-query/simple',
  USER_QUERY_FULL: '/api/user-query/full',
  USER_QUERY_SINGLE: '/api/user-query/single',
  USER_TIMELINE: '/api/user-query/time-line',

  // 筛选器
  FILTER_COMMON_LIST: '/api/filter/dashboard/common/list',
  FILTER_COMMON_SAVE: '/api/filter/dashboard/common',
  FILTER_PRIVATE_LIST: '/api/filter/dashboard/private/list',
  FILTER_OPTION_LIST: '/api/filter/option/list',

  // 管理中心
  PUSH_LIST: '/api/dashboard/push/v1/list',
  PUSH_ADD: '/api/dashboard/push/v1/add',
  SUBSCRIPTION_LIST: '/api/report/sub/v1/list',
  SUBSCRIPTION_ADD: '/api/report/sub/v1/add',
  DOWNLOAD_LIST: '/api/report/v1/big-download/list',
  ENUM_LIST: '/api/enum/v1/list',
  CALENDAR_LIST: '/api/calendar/v1/list',
  CONFIG_LIST: '/api/config/v1/list',

  // 站内信
  NOTICE_LIST: '/api/notice/v1/list',
  NOTICE_ADD: '/api/notice/v1/add',
  NOTICE_READ: '/api/notice/v1/read',
  NOTICE_READ_ALL: '/api/notice/v1/read-all',
  NOTICE_STAT: '/api/notice/v1/stat',

  // 全局
  ENTITY_TYPE_LIST: '/api/entity-type/list',
  CATEGORY_LIST: '/api/category/list',
  CATEGORY_TREE: '/api/category/tree',

  // 文件上传
  UPLOAD: '/api/upload/v1/upload',

  // 行为上报
  TRACKING_REPORT: '/api/analytics-tracking/v1/report',

  // AI
  AI_MODEL_LIST: '/api/v1/ai-model-list',
  AI_SUMMARY: '/api/dashboard/v1/ai-summary',
} as const;

// ============================================================
// 分析类型
// ============================================================

export const ANALYSIS_TYPES = {
  EVENT: 'event',
  RETENTION: 'retention',
  FUNNEL: 'funnel',
  SCATTER: 'scatter',
  INTERVAL: 'interval',
  USER: 'user',
  SELF_SERVICE: 'self_service',
  SQL: 'sql',
} as const;

export const ANALYSIS_TYPE_LABELS: Record<string, string> = {
  event: '事件分析',
  retention: '留存分析',
  funnel: '漏斗分析',
  scatter: '分布分析',
  interval: '间隔分析',
  user: '用户分析',
  self_service: '自助分析',
  sql: 'SQL 分析',
};

// ============================================================
// 图表类型
// ============================================================

export const CHART_TYPES = {
  LINE: 'line',
  BAR: 'bar',
  HORIZONTAL_BAR: 'horizontal_bar',
  PIE: 'pie',
  AREA: 'area',
  SCATTER: 'scatter',
  HEATMAP: 'heatmap',
  FUNNEL: 'funnel',
  WORDCLOUD: 'wordcloud',
  MAP: 'map',
  SANKEY: 'sankey',
  PIVOT: 'pivot',
} as const;

// ============================================================
// 聚合类型
// ============================================================

export const AGG_TYPES = {
  COUNT: 'count',
  UV: 'uv',
  SUM: 'sum',
  AVG: 'avg',
  MAX: 'max',
  MIN: 'min',
  MEDIAN: 'median',
} as const;

export const AGG_TYPE_LABELS: Record<string, string> = {
  count: '总次数',
  uv: '触发用户数',
  sum: '求和',
  avg: '均值',
  max: '最大值',
  min: '最小值',
  median: '中位数',
};

// ============================================================
// 筛选操作符
// ============================================================

export const OPERATORS = {
  EQ: 'eq',
  NE: 'ne',
  GT: 'gt',
  GTE: 'gte',
  LT: 'lt',
  LTE: 'lte',
  IN: 'in',
  NOT_IN: 'not_in',
  LIKE: 'like',
  NOT_LIKE: 'not_like',
  IS_NULL: 'is_null',
  IS_NOT_NULL: 'is_not_null',
  BETWEEN: 'between',
  NOT_BETWEEN: 'not_between',
} as const;

export const OPERATOR_LABELS: Record<string, string> = {
  eq: '等于',
  ne: '不等于',
  gt: '大于',
  gte: '大于等于',
  lt: '小于',
  lte: '小于等于',
  in: '包含',
  not_in: '不包含',
  like: '模糊匹配',
  not_like: '不匹配',
  is_null: '为空',
  is_not_null: '不为空',
  between: '区间',
  not_between: '不在区间',
};

// ============================================================
// 数据类型
// ============================================================

export const DATA_TYPES = {
  STRING: 'string',
  NUMBER: 'number',
  DATE: 'date',
  BOOLEAN: 'boolean',
  ARRAY: 'array',
  OBJECT: 'object',
} as const;

// ============================================================
// 标签类型
// ============================================================

export const TAG_TYPES = {
  SQL: 'sql',
  CONDITION: 'condition',
  METRIC: 'metric',
  ID: 'id',
  TIMES: 'times',
  GROUP: 'group',
} as const;

export const TAG_TYPE_LABELS: Record<string, string> = {
  sql: 'SQL 标签',
  condition: '条件标签',
  metric: '指标标签',
  id: 'ID 标签',
  times: '首末次标签',
  group: '标签组合',
};

// ============================================================
// 语言配置
// ============================================================

export const LANGUAGES = {
  ZH_CN: 'zh_CN',
  EN_US: 'en_US',
  ZH_TW: 'zh_TW',
  KO_KR: 'ko_KR',
  JA_JP: 'ja_JP',
  VI_VN: 'vi_VN',
  ID_ID: 'id_ID',
  TH_TH: 'th_TH',
} as const;

export const LANGUAGE_API_MAP: Record<string, string> = {
  zh_CN: 'zh',
  zh_TW: 'zh-tw',
  en_US: 'en',
  ko_KR: 'ko',
  ja_JP: 'ja',
  vi_VN: 'vi',
  id_ID: 'in',
  th_TH: 'th',
};

// ============================================================
// 响应式断点
// ============================================================

export const BREAKPOINTS = {
  SM: 576,
  MD: 768,
  LG: 992,
  XL: 1200,
  XXL: 1600,
} as const;

// ============================================================
// 通用状态
// ============================================================

export const STATUS = {
  ENABLED: 1,
  DISABLED: 2,
} as const;

export const STORY_STATUS = {
  DRAFT: 1,
  PENDING: 2,
  REVIEWING: 3,
  APPROVED: 4,
  ACCEPTED: 5,
} as const;

export const DOWNLOAD_STATUS = {
  QUEUED: 1,
  IN_PROGRESS: 2,
  COMPLETED: 3,
  FAILED: 4,
} as const;