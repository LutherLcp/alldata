/**
 * Harness — MSW Mock Handlers
 * 覆盖 V1-V5 全量 API
 */
import { http, HttpResponse, delay } from 'msw';
import { ERROR_CODES } from '@alldata/shared';
import {
  generateFullSeedData, createAnalysisResult,
  createFunnelData, createRetentionData,
  createDashboard,
} from '../seed/factories.js';
import type { SeedDataSet } from '../seed/factories.js';

// 全局 Mock 数据存储
let mockData: SeedDataSet = generateFullSeedData();
let mockToken = 'mock-jwt-token-' + Date.now();

/** 重置 Mock 数据 */
export function resetMockData() {
  mockData = generateFullSeedData();
  mockToken = 'mock-jwt-token-' + Date.now();
}

/** 统一响应格式 */
function ok<T>(data: T) {
  return HttpResponse.json({ code: 200, message: 'success', data });
}

function page<T>(list: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const sliced = list.slice(start, end);
  return HttpResponse.json({
    code: 200,
    message: 'success',
    data: {
      list: sliced,
      page_info: {
        current_page: page,
        page_size: pageSize,
        total_page: Math.ceil(list.length / pageSize),
        total: list.length,
      },
    },
  });
}

function error(code: number, message: string) {
  return HttpResponse.json({ code, message, data: null });
}

// ============================================================
// Handler 定义
// ============================================================

