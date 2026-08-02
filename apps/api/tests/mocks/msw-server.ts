import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('*/api/health', () => {
    return HttpResponse.json({ code: 200, message: 'success', data: { status: 'ok', timestamp: new Date().toISOString() } });
  }),

  http.post('*/api/auth/login', async ({ request }) => {
    const body = await request.json() as { username: string; password: string };
    if (body.username === 'admin' && body.password === 'admin123') {
      return HttpResponse.json({
        code: 200,
        message: 'success',
        data: {
          token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          user_info: { id: 1, username: 'admin', email: 'admin@example.com', avatar: null, lang: 'zh-CN', projects: [] },
          expire_at: Date.now() + 7 * 24 * 3600 * 1000,
        },
      });
    }
    return HttpResponse.json(
      { code: 401, message: '用户名或密码错误', data: null },
      { status: 401 },
    );
  }),

  http.get('*/api/auth/me', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: { id: 1, username: 'admin', email: 'admin@example.com', avatar: null, lang: 'zh-CN', projects: [] },
    });
  }),

  http.post('*/api/auth/logout', () => {
    return HttpResponse.json({ code: 200, message: 'success', data: null });
  }),

  http.get('*/api/projects', () => {
    return HttpResponse.json({
      code: 200,
      message: 'success',
      data: {
        list: [],
        page_info: { current_page: 1, page_size: 20, total_page: 1, total: 0 },
      },
    });
  }),
];

export function createMockServer() {
  return setupServer(...handlers);
}

export const server = createMockServer();
