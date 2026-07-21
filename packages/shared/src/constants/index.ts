export const APP_CONFIG = {
  name: '全域数据运营平台',
  shortName: 'AllData',
  version: '1.0.0',
  description: '企业级全域数据分析与运营平台',
  author: 'AllData Team',
  repository: 'https://github.com/alldata/platform',
  license: 'MIT',
} as const;

export const API_CONFIG = {
  prefix: '/api/v1',
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  rateLimit: {
    windowMs: 60000,
    maxRequests: 100,
  },
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  },
} as const;

export const DATABASE_CONFIG = {
  poolSize: parseInt(process.env.DB_POOL_SIZE ?? '10', 10),
  connectionTimeout: 5000,
  idleTimeout: 30000,
  maxRetries: 3,
  ssl: process.env.NODE_ENV === 'production',
} as const;

export const REDIS_CONFIG = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB ?? '0', 10),
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 100, 3000),
  enableReadyCheck: true,
  lazyConnect: true,
} as const;

export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  issuer: 'alldata-platform',
  audience: 'alldata-client',
  algorithm: 'HS256' as const,
} as const;

export const COOKIE_CONFIG = {
  secret: process.env.COOKIE_SECRET ?? 'dev-cookie-secret-change-in-production',
  name: 'alldata_token',
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  },
} as const;

export const SWAGGER_CONFIG = {
  title: '全域数据运营平台 API',
  description: '企业级全域数据分析与运营平台 API 文档',
  version: '1.0.0',
  path: '/docs',
  auth: {
    bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    cookie: { type: 'apiKey', in: 'cookie', name: 'alldata_token' },
  },
} as const;

export const PAGINATION_DEFAULTS = {
  page: 1,
  pageSize: 20,
  maxPageSize: 100,
} as const;

export const FILE_UPLOAD_CONFIG = {
  maxFileSize: 100 * 1024 * 1024,
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/json',
  ],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.xlsx', '.xls', '.csv', '.json'],
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
  tempDir: process.env.TEMP_DIR ?? './tmp',
} as const;

export const CACHE_CONFIG = {
  defaultTtl: 300,
  maxTtl: 86400,
  keyPrefix: 'alldata:',
  keyDelimiter: ':',
} as const;

export const EVENT_TYPES = {
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  PROJECT_CREATED: 'project.created',
  PROJECT_UPDATED: 'project.updated',
  PROJECT_DELETED: 'project.deleted',
  EVENT_CREATED: 'event.created',
  EVENT_UPDATED: 'event.updated',
  EVENT_PUBLISHED: 'event.published',
  TAG_CREATED: 'tag.created',
  TAG_UPDATED: 'tag.updated',
  DASHBOARD_CREATED: 'dashboard.created',
  DASHBOARD_UPDATED: 'dashboard.updated',
  ALERT_TRIGGERED: 'alert.triggered',
  ALERT_RESOLVED: 'alert.resolved',
  REPORT_GENERATED: 'report.generated',
  EXPORT_STARTED: 'export.started',
  EXPORT_COMPLETED: 'export.completed',
  EXPORT_FAILED: 'export.failed',
} as const;

