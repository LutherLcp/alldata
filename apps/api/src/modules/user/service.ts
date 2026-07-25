/**
 * 用户查询服务 — 用户列表/详情/行为时间线
 */
import { FastifyInstance } from 'fastify';

export class UserService {
  private prisma;

  constructor(private app: FastifyInstance) {
    this.prisma = app.prisma;
  }

  /** 用户列表（分页 + 关键词搜索） */
  async listUsers(options: {
    keyword?: string;
    status?: number;
    page?: number;
    pageSize?: number;
  }) {
    const { keyword, status, page = 1, pageSize = 20 } = options;
    const where: any = {};
    if (keyword) {
      where.OR = [
        { username: { contains: keyword, mode: 'insensitive' } },
        { email: { contains: keyword, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          status: true,
          lang: true,
          login_method: true,
          created_at: true,
          updated_at: true,
          project_roles: {
            include: {
              project: { select: { id: true, code: true, name: true } },
              role: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { list, total };
  }

  /** 用户详情 */
  async getUser(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        status: true,
        lang: true,
        login_method: true,
        created_at: true,
        updated_at: true,
        project_roles: {
          include: {
            project: { select: { id: true, code: true, name: true } },
            role: { select: { id: true, name: true, permissions: true } },
          },
        },
      },
    });
  }

  /** 用户行为时间线（基于事件日志模拟） */
  async getUserTimeline(id: number, projectId: number, options: { startDate?: string; endDate?: string; limit?: number }) {
    const { startDate, endDate, limit = 50 } = options;
    // 这里返回模拟的用户行为时间线数据
    // 实际项目中可从 ClickHouse 查询事件日志
    const events = [
      { timestamp: new Date().toISOString(), event: 'login', properties: { ip: '192.168.1.1', device: 'web' } },
      { timestamp: new Date(Date.now() - 3600000).toISOString(), event: 'page_view', properties: { url: '/dashboard', duration: 120 } },
      { timestamp: new Date(Date.now() - 7200000).toISOString(), event: 'click_button', properties: { button: 'export', page: '/analysis' } },
    ];
    return events.slice(0, limit);
  }

  /** 更新用户状态 */
  async updateStatus(id: number, status: number) {
    return this.prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, username: true, status: true },
    });
  }
}
