import { buildApp } from '@/app';
import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// 模拟 Redis，避免依赖真实 Redis 服务
vi.mock('@/common/utils/redis', () => {
  const mockClient = {
    set: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
    quit: vi.fn().mockResolvedValue('OK'),
  };
  return {
    getRedisClient: vi.fn(() => mockClient),
    closeRedis: vi.fn().mockResolvedValue(undefined),
  };
});

describe('API Core Modules Smoke Tests (Fastify Inject & Mocked Prisma)', () => {
  let app: FastifyInstance;
  let validToken: string;

  const mockUser = {
    id: 1,
    username: 'admin',
    password_hash: '',
    status: 1,
    tenant_id: 1,
    email: 'admin@alldata.io',
    phone: '13800000000',
    avatar: '',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockProject = {
    id: 1,
    code: 'proj_demo',
    name: 'Demo Project',
    description: 'A test demo project',
    status: 1,
    tenant_id: 1,
    created_by: 1,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    userProjectRole: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    project: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    dashboard: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    warning: {
      findFirst: vi.fn(),
    },
    warningLog: {
      create: vi.fn(),
    },
  };

  beforeAll(async () => {
    // 预计算测试密码 hash
    mockUser.password_hash = await bcrypt.hash('password123', 6);

    app = await buildApp({
      prisma: mockPrisma as any,
      fastifyOptions: { logger: false },
      skipMinioInit: true,
      skipRedisInit: true,
      skipAudit: true,
      skipRateLimit: true,
    });
    await app.ready();

    validToken = app.jwt.sign({
      userId: '1',
      tenantId: '1',
      role: 'admin',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auth Module (/api/auth)', () => {
    it('POST /api/auth/login 校验失败（空密码或空用户名）返回 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'a' }, // 长度不足
      });
      expect(res.statusCode).toBe(400);
    });

    it('POST /api/auth/login 密码错误返回 401', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'admin', password: 'wrongpassword' },
      });

      expect(res.statusCode).toBe(401);
      const body = res.json();
      expect(body.message).toContain('用户名或密码错误');
    });

    it('POST /api/auth/login 凭证正确返回 200 与 Token', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.userProjectRole.findMany.mockResolvedValueOnce([
        {
          project: { id: 1, code: 'proj_demo', name: 'Demo Project' },
          role: { name: 'admin', permissions: ['*'] },
        },
      ]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'admin', password: 'password123' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.code).toBe(200);
      expect(body.data).toHaveProperty('token');
      expect(body.data).toHaveProperty('refresh_token');
      expect(body.data.user_info.username).toBe('admin');
    });

    it('GET /api/auth/me 未携带 Token 返回 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      });
      expect(res.statusCode).toBe(401);
    });

    it('GET /api/auth/me 携带有效 Token 返回用户信息', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 1,
        username: 'admin',
        email: 'admin@alldata.io',
        tenant_id: 1,
        status: 1,
        lang: 'zh-CN',
        project_roles: [],
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.username).toBe('admin');
    });
  });

  describe('Project Module (/api/projects)', () => {
    it('GET /api/projects 未登录返回 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/projects',
      });
      expect(res.statusCode).toBe(401);
    });

    it('GET /api/projects 登录后返回项目列表分页', async () => {
      mockPrisma.project.findMany.mockResolvedValueOnce([mockProject]);
      mockPrisma.project.count.mockResolvedValueOnce(1);

      const res = await app.inject({
        method: 'GET',
        url: '/api/projects',
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.list).toHaveLength(1);
      expect(body.data.page_info.total).toBe(1);
      expect(body.data.list[0].code).toBe('proj_demo');
    });

    it('POST /api/projects 参数校验不合法（含有大写字母）返回 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { authorization: `Bearer ${validToken}` },
        payload: {
          code: 'INVALID_UPPERCASE_CODE',
          name: 'Invalid Project',
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('POST /api/projects 正常创建返回 201', async () => {
      mockPrisma.project.create.mockResolvedValueOnce(mockProject);
      mockPrisma.userProjectRole.create.mockResolvedValueOnce({ id: 1 });

      const res = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { authorization: `Bearer ${validToken}` },
        payload: {
          code: 'valid_code_123',
          name: 'Valid Project',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.data.code).toBe('proj_demo');
    });
  });

  describe('Dashboard Module (/api/dashboards)', () => {
    it('GET /api/dashboards 缺失 projectId 返回 400', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/dashboards',
        headers: { authorization: `Bearer ${validToken}` },
      });
      expect(res.statusCode).toBe(400);
    });

    it('GET /api/dashboards 无项目权限返回 403', async () => {
      mockPrisma.userProjectRole.findUnique.mockResolvedValueOnce(null);

      const res = await app.inject({
        method: 'GET',
        url: '/api/dashboards?project_id=999',
        headers: { authorization: `Bearer ${validToken}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('GET /api/dashboards 有项目权限返回看板列表', async () => {
      mockPrisma.userProjectRole.findUnique.mockResolvedValueOnce({ id: 1 });
      mockPrisma.dashboard.findMany.mockResolvedValueOnce([
        { id: 1, name: '运营大盘', project_id: 1, layout: [] },
      ]);
      mockPrisma.dashboard.count.mockResolvedValueOnce(1);

      const res = await app.inject({
        method: 'GET',
        url: '/api/dashboards?project_id=1',
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe('运营大盘');
    });
  });

  describe('Warning Module (/api/warnings)', () => {
    it('POST /api/warnings/:id/check 触发预警检查如实返回 not_implemented', async () => {
      mockPrisma.userProjectRole.findUnique.mockResolvedValueOnce({ id: 1 });
      mockPrisma.warning.findFirst.mockResolvedValueOnce({ id: 10 });
      mockPrisma.warningLog.create.mockResolvedValueOnce({ id: 100 });

      const res = await app.inject({
        method: 'POST',
        url: '/api/warnings/10/check?project_id=1',
        headers: { authorization: `Bearer ${validToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.status).toBe('not_implemented');
      expect(body.data.warning_id).toBe(10);
      expect(body.data.message).toContain('预警检查引擎尚未实现');
    });
  });
});
