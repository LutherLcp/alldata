import { FastifyInstance } from 'fastify';
import { buildApp } from '@/main';

export interface TestApp extends FastifyInstance {
  prisma: ReturnType<typeof import('@prisma/client').PrismaClient>;
}

export async function createTestApp(): Promise<TestApp> {
  const app = await buildApp({
    logger: { level: 'silent' },
  });

  await app.ready();

  return app as TestApp;
}

export async function closeTestApp(app: TestApp): Promise<void> {
  await app.close();
}

export async function injectRequest(
  app: TestApp,
  options: {
    method: string;
    url: string;
    payload?: Record<string, unknown>;
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
    query?: Record<string, string>;
  }
) {
  const { method, url, payload, headers = {}, cookies = {}, query } = options;

  let fullUrl = url;
  if (query) {
    const searchParams = new URLSearchParams(query);
    fullUrl += `?${searchParams.toString()}`;
  }

  const cookieHeader = Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');

  return app.inject({
    method,
    url: fullUrl,
    payload,
    headers: {
      'content-type': 'application/json',
      ...headers,
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
  });
}

export const createAuthHeaders = (token: string) => ({
  authorization: `Bearer ${token}`,
});

export const createAuthCookies = (token: string) => ({
  token,
});

export async function loginUser(
  app: TestApp,
  email = 'test@example.com',
  password = 'password123'
): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await injectRequest(app, {
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password },
  });

  const body = JSON.parse(response.body);
  return {
    accessToken: body.data.accessToken,
    refreshToken: body.data.refreshToken,
  };
}

export async function createTestProject(
  app: TestApp,
  accessToken: string,
  overrides: Record<string, unknown> = {}
) {
  const response = await injectRequest(app, {
    method: 'POST',
    url: '/api/v1/projects',
    headers: createAuthHeaders(accessToken),
    payload: {
      code: `TEST_${Date.now()}`,
      name: 'Test Project',
      description: 'Test project description',
      timezone: 'Asia/Shanghai',
      locale: 'zh-CN',
      ...overrides,
    },
  });

  return JSON.parse(response.body).data;
}

export async function createTestEvent(
  app: TestApp,
  accessToken: string,
  projectId: string,
  overrides: Record<string, unknown> = {}
) {
  const response = await injectRequest(app, {
    method: 'POST',
    url: '/api/v1/events',
    headers: createAuthHeaders(accessToken),
    payload: {
      projectId,
      code: `test_event_${Date.now()}`,
      name: 'Test Event',
      description: 'Test event description',
      status: 'draft',
      ...overrides,
    },
  });

  return JSON.parse(response.body).data;
}

export function expectSuccessResponse<T>(response: any): T {
  expect(response.statusCode).toBeLessThan(400);
  const body = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
  expect(body.success).toBe(true);
  return body.data;
}

export function expectErrorResponse(response: any, expectedStatus = 400, expectedCode?: string) {
  expect(response.statusCode).toBe(expectedStatus);
  const body = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
  expect(body.success).toBe(false);
  if (expectedCode) {
    expect(body.error.code).toBe(expectedCode);
  }
  return body.error;
}

export function expectPaginatedResponse<T>(response: any): { items: T[]; total: number; page: number; pageSize: number } {
  const body = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
  expect(body.success).toBe(true);
  expect(body.data).toHaveProperty('items');
  expect(body.data).toHaveProperty('total');
  expect(body.data).toHaveProperty('page');
  expect(body.data).toHaveProperty('pageSize');
  return body.data;
}