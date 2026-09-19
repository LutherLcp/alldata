/**
 * Harness — API 单元测试
 * 验证 Mock Handler 覆盖率
 */
import { describe, expect, it } from 'vitest';

describe('Auth API', () => {
  it('POST /api/auth/login — 正确凭证返回 token', async () => {
    const res = await fetch('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.code).toBe(200);
    expect(data.data.token).toBeTruthy();
    expect(data.data.user_info.username).toBe('admin');
  });

  it('POST /api/auth/login — 错误凭证返回 401', async () => {
    const res = await fetch('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'wrong', password: 'wrong' }),
    });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.code).toBe(401);
    expect(data.data).toBeNull();
  });

  it('POST /api/auth/logout — 成功登出', async () => {
    const res = await fetch('http://localhost/api/auth/logout', { method: 'POST' });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.code).toBe(200);
    expect(data.message).toBe('登出成功');
  });

  it('GET /api/auth/me — 获取用户信息', async () => {
    const res = await fetch('http://localhost/api/auth/me');
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.username).toBe('admin');
    expect(data.data.projects).toBeInstanceOf(Array);
  });

  it('POST /api/auth/refresh — 刷新 Token', async () => {
    const res = await fetch('http://localhost/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: 'some-refresh-token' }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.token).toBeTruthy();
  });
});

describe('Project API', () => {
  it('GET /api/projects — 获取项目列表', async () => {
    const res = await fetch('http://localhost/api/projects');
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.list).toBeInstanceOf(Array);
    expect(data.data.page_info).toBeDefined();
    expect(data.data.page_info.current_page).toBe(1);
  });

  it('GET /api/projects/:id — 获取项目详情', async () => {
    const res = await fetch('http://localhost/api/projects/1');
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.id).toBe(1);
    expect(data.data.name).toBeTruthy();
  });

  it('GET /api/projects/:id — 不存在的项目返回 404', async () => {
    const res = await fetch('http://localhost/api/projects/9999');
    expect(res.status).toBe(404);
  });

  it('POST /api/projects — 创建项目', async () => {
    const res = await fetch('http://localhost/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'test-project', name: '测试项目' }),
    });
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.data.code).toBe('test-project');
    expect(data.data.name).toBe('测试项目');
  });
});

describe('Health API', () => {
  it('GET /api/health — 健康检查', async () => {
    const res = await fetch('http://localhost/api/health');
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.status).toBe('ok');
    expect(data.data.timestamp).toBeTruthy();
  });
});
