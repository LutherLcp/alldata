/**
 * Harness — 种子数据工厂（完整版）
 * 基于 @faker-js/faker 生成真实感的测试数据，覆盖 V1-V5
 */
import { faker } from '@faker-js/faker/locale/zh_CN';
import type {
  User, Project, Dashboard, DashboardFolder, Report, Story,
  EventDefinition, UserTag, Metric, Warning,
  Notice, DownloadTask, VersionCalendar,
  Category, DataTable,
  ChartDataSeries, AnalysisResult,
} from '@alldata/shared';

let idCounter = 1;
const nextId = () => idCounter++;
export const resetIdCounter = () => { idCounter = 1; };

// ============================================================
// 用户与项目
// ============================================================

export function createUser(overrides: Partial<User> = {}): User {
  return {
    id: nextId(),
    username: faker.internet.username(),
    email: faker.internet.email(),
    avatar: faker.image.avatar(),
    status: 1,
    lang: 'zh_CN',
    login_method: 'password',
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

export function createProject(overrides: Partial<Project> = {}): Project {
  const name = faker.company.name() + '数据项目';
  return {
    id: nextId(),
    code: faker.string.alphanumeric(8).toLowerCase(),
    name,
    description: faker.lorem.sentence(),
    status: 1,
    config: { timezone: 'Asia/Shanghai', currency: 'CNY', primary_color: '#1677ff' },
    created_by: 1,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

// ============================================================
// 看板域
// ============================================================

export function createFolder(overrides: Partial<DashboardFolder> = {}): DashboardFolder {
  return {
    id: nextId(),
    project_id: 1,
    parent_id: null,
    name: faker.commerce.department() + '看板',
    type: 1,
    sort_order: faker.number.int({ min: 0, max: 100 }),
    created_by: 1,
    created_at: faker.date.past().toISOString(),
    ...overrides,
  };
}

export function createDashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  return {
    id: nextId(),
    project_id: 1,
    folder_id: undefined,
    name: faker.commerce.productName() + ' Dashboard',
    description: faker.lorem.paragraph(),
    type: 1,
    status: 1,
    layout: [],
    config: {},
    common_filters: [],
    created_by: 1,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

export function createReport(dashboardId: number, overrides: Partial<Report> = {}): Report {
  const id = nextId();
  const chartTypes = ['line', 'bar', 'pie', 'area', 'scatter'] as const;
  return {
    id,
    project_id: 1,
    dashboard_id: dashboardId,
    name: faker.commerce.productName() + ' 报表',
    type: 'chart',
    chart_type: faker.helpers.arrayElement(chartTypes),
    query_config: {
      analysis_type: 'event',
      date_range: { start: '2026-06-01', end: '2026-06-30', granularity: 'day' },
      metrics: [{ event_name: 'page_view', agg_type: 'count' }],
    },
    chart_config: {},
    position: { i: String(id), x: 0, y: 0, w: 6, h: 4 },
    created_by: 1,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

// ============================================================
// 分析数据
// ============================================================

export function createTimeSeriesData(days = 30, seriesCount = 3): ChartDataSeries[] {
  const series: ChartDataSeries[] = [];
  const names = ['总量', '新用户', '活跃用户', '付费用户', '留存用户'];

  for (let s = 0; s < seriesCount; s++) {
    const data: Array<{ x: string; y: number }> = [];
    let baseValue = faker.number.int({ min: 1000, max: 50000 });

    for (let d = 0; d < days; d++) {
      const date = new Date();
      date.setDate(date.getDate() - days + d);
      const fluctuation = faker.number.float({ min: -0.15, max: 0.15 });
      baseValue = Math.max(100, Math.round(baseValue * (1 + fluctuation)));
      data.push({ x: date.toISOString().split('T')[0], y: baseValue });
    }

    series.push({ name: names[s] || `系列${s + 1}`, data });
  }
  return series;
}

export function createAnalysisResult(type: string = 'event'): AnalysisResult {
  const days = 30;
  const chartData = createTimeSeriesData(days, type === 'funnel' ? 1 : 3);

  return {
    columns: [
      { key: 'date', label: '日期', data_type: 'date' },
      { key: 'value', label: '数值', data_type: 'number' },
      { key: 'group', label: '分组', data_type: 'string' },
    ],
    rows: chartData[0].data.map((d) => ({
      date: d.x,
      value: d.y,
      group: '总量',
    })),
    chart_data: chartData,
  };
}

export function createFunnelData(steps = 5): AnalysisResult {
  const stepNames = ['访问首页', '浏览商品', '加入购物车', '提交订单', '支付成功'];
  let total = faker.number.int({ min: 50000, max: 200000 });
  const rows = stepNames.slice(0, steps).map((name, i) => {
    if (i > 0) total = Math.round(total * faker.number.float({ min: 0.4, max: 0.85 }));
    return { step: name, value: total, rate: i === 0 ? 1 : total / (rows?.[0]?.value ?? total) };
  });
  const rows2 = rows as Record<string, unknown>[];
  return {
    columns: [
      { key: 'step', label: '步骤', data_type: 'string' },
      { key: 'value', label: '用户数', data_type: 'number' },
      { key: 'rate', label: '转化率', data_type: 'number' },
    ],
    rows: rows2,
    chart_data: [{ name: '漏斗', data: rows2.map((r) => ({ x: r.step as string, y: r.value as number })) }],
  };
}

export function createRetentionData(days = 14): AnalysisResult {
  const rows: Record<string, unknown>[] = [];
  for (let d = 0; d < 7; d++) {
    const date = new Date();
    date.setDate(date.getDate() - 14 + d);
    const row: Record<string, unknown> = { date: date.toISOString().split('T')[0] };
    let retention = 100;
    for (let r = 0; r <= days; r++) {
      if (r > 0) retention = Math.max(0, retention * faker.number.float({ min: 0.7, max: 0.95 }));
      row[`day_${r}`] = Math.round(retention * 100) / 100;
    }
    rows.push(row);
  }
  return {
    columns: [
      { key: 'date', label: '日期', data_type: 'date' },
      ...Array.from({ length: days + 1 }, (_, i) => ({
        key: `day_${i}`, label: `Day ${i}`, data_type: 'number' as const,
      })),
    ],
    rows,
    chart_data: [],
  };
}

// ============================================================
// 埋点域
// ============================================================

export function createStory(overrides: Partial<Story> = {}): Story {
  return {
    id: nextId(),
    project_id: 1,
    name: faker.company.buzzPhrase() + ' 埋点需求',
    docs_url: faker.internet.url(),
    status: faker.helpers.arrayElement([1, 2, 3, 4, 5]) as 1,
    created_by: 1,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

export function createEvent(overrides: Partial<EventDefinition> = {}): EventDefinition {
  const eventNames = [
    'page_view', 'button_click', 'form_submit', 'purchase', 'sign_up',
    'login', 'share', 'add_to_cart', 'search', 'download',
  ];
  return {
    id: nextId(),
    project_id: 1,
    name: faker.helpers.arrayElement(eventNames) + '_' + faker.string.alphanumeric(4),
    display_name: faker.commerce.productAdjective() + '事件',
    description: faker.lorem.sentence(),
    status: 1,
    properties: [
      { id: nextId(), event_id: 0, name: 'page', data_type: 'string', is_required: true, sort_order: 0 },
      { id: nextId(), event_id: 0, name: 'duration', data_type: 'number', is_required: false, sort_order: 1 },
    ],
    created_at: faker.date.past().toISOString(),
    ...overrides,
  };
}

// ============================================================
// 标签 / 指标 / 属性
// ============================================================

export function createTag(overrides: Partial<UserTag> = {}): UserTag {
  const tagTypes = ['sql', 'condition', 'metric', 'id', 'times'] as const;
  return {
    id: nextId(),
    project_id: 1,
    name: faker.word.adjective() + '_users',
    display_name: faker.word.adjective() + '用户',
    tag_type: faker.helpers.arrayElement(tagTypes),
    entity_type: 'user',
    status: 1,
    config: {},
    entity_count: faker.number.int({ min: 100, max: 500000 }),
    description: faker.lorem.sentence(),
    created_by: 1,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

export function createMetric(overrides: Partial<Metric> = {}): Metric {
  return {
    id: nextId(),
    project_id: 1,
    name: faker.word.noun() + '_metric',
    display_name: faker.word.noun() + '指标',
    status: 1,
    formula: {
      type: 'simple',
      event_name: 'page_view',
      agg_type: faker.helpers.arrayElement(['count', 'uv', 'sum']),
    },
    description: faker.lorem.sentence(),
    created_by: 1,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

export function createCategory(type: string, overrides: Partial<Category> = {}): Category {
  return {
    id: nextId(),
    project_id: 1,
    parent_id: null,
    name: faker.commerce.department(),
    type,
    level: 1,
    sort_order: 0,
    created_at: faker.date.past().toISOString(),
    ...overrides,
  };
}

export function createDataTable(overrides: Partial<DataTable> = {}): DataTable {
  return {
    id: nextId(),
    project_id: 1,
    name: faker.word.noun() + '_events',
    display_name: faker.word.noun() + '事件表',
    description: faker.lorem.sentence(),
    type: 'event',
    status: 1,
    row_count: faker.number.int({ min: 10000, max: 100000000 }),
    columns: [
      { id: nextId(), datatable_id: 0, name: 'user_id', display_name: '用户ID', data_type: 'string', is_dimension: true, sort_order: 0 },
      { id: nextId(), datatable_id: 0, name: 'event_time', display_name: '事件时间', data_type: 'date', is_dimension: false, sort_order: 1 },
      { id: nextId(), datatable_id: 0, name: 'event_name', display_name: '事件名', data_type: 'string', is_dimension: true, sort_order: 2 },
      { id: nextId(), datatable_id: 0, name: 'duration', display_name: '时长', data_type: 'number', is_dimension: false, sort_order: 3 },
    ],
    created_by: 1,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

// ============================================================
// 预警 / 通知 / 管理功能
// ============================================================

export function createWarning(overrides: Partial<Warning> = {}): Warning {
  return {
    id: nextId(),
    project_id: 1,
    name: faker.word.adjective() + '数据预警',
    status: 1,
    monitor_rules: [{
      metric: { event_name: 'page_view', agg_type: 'count' },
      condition: { operator: 'lt', threshold: faker.number.int({ min: 100, max: 10000 }) },
      date_range: { start: '2026-06-01', end: '2026-06-30' },
    }],
    notify_config: { channels: ['in_app', 'email'] },
    check_cron: '*/5 * * * *',
    created_by: 1,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

export function createNotice(overrides: Partial<Notice> = {}): Notice {
  return {
    id: nextId(),
    title: faker.lorem.sentence({ min: 3, max: 8 }),
    content: faker.lorem.paragraphs(2),
    type: 'system',
    status: 2,
    is_read: faker.datatype.boolean(),
    publish_at: faker.date.recent().toISOString(),
    created_by: 1,
    created_at: faker.date.past().toISOString(),
    ...overrides,
  };
}

export function createDownloadTask(overrides: Partial<DownloadTask> = {}): DownloadTask {
  const status = faker.helpers.arrayElement([1, 2, 3, 4]) as 1;
  return {
    id: nextId(),
    project_id: 1,
    task_name: faker.commerce.productName() + ' 导出',
    task_type: faker.helpers.arrayElement(['report', 'datatable', 'analysis']),
    status,
    progress: status === 3 ? 100 : status === 4 ? 0 : faker.number.int({ min: 0, max: 99 }),
    file_url: status === 3 ? faker.internet.url() + '/file.xlsx' : undefined,
    file_size: status === 3 ? faker.number.int({ min: 1024, max: 104857600 }) : undefined,
    created_by: 1,
    created_at: faker.date.past().toISOString(),
    finished_at: status >= 3 ? faker.date.recent().toISOString() : undefined,
    ...overrides,
  };
}

export function createCalendar(overrides: Partial<VersionCalendar> = {}): VersionCalendar {
  const start = faker.date.soon({ days: 30 });
  return {
    id: nextId(),
    project_id: 1,
    title: `v${faker.number.int({ min: 1, max: 10 })}.${faker.number.int({ min: 0, max: 20 })}.0`,
    description: faker.lorem.sentence(),
    start_date: start.toISOString().split('T')[0],
    end_date: new Date(start.getTime() + 7 * 86400000).toISOString().split('T')[0],
    type: 'version',
    status: 1,
    created_by: 1,
    created_at: faker.date.past().toISOString(),
    ...overrides,
  };
}

// ============================================================
// 批量生成
// ============================================================

export interface SeedDataSet {
  users: User[];
  projects: Project[];
  folders: DashboardFolder[];
  dashboards: Dashboard[];
  reports: Report[];
  stories: Story[];
  events: EventDefinition[];
  tags: UserTag[];
  metrics: Metric[];
  categories: Category[];
  dataTables: DataTable[];
  warnings: Warning[];
  notices: Notice[];
  downloads: DownloadTask[];
  calendars: VersionCalendar[];
}

export function generateFullSeedData(): SeedDataSet {
  resetIdCounter();

  const users = Array.from({ length: 10 }, () => createUser());
  const projects = Array.from({ length: 3 }, () => createProject());

  // 为第一个项目生成完整数据
  const projectId = projects[0].id;
  const folders = Array.from({ length: 5 }, () => createFolder({ project_id: projectId }));
  const dashboards = folders.flatMap((f) =>
    Array.from({ length: faker.number.int({ min: 1, max: 4 }) }, () =>
      createDashboard({ project_id: projectId, folder_id: f.id })
    )
  );
  const reports = dashboards.flatMap((d) =>
    Array.from({ length: faker.number.int({ min: 2, max: 6 }) }, (_, i) => {
      const r = createReport(d.id, { project_id: projectId });
      r.position = { i: String(r.id), x: (i % 2) * 6, y: Math.floor(i / 2) * 4, w: 6, h: 4 };
      return r;
    })
  );

  // 更新 dashboard layout
  dashboards.forEach((d) => {
    d.layout = reports
      .filter((r) => r.dashboard_id === d.id)
      .map((r) => r.position);
  });

  const stories = Array.from({ length: 8 }, () => createStory({ project_id: projectId }));
  const events = Array.from({ length: 20 }, () => createEvent({ project_id: projectId }));
  const tags = Array.from({ length: 15 }, () => createTag({ project_id: projectId }));
  const metrics = Array.from({ length: 10 }, () => createMetric({ project_id: projectId }));
  const categories = [
    ...Array.from({ length: 3 }, () => createCategory('user_tag', { project_id: projectId })),
    ...Array.from({ length: 3 }, () => createCategory('metric', { project_id: projectId })),
    ...Array.from({ length: 2 }, () => createCategory('datatable', { project_id: projectId })),
  ];
  const dataTables = Array.from({ length: 5 }, () => createDataTable({ project_id: projectId }));
  const warnings = Array.from({ length: 5 }, () => createWarning({ project_id: projectId }));
  const notices = Array.from({ length: 10 }, () => createNotice());
  const downloads = Array.from({ length: 8 }, () => createDownloadTask({ project_id: projectId }));
  const calendars = Array.from({ length: 6 }, () => createCalendar({ project_id: projectId }));

  return {
    users, projects, folders, dashboards, reports,
    stories, events, tags, metrics, categories,
    dataTables, warnings, notices, downloads, calendars,
  };
}
/**
 * Harness — 种子数据工厂
 * 使用 @faker-js/faker 生成 Mock 数据
 */
import { faker } from '@faker-js/faker';
import type { User, Project, LoginResponse, UserInfo } from '@alldata/shared/types/index.js';

/** 生成 Mock 用户 */
export function createUser(overrides?: Partial<User>): User {
  return {
    id: faker.number.int({ min: 1, max: 10000 }),
    username: faker.internet.username(),
    email: faker.internet.email(),
    avatar: faker.image.avatar(),
    status: 1,
    lang: 'zh_CN',
    login_method: 'password',
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

/** 生成 Mock 项目 */
export function createProject(overrides?: Partial<Project>): Project {
  return {
    id: faker.number.int({ min: 1, max: 1000 }),
    code: faker.helpers.slugify(faker.company.name()).toLowerCase().slice(0, 20),
    name: faker.company.name(),
    description: faker.company.catchPhrase(),
    status: 1,
    config: {},
    created_by: 1,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

/** 生成 Mock 用户信息 */
export function createUserInfo(overrides?: Partial<UserInfo>): UserInfo {
  return {
    id: 1,
    username: 'admin',
    email: 'admin@alldata.dev',
    avatar: faker.image.avatar(),
    lang: 'zh_CN',
    permissions: ['*'],
    projects: [createProject()],
    ...overrides,
  };
}

/** 生成 Mock 登录响应 */
export function createLoginResponse(): LoginResponse {
  return {
    token: `mock-jwt-token-${faker.string.alphanumeric(32)}`,
    refresh_token: `mock-refresh-token-${faker.string.alphanumeric(32)}`,
    user_info: createUserInfo(),
    expire_at: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
  };
}

/** 批量生成 */
export function createUsers(count: number): User[] {
  return Array.from({ length: count }, () => createUser());
}

export function createProjects(count: number): Project[] {
  return Array.from({ length: count }, () => createProject());
}

/** 种子数据集合 */
export function createSeedData() {
  const admin = createUser({
    id: 1,
    username: 'admin',
    email: 'admin@alldata.dev',
  });

  const projects = createProjects(3).map((p, i) => ({
    ...p,
    id: i + 1,
    name: `项目 ${i + 1}`,
    code: `project-${i + 1}`,
  }));

  return {
    admin,
    projects,
    loginResponse: createLoginResponse(),
  };
}
/**
 * Mock Server — 种子数据工厂
 *
 * 基于 @faker-js/faker 生成真实感的测试数据
 */
import { faker } from '@faker-js/faker/locale/zh_CN';
import type {
  User, Project, Dashboard, DashboardFolder, Report, Story,
  EventDefinition, UserTag, Metric, Warning, Subscription,
  Notice, DownloadTask, VersionCalendar, EnumDefinition,
  Category, EntityType, DataTable, DataTableColumn, Attribute,
  ChartDataSeries, AnalysisResult, SoftLink, PushConfig,
  GridLayoutItem,
} from '@alldata/shared';

let idCounter = 1;
const nextId = () => idCounter++;
export const resetIdCounter = () => { idCounter = 1; };

// ============================================================
// 用户与项目
// ============================================================

export function createUser(overrides: Partial<User> = {}): User {
  return {
    id: nextId(),
    username: faker.internet.username(),
    email: faker.internet.email(),
    avatar: faker.image.avatar(),
    status: 1,
    lang: 'zh_CN',
    login_method: 'password',
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

export function createProject(overrides: Partial<Project> = {}): Project {
  const name = faker.company.name() + '数据项目';
  return {
    id: nextId(),
    code: faker.string.alphanumeric(8).toLowerCase(),
    name,
    description: faker.lorem.sentence(),
    status: 1,
    config: { timezone: 'Asia/Shanghai', currency: 'CNY', primary_color: '#1677ff' },
    created_by: 1,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

// ============================================================
// 看板域
// ============================================================

export function createFolder(overrides: Partial<DashboardFolder> = {}): DashboardFolder {
  return {
    id: nextId(),
    project_id: 1,
    parent_id: null,
    name: faker.commerce.department() + '看板',
    type: 1,
    sort_order: faker.number.int({ min: 0, max: 100 }),
    created_by: 1,
    created_at: faker.date.past().toISOString(),
    ...overrides,
  };
}

export function createDashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  return {
    id: nextId(),
    project_id: 1,
    folder_id: undefined,
    name: faker.commerce.productName() + ' Dashboard',
    description: faker.lorem.paragraph(),
    type: 1,
    status: 1,
    layout: [],
    config: {},
    common_filters: [],
    created_by: 1,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

export function createReport(dashboardId: number, overrides: Partial<Report> = {}): Report {
  const id = nextId();
  const chartTypes = ['line', 'bar', 'pie', 'area', 'scatter'] as const;
  return {
    id,
    project_id: 1,
    dashboard_id: dashboardId,
    name: faker.commerce.productName() + ' 报表',
    type: 'chart',
    chart_type: faker.helpers.arrayElement(chartTypes),
    query_config: {
      analysis_type: 'event',
      date_range: { start: '2026-06-01', end: '2026-06-30', granularity: 'day' },
      metrics: [{ event_name: 'page_view', agg_type: 'count' }],
    },
    chart_config: {},
    position: { i: String(id), x: 0, y: 0, w: 6, h: 4 },
    created_by: 1,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

// ============================================================
// 分析数据
// ============================================================

export function createTimeSeriesData(days = 30, seriesCount = 3): ChartDataSeries[] {
  const series: ChartDataSeries[] = [];
  const names = ['总量', '新用户', '活跃用户', '付费用户', '留存用户'];

  for (let s = 0; s < seriesCount; s++) {
    const data: Array<{ x: string; y: number }> = [];
    let baseValue = faker.number.int({ min: 1000, max: 50000 });

    for (let d = 0; d < days; d++) {
      const date = new Date();
      date.setDate(date.getDate() - days + d);
      const fluctuation = faker.number.float({ min: -0.15, max: 0.15 });
      baseValue = Math.max(100, Math.round(baseValue * (1 + fluctuation)));
      data.push({ x: date.toISOString().split('T')[0], y: baseValue });
    }

    series.push({ name: names[s] || `系列${s + 1}`, data });
  }
  return series;
}

export function createAnalysisResult(type: string = 'event'): AnalysisResult {
  const days = 30;
  const chartData = createTimeSeriesData(days, type === 'funnel' ? 1 : 3);

  return {
    columns: [
      { key: 'date', label: '日期', data_type: 'date' },
      { key: 'value', label: '数值', data_type: 'number' },
      { key: 'group', label: '分组', data_type: 'string' },
    ],
    rows: chartData[0].data.map((d) => ({
      date: d.x,
      value: d.y,
      group: '总量',
    })),
    chart_data: chartData,
  };
}

export function createFunnelData(steps = 5): AnalysisResult {
  const stepNames = ['访问首页', '浏览商品', '加入购物车', '提交订单', '支付成功'];
  let total = faker.number.int({ min: 50000, max: 200000 });
  const rows = stepNames.slice(0, steps).map((name, i) => {
    if (i > 0) total = Math.round(total * faker.number.float({ min: 0.4, max: 0.85 }));
    return { step: name, value: total, rate: i === 0 ? 1 : total / (rows?.[0]?.value ?? total) };
  });
  const rows2 = rows as Record<string, unknown>[];
  return {
    columns: [
      { key: 'step', label: '步骤', data_type: 'string' },
      { key: 'value', label: '用户数', data_type: 'number' },
      { key: 'rate', label: '转化率', data_type: 'number' },
    ],
    rows: rows2,
    chart_data: [{ name: '漏斗', data: rows2.map((r) => ({ x: r.step as string, y: r.value as number })) }],
  };
}

export function createRetentionData(days = 14): AnalysisResult {
  const rows: Record<string, unknown>[] = [];
  for (let d = 0; d < 7; d++) {
    const date = new Date();
    date.setDate(date.getDate() - 14 + d);
    const row: Record<string, unknown> = { date: date.toISOString().split('T')[0] };
    let retention = 100;
    for (let r = 0; r <= days; r++) {
      if (r > 0) retention = Math.max(0, retention * faker.number.float({ min: 0.7, max: 0.95 }));
      row[`day_${r}`] = Math.round(retention * 100) / 100;
    }
    rows.push(row);
  }
  return {
    columns: [
      { key: 'date', label: '日期', data_type: 'date' },
      ...Array.from({ length: days + 1 }, (_, i) => ({
        key: `day_${i}`, label: `Day ${i}`, data_type: 'number' as const,
      })),
    ],
    rows,
    chart_data: [],
  };
}

// ============================================================
// 埋点域
// ============================================================

export function createStory(overrides: Partial<Story> = {}): Story {
  return {
    id: nextId(),
    project_id: 1,
    name: faker.company.buzzPhrase() + ' 埋点需求',
    docs_url: faker.internet.url(),
    status: faker.helpers.arrayElement([1, 2, 3, 4, 5]) as 1,
    created_by: 1,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

export function createEvent(overrides: Partial<EventDefinition> = {}): EventDefinition {
  const eventNames = [
    'page_view', 'button_click', 'form_submit', 'purchase', 'sign_up',
    'login', 'share', 'add_to_cart', 'search', 'download',
  ];
  return {
    id: nextId(),
    project_id: 1,
    name: faker.helpers.arrayElement(eventNames) + '_' + faker.string.alphanumeric(4),
    display_name: faker.commerce.productAdjective() + '事件',
    description: faker.lorem.sentence(),
    status: 1,
    properties: [
      { id: nextId(), event_id: 0, name: 'page', data_type: 'string', is_required: true, sort_order: 0 },
      { id: nextId(), event_id: 0, name: 'duration', data_type: 'number', is_required: false, sort_order: 1 },
    ],
    created_at: faker.date.past().toISOString(),
    ...overrides,
  };
}

// ============================================================
// 标签 / 指标 / 属性
// ============================================================

export function createTag(overrides: Partial<UserTag> = {}): UserTag {
  const tagTypes = ['sql', 'condition', 'metric', 'id', 'times'] as const;
  return {
    id: nextId(),
    project_id: 1,
    name: faker.word.adjective() + '_users',
    display_name: faker.word.adjective() + '用户',
    tag_type: faker.helpers.arrayElement(tagTypes),
    entity_type: 'user',
    status: 1,
    config: {},
    entity_count: faker.number.int({ min: 100, max: 500000 }),
    description: faker.lorem.sentence(),
    created_by: 1,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

export function createMetric(overrides: Partial<Metric> = {}): Metric {
  return {
    id: nextId(),
    project_id: 1,
    name: faker.word.noun() + '_metric',
    display_name: faker.word.noun() + '指标',
    status: 1,
    formula: {
      type: 'simple',
      event_name: 'page_view',
      agg_type: faker.helpers.arrayElement(['count', 'uv', 'sum']),
    },
    description: faker.lorem.sentence(),
    created_by: 1,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

export function createCategory(type: string, overrides: Partial<Category> = {}): Category {
  return {
    id: nextId(),
    project_id: 1,
    parent_id: null,
    name: faker.commerce.department(),
    type,
    level: 1,
    sort_order: 0,
    created_at: faker.date.past().toISOString(),
    ...overrides,
  };
}

export function createDataTable(overrides: Partial<DataTable> = {}): DataTable {
  return {
    id: nextId(),
    project_id: 1,
    name: faker.word.noun() + '_events',
    display_name: faker.word.noun() + '事件表',
    description: faker.lorem.sentence(),
    type: 'event',
    status: 1,
    row_count: faker.number.int({ min: 10000, max: 100000000 }),
    columns: [
      { id: nextId(), datatable_id: 0, name: 'user_id', display_name: '用户ID', data_type: 'string', is_dimension: true, sort_order: 0 },
      { id: nextId(), datatable_id: 0, name: 'event_time', display_name: '事件时间', data_type: 'date', is_dimension: false, sort_order: 1 },
      { id: nextId(), datatable_id: 0, name: 'event_name', display_name: '事件名', data_type: 'string', is_dimension: true, sort_order: 2 },
      { id: nextId(), datatable_id: 0, name: 'duration', display_name: '时长', data_type: 'number', is_dimension: false, sort_order: 3 },
    ],
    created_by: 1,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

// ============================================================
// 预警 / 通知 / 管理功能
// ============================================================

export function createWarning(overrides: Partial<Warning> = {}): Warning {
  return {
    id: nextId(),
    project_id: 1,
    name: faker.word.adjective() + '数据预警',
    status: 1,
    monitor_rules: [{
      metric: { event_name: 'page_view', agg_type: 'count' },
      condition: { operator: 'lt', threshold: faker.number.int({ min: 100, max: 10000 }) },
      date_range: { start: '2026-06-01', end: '2026-06-30' },
    }],
    notify_config: { channels: ['in_app', 'email'] },
    check_cron: '*/5 * * * *',
    created_by: 1,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

export function createNotice(overrides: Partial<Notice> = {}): Notice {
  return {
    id: nextId(),
    title: faker.lorem.sentence({ min: 3, max: 8 }),
    content: faker.lorem.paragraphs(2),
    type: 'system',
    status: 2,
    is_read: faker.datatype.boolean(),
    publish_at: faker.date.recent().toISOString(),
    created_by: 1,
    created_at: faker.date.past().toISOString(),
    ...overrides,
  };
}

export function createDownloadTask(overrides: Partial<DownloadTask> = {}): DownloadTask {
  const status = faker.helpers.arrayElement([1, 2, 3, 4]) as 1;
  return {
    id: nextId(),
    project_id: 1,
    task_name: faker.commerce.productName() + ' 导出',
    task_type: faker.helpers.arrayElement(['report', 'datatable', 'analysis']),
    status,
    progress: status === 3 ? 100 : status === 4 ? 0 : faker.number.int({ min: 0, max: 99 }),
    file_url: status === 3 ? faker.internet.url() + '/file.xlsx' : undefined,
    file_size: status === 3 ? faker.number.int({ min: 1024, max: 104857600 }) : undefined,
    created_by: 1,
    created_at: faker.date.past().toISOString(),
    finished_at: status >= 3 ? faker.date.recent().toISOString() : undefined,
    ...overrides,
  };
}

export function createCalendar(overrides: Partial<VersionCalendar> = {}): VersionCalendar {
  const start = faker.date.soon({ days: 30 });
  return {
    id: nextId(),
    project_id: 1,
    title: `v${faker.number.int({ min: 1, max: 10 })}.${faker.number.int({ min: 0, max: 20 })}.0`,
    description: faker.lorem.sentence(),
    start_date: start.toISOString().split('T')[0],
    end_date: new Date(start.getTime() + 7 * 86400000).toISOString().split('T')[0],
    type: 'version',
    status: 1,
    created_by: 1,
    created_at: faker.date.past().toISOString(),
    ...overrides,
  };
}

// ============================================================
// 批量生成
// ============================================================

export interface SeedDataSet {
  users: User[];
  projects: Project[];
  folders: DashboardFolder[];
  dashboards: Dashboard[];
  reports: Report[];
  stories: Story[];
  events: EventDefinition[];
  tags: UserTag[];
  metrics: Metric[];
  categories: Category[];
  dataTables: DataTable[];
  warnings: Warning[];
  notices: Notice[];
  downloads: DownloadTask[];
  calendars: VersionCalendar[];
}

export function generateFullSeedData(): SeedDataSet {
  resetIdCounter();

  const users = Array.from({ length: 10 }, () => createUser());
  const projects = Array.from({ length: 3 }, () => createProject());

  // 为第一个项目生成完整数据
  const projectId = projects[0].id;
  const folders = Array.from({ length: 5 }, () => createFolder({ project_id: projectId }));
  const dashboards = folders.flatMap((f) =>
    Array.from({ length: faker.number.int({ min: 1, max: 4 }) }, () =>
      createDashboard({ project_id: projectId, folder_id: f.id })
    )
  );
  const reports = dashboards.flatMap((d) =>
    Array.from({ length: faker.number.int({ min: 2, max: 6 }) }, (_, i) => {
      const r = createReport(d.id, { project_id: projectId });
      r.position = { i: String(r.id), x: (i % 2) * 6, y: Math.floor(i / 2) * 4, w: 6, h: 4 };
      return r;
    })
  );

  // 更新 dashboard layout
  dashboards.forEach((d) => {
    d.layout = reports
      .filter((r) => r.dashboard_id === d.id)
      .map((r) => r.position);
  });

  const stories = Array.from({ length: 8 }, () => createStory({ project_id: projectId }));
  const events = Array.from({ length: 20 }, () => createEvent({ project_id: projectId }));
  const tags = Array.from({ length: 15 }, () => createTag({ project_id: projectId }));
  const metrics = Array.from({ length: 10 }, () => createMetric({ project_id: projectId }));
  const categories = [
    ...Array.from({ length: 3 }, () => createCategory('user_tag', { project_id: projectId })),
    ...Array.from({ length: 3 }, () => createCategory('metric', { project_id: projectId })),
    ...Array.from({ length: 2 }, () => createCategory('datatable', { project_id: projectId })),
  ];
  const dataTables = Array.from({ length: 5 }, () => createDataTable({ project_id: projectId }));
  const warnings = Array.from({ length: 5 }, () => createWarning({ project_id: projectId }));
  const notices = Array.from({ length: 10 }, () => createNotice());
  const downloads = Array.from({ length: 8 }, () => createDownloadTask({ project_id: projectId }));
  const calendars = Array.from({ length: 6 }, () => createCalendar({ project_id: projectId }));

  return {
    users, projects, folders, dashboards, reports,
    stories, events, tags, metrics, categories,
    dataTables, warnings, notices, downloads, calendars,
  };
}
