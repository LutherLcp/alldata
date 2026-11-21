/**
 * 项目访问守卫 — 多租户隔离的行为契约测试
 *
 * 覆盖：
 * - requireProjectAccess() 的四条返回路径（400 / 401 / 403 / 放行）
 * - canAccessProject() 的布尔语义
 * - assertProjectAccess() 的抛错契约（statusCode 403 + PROJECT_ACCESS_DENIED）
 *
 * 全部用 Fastify inject + mock prisma 完成，不依赖数据库或网络。
 */
import {
  assertProjectAccess,
  canAccessProject,
  requireProjectAccess,
} from '@/common/middleware/projectAccess';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

type PrismaMock = {
  userProjectRole: { findUnique: ReturnType<typeof vi.fn> };
};

/** 构造一个只实现 userProjectRole.findUnique 的 prisma 替身 */
function createPrismaMock(membership: { id: number } | null = { id: 1 }): PrismaMock {
  return { userProjectRole: { findUnique: vi.fn().mockResolvedValue(membership) } };
}

const openApps: FastifyInstance[] = [];

afterEach(async () => {
  await Promise.all(openApps.splice(0).map((app) => app.close()));
});

/**
 * 注册一条被守卫保护的路由。
 * 用全局 preHandler 模拟 authPlugin 注入的 request.user（Fastify 会先跑全局钩子，
 * 再跑路由级 preHandler，因此顺序与真实应用一致）。
 */
async function buildGuardedApp(
  prisma: PrismaMock,
  user?: unknown,
): Promise<{ app: FastifyInstance; errors: Error[] }> {
  const app = Fastify({ logger: false });
  const errors: Error[] = [];
  app.decorate('prisma', prisma as unknown as FastifyInstance['prisma']);
  app.addHook('preHandler', async (request) => {
    if (user !== undefined) (request as { user?: unknown }).user = user;
  });
  app.setErrorHandler((error, _request, reply) => {
    errors.push(error);
    reply.code(500).send({ code: 500, message: error.message });
  });
  app.get('/guarded', { preHandler: requireProjectAccess() }, async (request) => ({
    projectId: request.projectId,
  }));
  await app.ready();
  openApps.push(app);
  return { app, errors };
}

/** 构造一个只带 user/server.prisma 的最小请求替身，供非 preHandler 场景使用 */
function fakeRequest(user: unknown, prisma: PrismaMock): FastifyRequest {
  return { user, server: { prisma } } as unknown as FastifyRequest;
}

describe('requireProjectAccess — 400 缺少或非法 project-id', () => {
  it('缺少 project-id 请求头时返回 400，且不查询成员关系', async () => {
    const prisma = createPrismaMock();
    const { app } = await buildGuardedApp(prisma, { userId: 7 });

    const response = await app.inject({ method: 'GET', url: '/guarded' });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      code: 400,
      message: '缺少或非法的 project-id 请求头',
      data: null,
    });
    expect(prisma.userProjectRole.findUnique).not.toHaveBeenCalled();
  });

  it.each(['abc', '0', '-1', '1.5', '', '  ', 'NaN'])(
    'project-id = %j 时返回 400',
    async (headerValue) => {
      const prisma = createPrismaMock();
      const { app } = await buildGuardedApp(prisma, { userId: 7 });

      const response = await app.inject({
        method: 'GET',
        url: '/guarded',
        headers: { 'project-id': headerValue },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ code: 400, data: null });
      expect(prisma.userProjectRole.findUnique).not.toHaveBeenCalled();
    },
  );
});

