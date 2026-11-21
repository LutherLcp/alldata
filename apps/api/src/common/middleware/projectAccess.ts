/**
 * 项目访问守卫 — 多租户隔离的强制校验
 *
 * 背景：`project-id` 由客户端通过请求头提供，若不校验成员关系，
 * 任何已登录用户只要改一个 header 就能读取其他项目的数据。
 * 本守卫确保「请求中的 project_id」一定是「当前用户有权访问的项目」。
 */
import { requireAuth } from '@/plugins/auth';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * preHandler：校验 project-id 并确认当前用户是该项目成员。
 * 通过后把校验过的 projectId 写回 request.projectId，供后续 handler 使用。
 */
export function requireProjectAccess() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    if (reply.sent) return;

    // 兼容 header 与 query 两种传参方式（前端历史实现两者都在用，同时支持 x-project-id）
    const headerPid = request.headers['project-id'] ?? request.headers['x-project-id'];
    const queryPid = (request.query as { project_id?: unknown } | undefined)?.project_id;
    const raw = request.projectId ?? (headerPid !== undefined ? headerPid : queryPid);
    const projectId = Number(raw);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return reply.code(400).send({
        code: 400,
        message: '缺少或非法的 project-id 请求头',
        data: null,
      });
    }

    const userId = Number((request as { user?: { userId?: unknown } }).user?.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return reply.code(401).send({ code: 401, message: '未授权，请登录', data: null });
    }

    const membership = await request.server.prisma.userProjectRole.findUnique({
      where: { user_id_project_id: { user_id: userId, project_id: projectId } },
      select: { id: true },
    });

    if (!membership) {
      return reply.code(403).send({
        code: 403,
        message: '无权访问该项目',
        data: null,
      });
    }

    request.projectId = projectId;
  };
}

/**
 * 校验请求体中携带的 project_id 是否属于当前用户。
 * 适用于 project_id 走请求体（而非请求头）的接口，避免这些接口绕过项目隔离。
 */
export async function canAccessProject(
  request: FastifyRequest,
  projectId: unknown,
): Promise<boolean> {
  const pid = Number(projectId);
  if (!Number.isInteger(pid) || pid <= 0) return false;

  const userId = Number((request as { user?: { userId?: unknown } }).user?.userId);
  if (!Number.isInteger(userId) || userId <= 0) return false;

  const membership = await request.server.prisma.userProjectRole.findUnique({
    where: { user_id_project_id: { user_id: userId, project_id: pid } },
    select: { id: true },
  });
  return Boolean(membership);
}

/**
 * 非 preHandler 场景下的直接断言（供 service 内部调用）。
 * @throws 当用户不属于该项目时抛出，由 errorHandler 统一转换为 403
 */
export async function assertProjectAccess(
  prisma: FastifyRequest['server']['prisma'],
  userId: number,
  projectId: number,
): Promise<void> {
  const membership = await prisma.userProjectRole.findUnique({
    where: { user_id_project_id: { user_id: userId, project_id: projectId } },
    select: { id: true },
  });
  if (!membership) {
    const error = new Error('无权访问该项目') as Error & { statusCode: number; code: string };
    error.statusCode = 403;
    error.code = 'PROJECT_ACCESS_DENIED';
    throw error;
  }
}