export const handlers = [
  // ---- 认证 ----
  http.post('*/api/v1/login', async ({ request }) => {
    await delay(300);
    const body = await request.json() as Record<string, string>;
    if (!body.username || !body.password) {
      return error(400, '用户名或密码不能为空');
    }
    const user = mockData.users[0];
    return ok({
      token: mockToken,
      refresh_token: 'mock-refresh-token',
      user_info: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        lang: user.lang,
        projects: mockData.projects.map((p) => ({ id: p.id, code: p.code, name: p.name })),
      },
      expire_at: Date.now() + 7 * 24 * 3600 * 1000,
    });
  }),

  http.post('*/api/v1/logout', async () => {
    await delay(100);
    return ok(null);
  }),

  http.get('*/api/v1/user-info', async ({ request }) => {
    await delay(200);
    const auth = request.headers.get('Authorization');
    if (!auth) return error(ERROR_CODES.UNAUTHORIZED, '未登录');
    const user = mockData.users[0];
    return ok({
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      lang: user.lang,
      projects: mockData.projects.map((p) => ({ id: p.id, code: p.code, name: p.name })),
    });
  }),

  // ---- 项目 ----
  http.get('*/api/project/v1/list', async () => {
    await delay(200);
    return ok(mockData.projects.map((p) => ({ id: p.id, code: p.code, name: p.name })));
  }),

  http.get('*/api/project/:id', async ({ params }) => {
    await delay(200);
    const project = mockData.projects.find((p) => p.id === Number(params.id));
    if (!project) return error(404, '项目不存在');
    return ok(project);
  }),

  // ---- 看板 ----
  http.get('*/api/dashboard/folder/tree', async () => {
    await delay(300);
    const tree = mockData.folders.map((f) => ({
      ...f,
      dashboards: mockData.dashboards.filter((d) => d.folder_id === f.id).map((d) => ({
        id: d.id, name: d.name, type: d.type, status: d.status,
        created_by: d.created_by, updated_at: d.updated_at,
      })),
    }));
    return ok(tree);
  }),

  http.get('*/api/dashboard', async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const id = Number(url.searchParams.get('id'));
    const dashboard = mockData.dashboards.find((d) => d.id === id);
    if (!dashboard) return error(404, '看板不存在');
    const reports = mockData.reports.filter((r) => r.dashboard_id === id);
    return ok({ ...dashboard, reports });
  }),

  http.get('*/api/dashboards', async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const p = Number(url.searchParams.get('page') || 1);
    const ps = Number(url.searchParams.get('page_size') || 20);
    return page(mockData.dashboards, p, ps);
  }),

  http.post('*/api/dashboard', async ({ request }) => {
    await delay(300);
    const body = await request.json() as Record<string, unknown>;
    const newDashboard = createDashboard({
      name: body.name as string,
      folder_id: body.folder_id as number,
      description: body.description as string,
    });
    mockData.dashboards.push(newDashboard);
    return ok(newDashboard);
  }),

  http.put('*/api/dashboard', async ({ request }) => {
    await delay(300);
    const body = await request.json() as Record<string, unknown>;
    const idx = mockData.dashboards.findIndex((d) => d.id === body.id);
    if (idx === -1) return error(404, '看板不存在');
    mockData.dashboards[idx] = { ...mockData.dashboards[idx], ...body } as typeof mockData.dashboards[0];
    return ok(mockData.dashboards[idx]);
  }),

  http.delete('*/api/dashboard', async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const id = Number(url.searchParams.get('id'));
    mockData.dashboards = mockData.dashboards.filter((d) => d.id !== id);
    return ok(null);
  }),

  // ---- 分析查询 ----
  http.post('*/api/query', async ({ request }) => {
    await delay(faker_delay());
    const body = await request.json() as Record<string, unknown>;
    const config = body.config as Record<string, string>;
    const type = config?.analysis_type || 'event';

    let result;
    switch (type) {
      case 'funnel': result = createFunnelData(); break;
      case 'retention': result = createRetentionData(); break;
      default: result = createAnalysisResult(type); break;
    }
    return ok(result);
  }),

  http.post('*/api/query/cancel', async () => {
    await delay(100);
    return ok({ cancelled: true });
  }),

  // ---- SQL 分析 ----
  http.post('*/api/sqlAnalysis/v1/run', async () => {
    await delay(1000);
    return ok({
      columns: [
        { key: 'date', label: '日期', data_type: 'date' },
        { key: 'event_count', label: '事件数', data_type: 'number' },
        { key: 'user_count', label: '用户数', data_type: 'number' },
      ],
      rows: Array.from({ length: 30 }, (_, i) => ({
        date: `2026-06-${String(i + 1).padStart(2, '0')}`,
        event_count: Math.floor(Math.random() * 100000),
        user_count: Math.floor(Math.random() * 50000),
      })),
    });
  }),

  // ---- 埋点管理 ----
  http.get('*/api/story/v1/list', async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    return page(mockData.stories, Number(url.searchParams.get('page') || 1), 20);
  }),

  http.get('*/api/event/v1/list', async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    return page(mockData.events, Number(url.searchParams.get('page') || 1), 20);
  }),

  // ---- 标签 ----
  http.get('*/api/user-tags', async () => {
    await delay(200);
    return ok(mockData.tags);
  }),

  http.get('*/api/user-tag', async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const id = Number(url.searchParams.get('id'));
    const tag = mockData.tags.find((t) => t.id === id);
    if (!tag) return error(404, '标签不存在');
    return ok(tag);
  }),

  // ---- 指标 ----
  http.get('*/api/metric/list', async () => {
    await delay(200);
    return ok(mockData.metrics);
  }),

  // ---- 数据资产 ----
  http.get('*/api/datatable/v1/list', async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    return page(mockData.dataTables, Number(url.searchParams.get('page') || 1), 20);
  }),

  // ---- 预警 ----
  http.get('*/api/warning/list', async () => {
    await delay(200);
    return ok(mockData.warnings);
  }),

  // ---- 通知 ----
  http.get('*/api/notice/v1/list', async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    return page(mockData.notices, Number(url.searchParams.get('page') || 1), 20);
  }),

  http.get('*/api/notice/v1/stat', async () => {
    await delay(100);
    const unread = mockData.notices.filter((n) => !n.is_read).length;
    return ok({ unread });
  }),

  // ---- 下载管理 ----
  http.get('*/api/report/v1/big-download/list', async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    return page(mockData.downloads, Number(url.searchParams.get('page') || 1), 20);
  }),

  // ---- 版本日历 ----
  http.get('*/api/calendar/v1/list', async () => {
    await delay(200);
    return ok(mockData.calendars);
  }),

  // ---- 分类/实体类型 ----
  http.get('*/api/entity-type/list', async () => {
    await delay(100);
    return ok([
      { id: 1, project_id: 1, label: '用户', value: 'user', sort_order: 0 },
      { id: 2, project_id: 1, label: '设备', value: 'device', sort_order: 1 },
      { id: 3, project_id: 1, label: '账号', value: 'account', sort_order: 2 },
    ]);
  }),

  http.get('*/api/category/tree', async () => {
    await delay(200);
    return ok(mockData.categories);
  }),

  // ---- 筛选选项 ----
  http.get('*/api/filter/option/list', async () => {
    await delay(100);
    return ok([
      { value: 'zh', label: '简体中文' },
      { value: 'en', label: 'English' },
      { value: 'ja', label: '日本語' },
      { value: 'ko', label: '한국어' },
    ]);
  }),

  // ---- 健康检查 ----
  http.get('*/api/health', () => ok({ status: 'ok', timestamp: Date.now() })),

  // ---- Harness 控制 API ----
  http.post('*/harness/reset', () => {
    resetMockData();
    return ok({ reset: true });
  }),

  http.get('*/harness/data', () => ok(mockData)),
];

