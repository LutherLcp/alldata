/**
 * 看板 API 测试
 */
import { describe, expect, it } from 'vitest';

const BASE_URL = 'http://localhost:4000';
const headers = { Authorization: 'Bearer mock-token', 'Content-Type': 'application/json' };

describe('Dashboard API', () => {
  it('GET /api/dashboard/folder/tree — 获取文件夹树', async () => {
    const res = await fetch(`${BASE_URL}/api/dashboard/folder/tree`, { headers });
    const data = await res.json();

    expect(data.code).toBe(200);
    expect(data.data).toBeInstanceOf(Array);
    expect(data.data.length).toBeGreaterThan(0);
    expect(data.data[0]).toHaveProperty('name');
    expect(data.data[0]).toHaveProperty('dashboards');
  });

  it('GET /api/dashboards — 看板列表分页', async () => {
    const res = await fetch(`${BASE_URL}/api/dashboards?page=1&page_size=5`, { headers });
    const data = await res.json();

    expect(data.code).toBe(200);
    expect(data.data.list).toBeInstanceOf(Array);
    expect(data.data.page_info).toBeDefined();
    expect(data.data.page_info.current_page).toBe(1);
    expect(data.data.page_info.page_size).toBe(5);
    expect(data.data.page_info.total).toBeGreaterThan(0);
  });

  it('GET /api/dashboard?id=x — 看板详情含报表', async () => {
    // 先获取列表拿到 id
    const listRes = await fetch(`${BASE_URL}/api/dashboards?page=1&page_size=1`, { headers });
    const listData = await listRes.json();
    const id = listData.data.list[0]?.id;

    if (id) {
      const res = await fetch(`${BASE_URL}/api/dashboard?id=${id}`, { headers });
      const data = await res.json();

      expect(data.code).toBe(200);
      expect(data.data.id).toBe(id);
      expect(data.data.name).toBeDefined();
      expect(data.data.reports).toBeInstanceOf(Array);
    }
  });

  it('POST /api/dashboard — 创建看板', async () => {
    const res = await fetch(`${BASE_URL}/api/dashboard`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: '测试看板', description: '自动化测试创建' }),
    });
    const data = await res.json();

    expect(data.code).toBe(200);
    expect(data.data.name).toBe('测试看板');
    expect(data.data.id).toBeDefined();
  });

  it('DELETE /api/dashboard — 删除看板', async () => {
    const res = await fetch(`${BASE_URL}/api/dashboard?id=999`, {
      method: 'DELETE',
      headers,
    });
    const data = await res.json();
    expect(data.code).toBe(200);
  });
});

describe('Analysis API', () => {
  it('POST /api/query — 事件分析查询', async () => {
    const res = await fetch(`${BASE_URL}/api/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        project_id: '1',
        request_id: 'test-001',
        config: {
          analysis_type: 'event',
          date_range: { start: '2026-06-01', end: '2026-06-30', granularity: 'day' },
          metrics: [{ event_name: 'page_view', agg_type: 'count' }],
        },
      }),
    });
    const data = await res.json();

    expect(data.code).toBe(200);
    expect(data.data.columns).toBeInstanceOf(Array);
    expect(data.data.rows).toBeInstanceOf(Array);
    expect(data.data.chart_data).toBeInstanceOf(Array);
  });

  it('POST /api/query — 漏斗分析查询', async () => {
    const res = await fetch(`${BASE_URL}/api/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        project_id: '1',
        request_id: 'test-002',
        config: {
          analysis_type: 'funnel',
          date_range: { start: '2026-06-01', end: '2026-06-30' },
          metrics: [{ event_name: 'page_view', agg_type: 'count' }],
        },
      }),
    });
    const data = await res.json();

    expect(data.code).toBe(200);
    expect(data.data.rows.length).toBeGreaterThan(0);
    // 漏斗数据应递减
    for (let i = 1; i < data.data.rows.length; i++) {
      expect(data.data.rows[i].value).toBeLessThanOrEqual(data.data.rows[i - 1].value);
    }
  });

  it('POST /api/query/cancel — 取消查询', async () => {
    const res = await fetch(`${BASE_URL}/api/query/cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ trace_id: 'test-001' }),
    });
    const data = await res.json();

    expect(data.code).toBe(200);
    expect(data.data.cancelled).toBe(true);
  });
});
