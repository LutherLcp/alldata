import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/v1/auth/me', () => {
    return HttpResponse.json({
      success: true,
      data: {
        id: 'test-user-id',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        role: 'analyst',
        status: 'active',
        avatarUrl: null,
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  }),

  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = await request.json();
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        success: true,
        data: {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            username: 'testuser',
            displayName: 'Test User',
            role: 'analyst',
            status: 'active',
          },
        },
      });
    }
    return HttpResponse.json(
      {
        success: false,
        error: { code: 'AUTHENTICATION_FAILED', message: 'Invalid credentials' },
      },
      { status: 401 }
    );
  }),

  http.post('/api/v1/auth/refresh', () => {
    return HttpResponse.json({
      success: true,
      data: {
        accessToken: 'new-mock-access-token',
        refreshToken: 'new-mock-refresh-token',
      },
    });
  }),

  http.post('/api/v1/auth/logout', () => {
    return HttpResponse.json({ success: true });
  }),

  http.get('/api/v1/projects', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 'test-project-id',
          code: 'TEST_PROJECT',
          name: 'Test Project',
          description: 'Test project description',
          status: 'active',
          ownerId: 'test-user-id',
          timezone: 'Asia/Shanghai',
          locale: 'zh-CN',
          settings: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      meta: { requestId: 'test-request-id', timestamp: new Date().toISOString(), duration: 0 },
    });
  }),

  http.get('/api/v1/projects/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        id: params.id,
        code: 'TEST_PROJECT',
        name: 'Test Project',
        description: 'Test project description',
        status: 'active',
        ownerId: 'test-user-id',
        timezone: 'Asia/Shanghai',
        locale: 'zh-CN',
        settings: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      meta: { requestId: 'test-request-id', timestamp: new Date().toISOString(), duration: 0 },
    });
  }),

  http.post('/api/v1/projects', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: {
        id: 'new-project-id',
        ...body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      meta: { requestId: 'test-request-id', timestamp: new Date().toISOString(), duration: 0 },
    });
  }),

  http.patch('/api/v1/projects/:id', async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: {
        id: params.id,
        ...body,
        updatedAt: new Date().toISOString(),
      },
      meta: { requestId: 'test-request-id', timestamp: new Date().toISOString(), duration: 0 },
    });
  }),

  http.delete('/api/v1/projects/:id', () => {
    return HttpResponse.json({ success: true });
  }),

  http.get('/api/v1/events', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 'test-event-id',
          projectId: 'test-project-id',
          code: 'test_event',
          name: 'Test Event',
          description: 'Test event description',
          categoryId: null,
          status: 'published',
          version: 1,
          properties: {},
          createdBy: 'test-user-id',
          approvedBy: null,
          approvedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      meta: { requestId: 'test-request-id', timestamp: new Date().toISOString(), duration: 0 },
    });
  }),

  http.get('/api/v1/events/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        id: params.id,
        projectId: 'test-project-id',
        code: 'test_event',
        name: 'Test Event',
        description: 'Test event description',
        categoryId: null,
        status: 'published',
        version: 1,
        properties: {},
        createdBy: 'test-user-id',
        approvedBy: null,
        approvedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      meta: { requestId: 'test-request-id', timestamp: new Date().toISOString(), duration: 0 },
    });
  }),

  http.get('/api/v1/tags', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 'test-tag-id',
          projectId: 'test-project-id',
          name: 'Test Tag',
          description: 'Test tag description',
          type: 'condition',
          definition: {},
          groupId: null,
          isActive: true,
          createdBy: 'test-user-id',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      meta: { requestId: 'test-request-id', timestamp: new Date().toISOString(), duration: 0 },
    });
  }),

  http.get('/api/v1/dashboards', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 'test-dashboard-id',
          projectId: 'test-project-id',
          name: 'Test Dashboard',
          description: 'Test dashboard description',
          layout: 'grid',
          layoutConfig: {},
          isPublic: false,
          tags: [],
          createdBy: 'test-user-id',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      meta: { requestId: 'test-request-id', timestamp: new Date().toISOString(), duration: 0 },
    });
  }),

  http.get('/api/v1/indicators', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 'test-indicator-id',
          projectId: 'test-project-id',
          code: 'test_indicator',
          name: 'Test Indicator',
          description: 'Test indicator description',
          formula: 'count(*)',
          unit: 'count',
          precision: 2,
          categoryId: null,
          ownerId: 'test-user-id',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      meta: { requestId: 'test-request-id', timestamp: new Date().toISOString(), duration: 0 },
    });
  }),

  http.get('/api/v1/alerts/rules', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 'test-alert-rule-id',
          projectId: 'test-project-id',
          name: 'Test Alert Rule',
          description: 'Test alert rule description',
          indicatorId: 'test-indicator-id',
          condition: { operator: 'gt', threshold: 100 },
          severity: 'warning',
          channels: ['email'],
          recipients: ['test@example.com'],
          schedule: { cron: '0 * * * *' },
          isActive: true,
          createdBy: 'test-user-id',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      meta: { requestId: 'test-request-id', timestamp: new Date().toISOString(), duration: 0 },
    });
  }),

  http.get('/api/v1/finance/records', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 'test-finance-id',
          projectId: 'test-project-id',
          type: 'revenue',
          amount: 1000,
          currency: 'CNY',
          exchangeRate: 1,
          accountId: 'test-account-id',
          counterparty: 'Test Counterparty',
          description: 'Test finance record',
          invoiceNumber: 'INV-001',
          invoiceDate: new Date().toISOString(),
          dueDate: new Date().toISOString(),
          status: 'pending',
          createdBy: 'test-user-id',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      meta: { requestId: 'test-request-id', timestamp: new Date().toISOString(), duration: 0 },
    });
  }),

  http.get('/api/v1/kocrm/records', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 'test-kocrm-id',
          projectId: 'test-project-id',
          channel: 'douyin',
          accountId: 'test-account',
          accountName: 'Test Account',
          campaignId: null,
          materialId: null,
          metrics: { views: 1000, clicks: 100 },
          cost: 500,
          revenue: 1000,
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      meta: { requestId: 'test-request-id', timestamp: new Date().toISOString(), duration: 0 },
    });
  }),

  http.get('/api/v1/health', () => {
    return HttpResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: 'up', latency: 5 },
        redis: { status: 'up', latency: 2 },
        minio: { status: 'up', latency: 10 },
      },
    });
  }),

  http.get('/api/v1/health/ready', () => {
    return HttpResponse.json({ status: 'ready' });
  }),

  http.get('/api/v1/health/live', () => {
    return HttpResponse.json({ status: 'alive' });
  }),
];

export const server = setupServer(...handlers);

export const createMockServer = (customHandlers = []) => {
  return setupServer(...handlers, ...customHandlers);
};