function faker_delay() {
  return Math.floor(Math.random() * 800) + 200;
}
/**
 * Harness — MSW Mock Handlers
 * 覆盖 V1 核心 API：auth + project
 */
import { http, HttpResponse, delay } from 'msw';
import { createSeedData, createProjects, createLoginResponse } from '../seed/factories';

const seed = createSeedData();

export const handlers = [
  // ============================================================
  // Auth API
  // ============================================================

  // 登录
  http.post('*/api/auth/login', async ({ request }) => {
    await delay(300);
    const body = await request.json() as { username: string; password: string };

    if (body.username === 'admin' && body.password === 'admin123') {
      return HttpResponse.json({
        code: 200,
        message: 'success',
        data: createLoginResponse(),
      });
    }

    return HttpResponse.json({
      code: 401,
      message: '用户名或密码错误',
      data: null,
    }, { status: 401 });
  }),

  // 登出
  http.post('*/api/auth/logout', async () => {
    await delay(100);
    return HttpResponse.json({ code: 200, message: '登出成功', data: null });
  }),

  // 刷新 Token
  http.post('*/api/auth/refresh', async () => {
    await delay(200);
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: createLoginResponse(),
    });
  }),

  // 获取当前用户信息
  http.get('*/api/auth/me', async () => {
    await delay(200);
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: seed.loginResponse.user_info,
    });
  }),

  // ============================================================
  // Project API
  // ============================================================

  // 项目列表
  http.get('*/api/projects', async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const pageSize = Number(url.searchParams.get('page_size') ?? 20);

    const projects = seed.projects;
    const start = (page - 1) * pageSize;
    const list = projects.slice(start, start + pageSize);

    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: {
        list,
        page_info: {
          current_page: page,
          page_size: pageSize,
          total_page: Math.ceil(projects.length / pageSize),
          total: projects.length,
        },
      },
    });
  }),

  // 项目详情
  http.get('*/api/projects/:id', async ({ params }) => {
    await delay(200);
    const id = Number(params.id);
    const project = seed.projects.find((p) => p.id === id);

    if (!project) {
      return HttpResponse.json({ code: 404, message: '项目不存在', data: null }, { status: 404 });
    }

    return HttpResponse.json({ code: 200, message: 'success', data: project });
  }),

  // 创建项目
  http.post('*/api/projects', async ({ request }) => {
    await delay(300);
    const body = await request.json() as { code: string; name: string };

    const newProject = {
      id: seed.projects.length + 1,
      code: body.code,
      name: body.name,
      description: '',
      status: 1 as const,
      config: {},
      created_by: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return HttpResponse.json({ code: 200, message: '创建成功', data: newProject }, { status: 201 });
  }),

  // 健康检查
  http.get('*/api/health', async () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: { status: 'ok', timestamp: new Date().toISOString() },
    });
  }),
];
/**
 * MSW Mock Server — Handler 集合
 *
 * 拦截前端 API 请求，返回 Mock 数据
 */
import { http, HttpResponse, delay } from 'msw';
import { API_ROUTES, ERROR_CODES } from '@alldata/shared';
import {
  generateFullSeedData, createAnalysisResult,
  createFunnelData, createRetentionData,
  createUser, createDashboard, createReport,
} from '../seed/factories.js';
import type { SeedDataSet } from '../seed/factories.js';

// 全局 Mock 数据存储
let mockData: SeedDataSet = generateFullSeedData();
let mockToken = 'mock-jwt-token-' + Date.now();

/** 重置 Mock 数据 */
export function resetMockData() {
  mockData = generateFullSeedData();
  mockToken = 'mock-jwt-token-' + Date.now();
}

