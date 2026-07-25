/**
 * 项目管理服务
 */
import { FastifyInstance } from 'fastify';
import type { Project, ProjectConfig } from '@alldata/shared';

interface ListOptions {
  page: number;
  pageSize: number;
  keyword?: string;
}

export class ProjectService {
  private prisma;

  constructor(private app: FastifyInstance) {
    this.prisma = app.prisma;
  }

  /** 项目列表（用户有权限的项目） */
  async list(userId: number, opts: ListOptions) {
    const { page, pageSize, keyword } = opts;
    const where: Record<string, unknown> = {
      user_roles: { some: { user_id: userId } },
      status: 1,
    };
    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { code: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        select: { id: true, code: true, name: true, description: true, status: true, config: true, created_at: true, updated_at: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.project.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  /** 项目详情 */
  async getById(id: number): Promise<Project | null> {
    return this.prisma.project.findUnique({
      where: { id },
      select: { id: true, code: true, name: true, description: true, status: true, config: true, created_by: true, created_at: true, updated_at: true },
    }) as Promise<Project | null>;
  }

  /** 创建项目 */
  async create(data: { code: string; name: string; description?: string; config?: ProjectConfig }, userId: number) {
    const project = await this.prisma.project.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        config: (data.config ?? {}) as any,
        created_by: userId,
        // 自动创建默认角色和关联
        roles: {
          create: [
            { name: 'admin', description: '项目管理员', permissions: ['*'], is_system: true },
            { name: 'member', description: '项目成员', permissions: ['dashboard:view', 'analysis:view'], is_system: true },
          ],
        },
      },
      include: { roles: true },
    });

    // 将创建者关联到 admin 角色
    const adminRole = (project as any).roles?.find((r: { name: string }) => r.name === 'admin');
    if (adminRole) {
      await this.prisma.userProjectRole.create({
        data: { user_id: userId, project_id: project.id, role_id: adminRole.id },
      });
    }

    return project;
  }

  /** 更新项目 */
  async update(data: { id: number; name?: string; description?: string; config?: ProjectConfig }) {
    return this.prisma.project.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.config !== undefined && { config: data.config as any }),
      },
    });
  }

  /** 归档项目 */
  async archive(id: number) {
    await this.prisma.project.update({
      where: { id },
      data: { status: 2 },
    });
  }

  /** 更新状态 */
  async updateStatus(id: number, status: number) {
    await this.prisma.project.update({
      where: { id },
      data: { status },
    });
  }
}