export const PERMISSIONS = {
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  USER_DELETE: 'user:delete',
  PROJECT_READ: 'project:read',
  PROJECT_WRITE: 'project:write',
  PROJECT_DELETE: 'project:delete',
  PROJECT_MANAGE_MEMBERS: 'project:manage_members',
  EVENT_READ: 'event:read',
  EVENT_WRITE: 'event:write',
  EVENT_DELETE: 'event:delete',
  EVENT_PUBLISH: 'event:publish',
  TAG_READ: 'tag:read',
  TAG_WRITE: 'tag:write',
  TAG_DELETE: 'tag:delete',
  DASHBOARD_READ: 'dashboard:read',
  DASHBOARD_WRITE: 'dashboard:write',
  DASHBOARD_DELETE: 'dashboard:delete',
  DASHBOARD_SHARE: 'dashboard:share',
  INDICATOR_READ: 'indicator:read',
  INDICATOR_WRITE: 'indicator:write',
  INDICATOR_DELETE: 'indicator:delete',
  ALERT_READ: 'alert:read',
  ALERT_WRITE: 'alert:write',
  ALERT_DELETE: 'alert:delete',
  REPORT_READ: 'report:read',
  REPORT_WRITE: 'report:write',
  REPORT_DELETE: 'report:delete',
  FINANCE_READ: 'finance:read',
  FINANCE_WRITE: 'finance:write',
  FINANCE_DELETE: 'finance:delete',
  KOCRM_READ: 'kocrm:read',
  KOCRM_WRITE: 'kocrm:write',
  KOCRM_DELETE: 'kocrm:delete',
  ADMIN_ACCESS: 'admin:access',
  ADMIN_USERS: 'admin:users',
  ADMIN_PROJECTS: 'admin:projects',
  ADMIN_SYSTEM: 'admin:system',
  ADMIN_AUDIT: 'admin:audit',
} as const;

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  PROJECT_OWNER: 'project_owner',
  PROJECT_ADMIN: 'project_admin',
  ANALYST: 'analyst',
  OPERATOR: 'operator',
  VIEWER: 'viewer',
  GUEST: 'guest',
} as const;

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.ADMIN]: [
    ...Object.values(PERMISSIONS).filter(p => !p.startsWith('admin:')),
    PERMISSIONS.ADMIN_ACCESS,
    PERMISSIONS.ADMIN_USERS,
    PERMISSIONS.ADMIN_PROJECTS,
    PERMISSIONS.ADMIN_AUDIT,
  ],
  [ROLES.PROJECT_OWNER]: [
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.PROJECT_WRITE,
    PERMISSIONS.PROJECT_DELETE,
    PERMISSIONS.PROJECT_MANAGE_MEMBERS,
    PERMISSIONS.EVENT_READ,
    PERMISSIONS.EVENT_WRITE,
    PERMISSIONS.EVENT_DELETE,
    PERMISSIONS.EVENT_PUBLISH,
    PERMISSIONS.TAG_READ,
    PERMISSIONS.TAG_WRITE,
    PERMISSIONS.TAG_DELETE,
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.DASHBOARD_WRITE,
    PERMISSIONS.DASHBOARD_DELETE,
    PERMISSIONS.DASHBOARD_SHARE,
    PERMISSIONS.INDICATOR_READ,
    PERMISSIONS.INDICATOR_WRITE,
    PERMISSIONS.INDICATOR_DELETE,
    PERMISSIONS.ALERT_READ,
    PERMISSIONS.ALERT_WRITE,
    PERMISSIONS.ALERT_DELETE,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.REPORT_WRITE,
    PERMISSIONS.REPORT_DELETE,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.FINANCE_DELETE,
    PERMISSIONS.KOCRM_READ,
    PERMISSIONS.KOCRM_WRITE,
    PERMISSIONS.KOCRM_DELETE,
  ],
  [ROLES.PROJECT_ADMIN]: [
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.PROJECT_WRITE,
    PERMISSIONS.PROJECT_MANAGE_MEMBERS,
    PERMISSIONS.EVENT_READ,
    PERMISSIONS.EVENT_WRITE,
    PERMISSIONS.EVENT_DELETE,
    PERMISSIONS.EVENT_PUBLISH,
    PERMISSIONS.TAG_READ,
    PERMISSIONS.TAG_WRITE,
    PERMISSIONS.TAG_DELETE,
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.DASHBOARD_WRITE,
    PERMISSIONS.DASHBOARD_DELETE,
    PERMISSIONS.DASHBOARD_SHARE,
    PERMISSIONS.INDICATOR_READ,
    PERMISSIONS.INDICATOR_WRITE,
    PERMISSIONS.INDICATOR_DELETE,
    PERMISSIONS.ALERT_READ,
    PERMISSIONS.ALERT_WRITE,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.REPORT_WRITE,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.KOCRM_READ,
    PERMISSIONS.KOCRM_WRITE,
  ],
  [ROLES.ANALYST]: [
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.EVENT_READ,
    PERMISSIONS.EVENT_WRITE,
    PERMISSIONS.TAG_READ,
    PERMISSIONS.TAG_WRITE,
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.DASHBOARD_WRITE,
    PERMISSIONS.INDICATOR_READ,
    PERMISSIONS.INDICATOR_WRITE,
    PERMISSIONS.ALERT_READ,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.REPORT_WRITE,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.KOCRM_READ,
  ],
  [ROLES.OPERATOR]: [
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.EVENT_READ,
    PERMISSIONS.TAG_READ,
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.INDICATOR_READ,
    PERMISSIONS.ALERT_READ,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.KOCRM_READ,
  ],
  [ROLES.VIEWER]: [
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.EVENT_READ,
    PERMISSIONS.TAG_READ,
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.INDICATOR_READ,
    PERMISSIONS.ALERT_READ,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.KOCRM_READ,
  ],
  [ROLES.GUEST]: [
    PERMISSIONS.DASHBOARD_READ,
  ],
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  INVALID_OPERATION: 'INVALID_OPERATION',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
} as const;

