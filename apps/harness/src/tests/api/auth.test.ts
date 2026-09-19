/**
 * 认证 API 测试
 */
import { describe, expect, it } from 'vitest';

const BASE_URL = 'http://localhost:4000';

describe('Auth API', () => {
  it('POST /api/v1/login — 正常登录返回 token', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: '123456' }),
    });
    const data = await res.json();

    expect(data.code).toBe(200);
    expect(data.data.token).toBeDefined();
    expect(data.data.user_info).toBeDefined();
    expect(data.data.user_info.username).toBeDefined();
    expect(data.data.user_info.projects).toBeInstanceOf(Array);
    expect(data.data.expire_at).toBeGreaterThan(Date.now());
  });

  it('POST /api/v1/login — 缺少参数返回 400', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '', password: '' }),
    });
    const data = await res.json();

    expect(data.code).toBe(400);
  });

  it('GET /api/v1/user-info — 未登录返回 401', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/user-info`);
    const data = await res.json();

    expect(data.code).toBe(401);
  });

  it('GET /api/v1/user-info — 带 token 返回用户信息', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/user-info`, {
      headers: { Authorization: 'Bearer mock-token' },
    });
    const data = await res.json();

    expect(data.code).toBe(200);
    expect(data.data.id).toBeDefined();
    expect(data.data.username).toBeDefined();
  });

  it('POST /api/v1/logout — 登出', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/logout`, { method: 'POST' });
    const data = await res.json();

    expect(data.code).toBe(200);
  });
});
