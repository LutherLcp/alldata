/**
 * 集成测试 — 完整登录→操作流程
 */
import { beforeEach, describe, expect, it } from 'vitest';

const BASE_URL = 'http://localhost:4000';

describe('登录流程集成测试', () => {
  let token: string;
  let projectId: number;

  beforeEach(async () => {
    // 重置 Mock 数据
    await fetch(`${BASE_URL}/harness/reset`, { method: 'POST' });
  });

  it('完整流程: 登录 → 获取项目 → 获取看板 → 执行分析', async () => {
    // Step 1: 登录
    const loginRes = await fetch(`${BASE_URL}/api/v1/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: '123456' }),
    });
    const loginData = await loginRes.json();
    expect(loginData.code).toBe(200);
    token = loginData.data.token;
    expect(token).toBeDefined();

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Step 2: 获取项目列表
    const projectRes = await fetch(`${BASE_URL}/api/project/v1/list`, { headers });
    const projectData = await projectRes.json();
    expect(projectData.code).toBe(200);
    expect(projectData.data.length).toBeGreaterThan(0);
    projectId = projectData.data[0].id;

    // Step 3: 获取看板文件夹树
    const treeRes = await fetch(`${BASE_URL}/api/dashboard/folder/tree`, {
      headers: { ...headers, 'PROJECT-ID': String(projectId) },
    });
    const treeData = await treeRes.json();
    expect(treeData.code).toBe(200);
    expect(treeData.data.length).toBeGreaterThan(0);

    // Step 4: 获取第一个看板详情
    const firstDashboard = treeData.data[0].dashboards?.[0];
    if (firstDashboard) {
      const dashRes = await fetch(`${BASE_URL}/api/dashboard?id=${firstDashboard.id}`, { headers });
      const dashData = await dashRes.json();
      expect(dashData.code).toBe(200);
      expect(dashData.data.reports).toBeInstanceOf(Array);

      // Step 5: 执行分析查询
      const queryRes = await fetch(`${BASE_URL}/api/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          project_id: String(projectId),
          request_id: 'integration-test-001',
          config: {
            analysis_type: 'event',
            date_range: { start: '2026-06-01', end: '2026-06-30', granularity: 'day' },
            metrics: [{ event_name: 'page_view', agg_type: 'count' }],
          },
        }),
      });
      const queryData = await queryRes.json();
      expect(queryData.code).toBe(200);
      expect(queryData.data.chart_data).toBeInstanceOf(Array);
      expect(queryData.data.chart_data[0].data.length).toBeGreaterThan(0);
    }
  });

  it('完整流程: 创建看板 → 添加报表 → 修改布局', async () => {
    // 登录
    const loginRes = await fetch(`${BASE_URL}/api/v1/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: '123456' }),
    });
    token = (await loginRes.json()).data.token;

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // 创建看板
    const createRes = await fetch(`${BASE_URL}/api/dashboard`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: '集成测试看板',
        description: '自动化集成测试创建',
      }),
    });
    const createData = await createRes.json();
    expect(createData.code).toBe(200);
    const dashboardId = createData.data.id;
    expect(dashboardId).toBeDefined();

    // 更新看板布局
    const updateRes = await fetch(`${BASE_URL}/api/dashboard`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        id: dashboardId,
        layout: [
          { i: '1', x: 0, y: 0, w: 6, h: 4 },
          { i: '2', x: 6, y: 0, w: 6, h: 4 },
        ],
      }),
    });
    const updateData = await updateRes.json();
    expect(updateData.code).toBe(200);
  });
});

describe('数据资产集成测试', () => {
  it('获取标签列表 + 指标列表 + 数据表列表', async () => {
    const headers = {
      Authorization: 'Bearer mock-token',
      'Content-Type': 'application/json',
    };

    const [tagsRes, metricsRes, tablesRes] = await Promise.all([
      fetch(`${BASE_URL}/api/user-tags`, { headers }),
      fetch(`${BASE_URL}/api/metric/list`, { headers }),
      fetch(`${BASE_URL}/api/datatable/v1/list?page=1`, { headers }),
    ]);

    const tags = await tagsRes.json();
    const metrics = await metricsRes.json();
    const tables = await tablesRes.json();

    expect(tags.code).toBe(200);
    expect(tags.data.length).toBeGreaterThan(0);
    expect(tags.data[0].tag_type).toBeDefined();

    expect(metrics.code).toBe(200);
    expect(metrics.data.length).toBeGreaterThan(0);

    expect(tables.code).toBe(200);
    expect(tables.data.list.length).toBeGreaterThan(0);
    expect(tables.data.list[0].columns).toBeInstanceOf(Array);
  });
});