export const LANGUAGES = {
  'zh-CN': { code: 'zh-CN', name: '简体中文', nativeName: '简体中文', flag: '🇨🇳' },
  'en-US': { code: 'en-US', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  'zh-TW': { code: 'zh-TW', name: '繁體中文', nativeName: '繁體中文', flag: '🇹🇼' },
  'ko-KR': { code: 'ko-KR', name: '한국어', nativeName: '한국어', flag: '🇰🇷' },
  'ja-JP': { code: 'ja-JP', name: '日本語', nativeName: '日本語', flag: '🇯🇵' },
  'vi-VN': { code: 'vi-VN', name: 'Tiếng Việt', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  'id-ID': { code: 'id-ID', name: 'Bahasa Indonesia', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  'th-TH': { code: 'th-TH', name: 'ไทย', nativeName: 'ไทย', flag: '🇹🇭' },
} as const;

export const TIMEZONES = [
  { value: 'Asia/Shanghai', label: '中国标准时间 (UTC+8)', offset: '+08:00' },
  { value: 'Asia/Hong_Kong', label: '香港时间 (UTC+8)', offset: '+08:00' },
  { value: 'Asia/Taipei', label: '台湾时间 (UTC+8)', offset: '+08:00' },
  { value: 'Asia/Seoul', label: '韩国标准时间 (UTC+9)', offset: '+09:00' },
  { value: 'Asia/Tokyo', label: '日本标准时间 (UTC+9)', offset: '+09:00' },
  { value: 'Asia/Ho_Chi_Minh', label: '越南时间 (UTC+7)', offset: '+07:00' },
  { value: 'Asia/Jakarta', label: '印尼西部时间 (UTC+7)', offset: '+07:00' },
  { value: 'Asia/Bangkok', label: '泰国时间 (UTC+7)', offset: '+07:00' },
  { value: 'UTC', label: '协调世界时 (UTC)', offset: '+00:00' },
  { value: 'America/Los_Angeles', label: '太平洋时间 (UTC-8/-7)', offset: '-08:00' },
  { value: 'America/New_York', label: '东部时间 (UTC-5/-4)', offset: '-05:00' },
  { value: 'Europe/London', label: '英国时间 (UTC+0/+1)', offset: '+00:00' },
  { value: 'Europe/Paris', label: '中欧时间 (UTC+1/+2)', offset: '+01:00' },
] as const;

export const CURRENCIES = [
  { code: 'CNY', symbol: '¥', name: '人民币', decimals: 2 },
  { code: 'USD', symbol: '$', name: '美元', decimals: 2 },
  { code: 'EUR', symbol: '€', name: '欧元', decimals: 2 },
  { code: 'JPY', symbol: '¥', name: '日元', decimals: 0 },
  { code: 'KRW', symbol: '₩', name: '韩元', decimals: 0 },
  { code: 'VND', symbol: '₫', name: '越南盾', decimals: 0 },
  { code: 'IDR', symbol: 'Rp', name: '印尼盾', decimals: 0 },
  { code: 'THB', symbol: '฿', name: '泰铢', decimals: 2 },
  { code: 'HKD', symbol: 'HK$', name: '港币', decimals: 2 },
  { code: 'TWD', symbol: 'NT$', name: '新台币', decimals: 2 },
] as const;

export const DATE_FORMATS = {
  short: 'YYYY-MM-DD',
  long: 'YYYY-MM-DD HH:mm:ss',
  dateTime: 'YYYY-MM-DD HH:mm',
  time: 'HH:mm:ss',
  iso: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  chinese: 'YYYY年MM月DD日',
  chineseFull: 'YYYY年MM月DD日 HH:mm',
} as const;

export const CHART_COLORS = {
  primary: ['#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'],
  secondary: ['#64748b', '#475569', '#334155', '#1e293b', '#0f172a'],
  success: ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'],
  warning: ['#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'],
  danger: ['#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'],
  info: ['#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63'],
  purple: ['#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87'],
  pink: ['#ec4899', '#db2777', '#be185d', '#9d174d', '#831843'],
  categorical: [
    '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
    '#14b8a6', '#fb923c', '#f43f5e', '#8b5cf6', '#0ea5e9',
  ],
} as const;

export const BREAKPOINTS = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1600,
} as const;

export const Z_INDEX = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
} as const;

export const STORAGE_KEYS = {
  token: 'alldata_token',
  refreshToken: 'alldata_refresh_token',
  user: 'alldata_user',
  project: 'alldata_project',
  locale: 'alldata_locale',
  theme: 'alldata_theme',
  sidebarCollapsed: 'alldata_sidebar_collapsed',
  recentProjects: 'alldata_recent_projects',
  dashboardLayouts: 'alldata_dashboard_layouts',
  userPreferences: 'alldata_user_preferences',
} as const;

export const REGEX_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^1[3-9]\d{9}$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  code: /^[a-zA-Z][a-zA-Z0-9_]*$/,
  color: /^#[0-9a-fA-F]{6}$/,
  ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  ipv6: /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
  chinese: /^[\u4e00-\u9fa5]+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
} as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_TIMEZONE = 'Asia/Shanghai';
export const DEFAULT_LOCALE = 'zh-CN';
export const DEFAULT_CURRENCY = 'CNY';
export const SESSION_TIMEOUT = 30 * 60 * 1000;
export const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000;