/** 统一响应格式 */
function ok<T>(data: T) {
  return HttpResponse.json({ code: 200, message: 'success', data });
}

function page<T>(list: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const sliced = list.slice(start, end);
  return HttpResponse.json({
    code: 200,
    message: 'success',
    data: {
      list: sliced,
      page_info: {
        current_page: page,
        page_size: pageSize,
        total_page: Math.ceil(list.length / pageSize),
        total: list.length,
      },
    },
  });
}

function error(code: number, message: string) {
  return HttpResponse.json({ code, message, data: null });
}

// ============================================================
// Handler 定义
// ============================================================

export const handlers = [
  // ---- 认证 ----
  http.post('*/api/v1/login', async ({ request }) => {
    await delay(300);
    const body = await request.json() as Record<string, string>;
    if (!body.username || !body.password) {
      return error(400, '用户名或密码不能为空');
    }
    const user = mockData.users[0];
    return ok({
      token: mockToken,
      refresh_token: 'mock-refresh-token',
      user_info: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        lang: user.lang,
        projects: mockData.projects.map((p) => ({ id: p.id, code: p.code, name: p.name })),
      },
      expire_at: Date.now() + 7 * 24 * 3600 * 1000,
    });
  }),

  http.post('*/api/v1/logout', async () => {
    await delay(100);
    return ok(null);
  }),

  http.get('*/api/v1/user-info', async ({ request }) => {
    await delay(200);
    const auth = request.headers.get('Authorization');
    if (!auth) return error(ERROR_CODES.UNAUTHORIZED, '未登录');
    const user = mockData.users[0];
    return ok({
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      lang: user.lang,
      projects: mockData.projects.map((p) => ({ id: p.id, code: p.code, name: p.name })),
    });
  }),

  // ---- 项目 ----
  http.get('*/api/project/v1/list', async () => {
    await delay(200);
    return ok(mockData.projects.map((p) => ({ id: p.id, code: p.code, name: p.name })));
  }),

  http.get('*/api/project/:id', async ({ params }) => {
    await delay(200);
    const project = mockData.projects.find((p) => p.id === Number(params.id));
    if (!project) return error(404, '项目不存在');
    return ok(project);
  }),

  // ---- 看板 ----
  http.get('*/api/dashboard/folder/tree', async () => {
    await delay(300);
    const tree = mockData.folders.map((f) => ({
      ...f,
      dashboards: mockData.dashboards.filter((d) => d.folder_id === f.id).map((d) => ({
        id: d.id, name: d.name, type: d.type, status: d.status,
        created_by: d.created_by, updated_at: d.updated_at,
      })),
    }));
    return ok(tree);
  }),

  http.get('*/api/dashboard', async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const id = Number(url.searchParams.get('id'));
    const dashboard = mockData.dashboards.find((d) => d.id === id);
    if (!dashboard) return error(404, '看板不存在');
    const reports = mockData.reports.filter((r) => r.dashboard_id === id);
    return ok({ ...dashboard, reports });
  }),

  http.get('*/api/dashboards', async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const p = Number(url.searchParams.get('page') || 1);
    const ps = Number(url.searchParams.get('page_size') || 20);
    return page(mockData.dashboards, p, ps);
  }),

  http.post('*/api/dashboard', async ({ request }) => {
    await delay(300);
    const body = await request.json() as Record<string, unknown>;
    const newDashboard = createDashboard({
      name: body.name as string,
      folder_id: body.folder_id as number,
      description: body.description as string,
    });
    mockData.dashboards.push(newDashboard);
    return ok(newDashboard);
  }),

  http.put('*/api/dashboard', async ({ request }) => {
    await delay(300);
    const body = await request.json() as Record<string, unknown>;
    const idx = mockData.dashboards.findIndex((d) => d.id === body.id);
    if (idx === -1) return error(404, '看板不存在');
    mockData.dashboards[idx] = { ...mockData.dashboards[idx], ...body } as typeof mockData.dashboards[0];
    return ok(mockData.dashboards[idx]);
  }),

  http.delete('*/api/dashboard', async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const id = Number(url.searchParams.get('id'));
    mockData.dashboards = mockData.dashboards.filter((d) => d.id !== id);
    return ok(null);
  }),

  // ---- 分析查询 ----
  http.post('*/api/query', async ({ request }) => {
    await delay(faker_delay());
    const body = await request.json() as Record<string, unknown>;
    const config = body.config as Record<string, string>;
    const type = config?.analysis_type || 'event';

    let result;
    switch (type) {
      case 'funnel': result = createFunnelData(); break;
      case 'retention': result = createRetentionData(); break;
      default: result = createAnalysisResult(type); break;
    }
    return ok(result);
  }),

  http.post('*/api/query/cancel', async () => {
    await delay(100);
    return ok({ cancelled: true });
  }),

  // ---- SQL 分析 ----
  http.post('*/api/sqlAnalysis/v1/run', async () => {
    await delay(1000);
    return ok({
      columns: [
        { key: 'date', label: '日期', data_type: 'date' },
        { key: 'event_count', label: '事件数', data_type: 'number' },
        { key: 'user_count', label: '用户数', data_type: 'number' },
      ],
      rows: Array.from({ length: 30 }, (_, i) => ({
        date: `2026-06-${String(i + 1).padStart(2, '0')}`,
        event_count: Math.floor(Math.random() * 100000),
        user_count: Math.floor(Math.random() * 50000),
      })),
    });
  }),

  // ---- 埋点管理 ----
  http.get('*/api/story/v1/list', async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    return page(mockData.stories, Number(url.searchParams.get('page') || 1), 20);
  }),

  http.get('*/api/event/v1/list', async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    return page(mockData.events, Number(url.searchParams.get('page') || 1), 20);
  }),

  // ---- 标签 ----
  http.get('*/api/user-tags', async () => {
    await delay(200);
    return ok(mockData.tags);
  }),

  http.get('*/api/user-tag', async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const id = Number(url.searchParams.get('id'));
    const tag = mockData.tags.find((t) => t.id === id);
    if (!tag) return error(404, '标签不存在');
    return ok(tag);
  }),

  // ---- 指标 ----
  http.get('*/api/metric/list', async () => {
    await delay(200);
    return ok(mockData.metrics);
  }),

  // ---- 数据资产 ----
  http.get('*/api/datatable/v1/list', async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    return page(mockData.dataTables, Number(url.searchParams.get('page') || 1), 20);
  }),

  // ---- 预警 ----
  http.get('*/api/warning/list', async () => {
    await delay(200);
    return ok(mockData.warnings);
  }),

  // ---- 通知 ----
  http.get('*/api/notice/v1/list', async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    return page(mockData.notices, Number(url.searchParams.get('page') || 1), 20);
  }),

  http.get('*/api/notice/v1/stat', async () => {
    await delay(100);
    const unread = mockData.notices.filter((n) => !n.is_read).length;
    return ok({ unread });
  }),

  // ---- 下载管理 ----
  http.get('*/api/report/v1/big-download/list', async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    return page(mockData.downloads, Number(url.searchParams.get('page') || 1), 20);
  }),

  // ---- 版本日历 ----
  http.get('*/api/calendar/v1/list', async () => {
    await delay(200);
    return ok(mockData.calendars);
  }),

  // ---- 分类/实体类型 ----
  http.get('*/api/entity-type/list', async () => {
    await delay(100);
    return ok([
      { id: 1, project_id: 1, label: '用户', value: 'user', sort_order: 0 },
      { id: 2, project_id: 1, label: '设备', value: 'device', sort_order: 1 },
      { id: 3, project_id: 1, label: '账号', value: 'account', sort_order: 2 },
    ]);
  }),

  http.get('*/api/category/tree', async () => {
    await delay(200);
    return ok(mockData.categories);
  }),

  // ---- 筛选选项 ----
  http.get('*/api/filter/option/list', async () => {
    await delay(100);
    return ok([
      { value: 'zh', label: '简体中文' },
      { value: 'en', label: 'English' },
      { value: 'ja', label: '日本語' },
      { value: 'ko', label: '한국어' },
    ]);
  }),

  // ---- 健康检查 ----
  http.get('*/api/health', () => ok({ status: 'ok', timestamp: Date.now() })),

  // ---- Harness 控制 API ----
  http.post('*/harness/reset', () => {
    resetMockData();
    return ok({ reset: true });
  }),

  http.get('*/harness/data', () => ok(mockData)),
];

function faker_delay() {
  return Math.floor(Math.random() * 800) + 200;
}