describe('requireProjectAccess — 401 未登录', () => {
  it('没有 user 时返回 401，且不查询成员关系', async () => {
    const prisma = createPrismaMock();
    const { app } = await buildGuardedApp(prisma);

    const response = await app.inject({
      method: 'GET',
      url: '/guarded',
      headers: { 'project-id': '42' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ code: 401, message: '未授权，请登录', data: null });
    expect(prisma.userProjectRole.findUnique).not.toHaveBeenCalled();
  });

  it.each([{ userId: 0 }, { userId: -3 }, { userId: 'abc' }, { userId: null }, {}])(
    'user = %j 时返回 401',
    async (user) => {
      const prisma = createPrismaMock();
      const { app } = await buildGuardedApp(prisma, user);

      const response = await app.inject({
        method: 'GET',
        url: '/guarded',
        headers: { 'project-id': '42' },
      });

      expect(response.statusCode).toBe(401);
      expect(prisma.userProjectRole.findUnique).not.toHaveBeenCalled();
    },
  );

  it('未登录且未带 project-id 时，先由 requireAuth 拦下并返回 401', async () => {
    // 注意：实现把 requireAuth 放在 project-id 校验之前，
    // 因此「两者都缺失」的场景返回 401 而不是 400（详见测试报告）。
    const prisma = createPrismaMock();
    const { app } = await buildGuardedApp(prisma);

    const response = await app.inject({ method: 'GET', url: '/guarded' });

    expect(response.statusCode).toBe(401);
    expect(prisma.userProjectRole.findUnique).not.toHaveBeenCalled();
  });
});

describe('requireProjectAccess — 403 非项目成员', () => {
  it('成员关系不存在时返回 403，并按复合主键查询', async () => {
    const prisma = createPrismaMock(null);
    const { app } = await buildGuardedApp(prisma, { userId: 7 });

    const response = await app.inject({
      method: 'GET',
      url: '/guarded',
      headers: { 'project-id': '42' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ code: 403, message: '无权访问该项目', data: null });
    expect(prisma.userProjectRole.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.userProjectRole.findUnique).toHaveBeenCalledWith({
      where: { user_id_project_id: { user_id: 7, project_id: 42 } },
      select: { id: true },
    });
  });
});

describe('requireProjectAccess — 放行', () => {
  it('项目成员通过校验，并把 request.projectId 写回为数字', async () => {
    const prisma = createPrismaMock({ id: 99 });
    const { app, errors } = await buildGuardedApp(prisma, { userId: 7 });

    const response = await app.inject({
      method: 'GET',
      url: '/guarded',
      headers: { 'project-id': '42' },
    });

    expect(errors).toEqual([]);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ projectId: 42 });
    expect(prisma.userProjectRole.findUnique).toHaveBeenCalledWith({
      where: { user_id_project_id: { user_id: 7, project_id: 42 } },
      select: { id: true },
    });
  });

  it('project-id 带前导零时按数值归一化', async () => {
    const prisma = createPrismaMock({ id: 99 });
    const { app } = await buildGuardedApp(prisma, { userId: 7 });

    const response = await app.inject({
      method: 'GET',
      url: '/guarded',
      headers: { 'project-id': '0042' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ projectId: 42 });
  });

  it('userId 为字符串（JWT 解码结果）时按数值校验', async () => {
    const prisma = createPrismaMock({ id: 99 });
    const { app } = await buildGuardedApp(prisma, { userId: '7' });

    const response = await app.inject({
      method: 'GET',
      url: '/guarded',
      headers: { 'project-id': '42' },
    });

    expect(response.statusCode).toBe(200);
    expect(prisma.userProjectRole.findUnique).toHaveBeenCalledWith({
      where: { user_id_project_id: { user_id: 7, project_id: 42 } },
      select: { id: true },
    });
  });
});

describe('requireProjectAccess — 已知缺陷（query 传参回退）', () => {
  it.fails(
    '仅通过 query 传 project_id 应当放行（当前实现返回 400，query 回退分支不可达）',
    async () => {
      // 期望：request.projectId ?? Number(header) ?? Number(query.project_id) 的
      // 第三段回退应该生效（源码注释也声明「兼容 header 与 query 两种传参方式」）。
      // 实际：header 缺失时 Number(undefined) === NaN，NaN 不是 nullish，
      // 所以 ?? 不会继续求值，raw 恒为 NaN → 400。
      const prisma = createPrismaMock({ id: 99 });
      const { app } = await buildGuardedApp(prisma, { userId: 7 });

      const response = await app.inject({ method: 'GET', url: '/guarded?project_id=42' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ projectId: 42 });
    },
  );
});

describe('canAccessProject — 布尔语义', () => {
  it('是项目成员时返回 true，并按复合主键查询', async () => {
    const prisma = createPrismaMock({ id: 3 });

    await expect(canAccessProject(fakeRequest({ userId: 7 }, prisma), 42)).resolves.toBe(true);
    expect(prisma.userProjectRole.findUnique).toHaveBeenCalledWith({
      where: { user_id_project_id: { user_id: 7, project_id: 42 } },
      select: { id: true },
    });
  });

  it('不是项目成员时返回 false', async () => {
    const prisma = createPrismaMock(null);

    await expect(canAccessProject(fakeRequest({ userId: 7 }, prisma), 42)).resolves.toBe(false);
    expect(prisma.userProjectRole.findUnique).toHaveBeenCalledTimes(1);
  });

  it('未登录时返回 false，且不查询数据库', async () => {
    const prisma = createPrismaMock({ id: 1 });

    await expect(canAccessProject(fakeRequest(undefined, prisma), 42)).resolves.toBe(false);
    await expect(canAccessProject(fakeRequest({}, prisma), 42)).resolves.toBe(false);
    expect(prisma.userProjectRole.findUnique).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5, Number.NaN, 'abc', null, undefined])(
    'projectId = %j 非法时返回 false，且不查询数据库',
    async (projectId) => {
      const prisma = createPrismaMock({ id: 1 });

      await expect(canAccessProject(fakeRequest({ userId: 7 }, prisma), projectId)).resolves.toBe(
        false,
      );
      expect(prisma.userProjectRole.findUnique).not.toHaveBeenCalled();
    },
  );
});

describe('assertProjectAccess — 抛错契约', () => {
  const prismaClient = (mock: PrismaMock) => mock as unknown as FastifyRequest['server']['prisma'];

  it('是项目成员时正常返回', async () => {
    const prisma = createPrismaMock({ id: 5 });

    await expect(assertProjectAccess(prismaClient(prisma), 7, 42)).resolves.toBeUndefined();
    expect(prisma.userProjectRole.findUnique).toHaveBeenCalledWith({
      where: { user_id_project_id: { user_id: 7, project_id: 42 } },
      select: { id: true },
    });
  });

  it('不是项目成员时抛出带 403 与 PROJECT_ACCESS_DENIED 的错误', async () => {
    const prisma = createPrismaMock(null);

    const promise = assertProjectAccess(prismaClient(prisma), 7, 42);

    await expect(promise).rejects.toBeInstanceOf(Error);
    await expect(assertProjectAccess(prismaClient(prisma), 7, 42)).rejects.toMatchObject({
      message: '无权访问该项目',
      statusCode: 403,
      code: 'PROJECT_ACCESS_DENIED',
    });
  });
});