export const EXPORT_FORMATS = {
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: '.xlsx' },
  csv: { mime: 'text/csv', ext: '.csv' },
  json: { mime: 'application/json', ext: '.json' },
  pdf: { mime: 'application/pdf', ext: '.pdf' },
} as const;

export const CHART_TYPES = {
  line: { name: '折线图', category: 'trend' },
  bar: { name: '柱状图', category: 'comparison' },
  pie: { name: '饼图', category: 'proportion' },
  area: { name: '面积图', category: 'trend' },
  scatter: { name: '散点图', category: 'correlation' },
  radar: { name: '雷达图', category: 'comparison' },
  gauge: { name: '仪表盘', category: 'kpi' },
  funnel: { name: '漏斗图', category: 'conversion' },
  sankey: { name: '桑基图', category: 'flow' },
  heatmap: { name: '热力图', category: 'density' },
  treemap: { name: '矩形树图', category: 'hierarchy' },
  sunburst: { name: '旭日图', category: 'hierarchy' },
  wordcloud: { name: '词云', category: 'text' },
  candlestick: { name: 'K线图', category: 'financial' },
  boxplot: { name: '箱线图', category: 'distribution' },
  violin: { name: '小提琴图', category: 'distribution' },
} as const;

export type LanguageCode = keyof typeof LANGUAGES;
export type TimezoneValue = (typeof TIMEZONES)[number]['value'];
export type CurrencyCode = (typeof CURRENCIES)[number]['code'];
export type ChartType = keyof typeof CHART_TYPES;
export type Role = keyof typeof ROLES;
export type Permission = keyof typeof PERMISSIONS;
export type EventType = keyof typeof EVENT_TYPES;
export type ErrorCode = keyof typeof ERROR_CODES;
export type HttpStatus = keyof typeof HTTP_STATUS;