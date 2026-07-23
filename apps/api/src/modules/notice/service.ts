/**
 * 站内信服务 — CRUD + 未读计数
 */
import { FastifyInstance } from 'fastify';

export class NoticeService {
  private prisma;

  constructor(private app: FastifyInstance) {
    this.prisma = app.prisma;
  }

  /** 获取项目通知列表 */
  async listNotices(projectId: number, userId: number, page = 1, pageSize = 20, type?: string) {
    const where: any = { project_id: projectId };
    if (type) where.type = type;

    const [list, total] = await Promise.all([
      this.prisma.notice.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notice.count({ where }),
    ]);

    // 查询已读状态
    const noticeIds = list.map((n: any) => n.id);
    const reads = await this.prisma.noticeRead.findMany({
      where: { user_id: userId, notice_id: { in: noticeIds } },
      select: { notice_id: true },
    });
    const readSet = new Set(reads.map((r: any) => r.notice_id));

    return {
      list: list.map((n: any) => ({ ...n, is_read: readSet.has(n.id) })),
      total,
      page,
      pageSize,
    };
  }

  /** 获取未读计数 */
  async getUnreadCount(projectId: number, userId: number) {
    const totalNotices = await this.prisma.notice.count({ where: { project_id: projectId } });
    const readNotices = await this.prisma.noticeRead.count({
      where: {
        user_id: userId,
        notice: { project_id: projectId },
      },
    });
    return { unread_count: totalNotices - readNotices };
  }

  /** 标记单条已读 */
  async markRead(noticeId: number, userId: number) {
    await this.prisma.noticeRead.upsert({
      where: {
        notice_id_user_id: { notice_id: noticeId, user_id: userId },
      },
      create: { notice_id: noticeId, user_id: userId, is_read: true, read_at: new Date() },
      update: { is_read: true, read_at: new Date() },
    });
    return { read: true };
  }

  /** 标记全部已读 */
  async markAllRead(projectId: number, userId: number) {
    const reads = await this.prisma.noticeRead.findMany({
      where: { user_id: userId, notice: { project_id: projectId } },
      select: { notice_id: true },
    });
    const readIds = new Set(reads.map((r: any) => r.notice_id));

    const allNotices = await this.prisma.notice.findMany({
      where: { project_id: projectId },
      select: { id: true },
    });

    const unreadIds = allNotices
      .filter((n: any) => !readIds.has(n.id))
      .map((n: any) => ({ notice_id: n.id, user_id: userId, is_read: true, read_at: new Date() }));

    if (unreadIds.length > 0) {
      await this.prisma.noticeRead.createMany({ data: unreadIds });
    }

    return { marked: unreadIds.length };
  }

  /** 创建通知 */
  async createNotice(data: {
    project_id: number; title: string; content: string;
    type?: string; status?: number; publish_at?: Date;
  }, userId: number) {
    return this.prisma.notice.create({
      data: {
        project_id: data.project_id,
        title: data.title,
        content: data.content,
        type: data.type ?? 'system',
        status: data.status ?? 2,
        publish_at: data.publish_at ?? new Date(),
        created_by: userId,
      },
    });
  }
}
