/**
 * 标签管理服务 — UserTag + TagHistory CRUD
 */
import { FastifyInstance } from 'fastify';

export class TagService {
  private prisma;
  constructor(private app: FastifyInstance) { this.prisma = app.prisma; }

  async listTags(projectId: number, tagType?: string) {
    const where: any = { project_id: projectId };
    if (tagType) where.tag_type = tagType;
    return this.prisma.userTag.findMany({ where, orderBy: { updated_at: 'desc' } });
  }

  async getTag(id: number) {
    return this.prisma.userTag.findUnique({ where: { id }, include: { histories: { orderBy: { created_at: 'desc' }, take: 10 } } });
  }

  async createTag(data: { project_id: number; name: string; display_name?: string; tag_type: string; entity_type?: string; category_id?: number; description?: string; sql_content?: string; config?: any; refresh_cron?: string }, userId: number) {
    return this.prisma.userTag.create({ data: { ...data, created_by: userId } });
  }

  async updateTag(id: number, data: { display_name?: string; description?: string; status?: number; config?: any; sql_content?: string; refresh_cron?: string }) {
    return this.prisma.userTag.update({ where: { id }, data });
  }

  async deleteTag(id: number) { return this.prisma.userTag.delete({ where: { id } }); }

  async triggerRefresh(id: number) {
    // 模拟标签计算（V3 阶段接入真实计算引擎）
    const tag = await this.prisma.userTag.update({ where: { id }, data: { status: 3 } });
    // 模拟完成
    const count = Math.floor(Math.random() * 10000);
    await this.prisma.userTag.update({ where: { id }, data: { status: 1, entity_count: count, last_refresh_at: new Date() } });
    await this.prisma.tagHistory.create({ data: { tag_id: id, status: 2, entity_count: count, duration_ms: Math.floor(Math.random() * 3000) + 200 } });
    return { tag_id: id, entity_count: count, status: 'completed' };
  }
}
