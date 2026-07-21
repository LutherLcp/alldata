import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

export const mockConfig = {
  nodeEnv: 'test',
  port: 4001,
  host: 'localhost',
  corsOrigin: 'http://localhost:3000',
  jwtSecret: 'test-secret-key-for-testing-only',
  cookieSecret: 'test-cookie-secret',
  databaseUrl: 'postgresql://test:test@localhost:5432/test',
  redisUrl: 'redis://localhost:6379',
  minioEndpoint: 'localhost',
  minioPort: 9000,
  minioAccessKey: 'test',
  minioSecretKey: 'testsecret',
  minioBucket: 'test',
};

vi.stubGlobal('config', mockConfig);

beforeAll(() => {});

afterAll(() => {});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

export const createMockPrisma = () => ({
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  project: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  event: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  tag: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  dashboard: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  indicator: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  alertRule: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  financeRecord: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  kocrmRecord: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  auditLog: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $transaction: vi.fn((cb) => cb(mockPrisma)),
});

export const mockPrisma = createMockPrisma();

export const createMockRequest = (overrides = {}) => ({
  method: 'GET',
  url: '/api/test',
  headers: {},
  query: {},
  params: {},
  body: {},
  user: null,
  ip: '127.0.0.1',
  ...overrides,
});

export const createMockReply = () => {
  const reply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    code: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
    setCookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
  };
  return reply;
};

export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  username: 'testuser',
  displayName: 'Test User',
  role: 'analyst',
  status: 'active',
  avatarUrl: null,
  lastLoginAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockProject = (overrides = {}) => ({
  id: 'test-project-id',
  code: 'TEST_PROJECT',
  name: 'Test Project',
  description: 'Test project description',
  status: 'active',
  ownerId: 'test-user-id',
  timezone: 'Asia/Shanghai',
  locale: 'zh-CN',
  settings: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockEvent = (overrides = {}) => ({
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
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockTag = (overrides = {}) => ({
  id: 'test-tag-id',
  projectId: 'test-project-id',
  name: 'Test Tag',
  description: 'Test tag description',
  type: 'condition',
  definition: {},
  groupId: null,
  isActive: true,
  createdBy: 'test-user-id',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockDashboard = (overrides = {}) => ({
  id: 'test-dashboard-id',
  projectId: 'test-project-id',
  name: 'Test Dashboard',
  description: 'Test dashboard description',
  layout: 'grid',
  layoutConfig: {},
  isPublic: false,
  tags: [],
  createdBy: 'test-user-id',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockIndicator = (overrides = {}) => ({
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
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockAlertRule = (overrides = {}) => ({
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
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockFinanceRecord = (overrides = {}) => ({
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
  invoiceDate: new Date(),
  dueDate: new Date(),
  status: 'pending',
  createdBy: 'test-user-id',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockKOCRMRecord = (overrides = {}) => ({
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
  date: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockAuditLog = (overrides = {}) => ({
  id: 'test-audit-id',
  projectId: 'test-project-id',
  userId: 'test-user-id',
  action: 'create',
  resource: 'event',
  resourceId: 'test-event-id',
  oldData: null,
  newData: { name: 'Test Event' },
  ip: '127.0.0.1',
  userAgent: 'test-agent',
  createdAt: new Date(),
  ...overrides,
});

export const createPaginationParams = (page = 1, pageSize = 20) => ({
  page: Math.max(1, page),
  pageSize: Math.min(100, Math.max(1, pageSize)),
});

export const createPaginatedResponse = <T>(data: T[], total: number, page: number, pageSize: number) => ({
  data,
  total,
  page,
  pageSize,
  totalPages: Math.ceil(total / pageSize),
});

export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const expectError = (error: Error, code: string) => {
  expect(error).toBeDefined();
  expect(error.message).toContain(code);
};

export const expectSuccess = <T>(result: { success: boolean; data?: T; error?: { code: string; message: string } }) => {
  expect(result.success).toBe(true);
  expect(result.data).toBeDefined();
  return result.data as T;
};

export const expectFailure = (result: { success: boolean; error?: { code: string; message: string } }, code: string) => {
  expect(result.success).toBe(false);
  expect(result.error?.code).toBe(code);
};