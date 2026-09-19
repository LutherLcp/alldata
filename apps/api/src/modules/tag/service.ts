/**
 * 标签管理服务 — UserTag + TagHistory CRUD
 *
 * 所有按 ID 的操作都带 project_id 过滤：仅靠路由层的成员校验不足以防止
 * 跨租户直接按 ID 访问（IDOR），数据访问本身必须限定在项目范围内。
 */
import type { FastifyInstance } from 'fastify';

export class TagService {
  private prisma;
  constructor(private app: FastifyInstance) {
    this.prisma = app.prisma;
  }

  async listTags(projectId: number, tagType?: string) {
    const where: any = { project_id: projectId };
    if (tagType) where.tag_type = tagType;
    return this.prisma.userTag.findMany({ where, orderBy: { updated_at: 'desc' } });
  }

  async getTag(id: number, projectId: number) {
    return this.prisma.userTag.findFirst({
      where: { id, project_id: projectId },
      include: { histories: { orderBy: { created_at: 'desc' }, take: 10 } },
    });
  }

  async createTag(
    data: {
      project_id: number;
      name: string;
      display_name?: string;
      tag_type: string;
      entity_type?: string;
      category_id?: number;
      description?: string;
      sql_content?: string;
      config?: any;
      refresh_cron?: string;
    },
    userId: number,
  ) {
    return this.prisma.userTag.create({ data: { ...data, created_by: userId } });
  }

  async updateTag(
    id: number,
    projectId: number,
    data: {
      display_name?: string;
      description?: string;
      status?: number;
      config?: any;
      sql_content?: string;
      refresh_cron?: string;
    },
  ) {
    // 先确认归属，再更新（updateMany 可同时带上 project_id 条件）
    const result = await this.prisma.userTag.updateMany({
      where: { id, project_id: projectId },
      data,
    });
    if (result.count === 0) return null;
    return this.prisma.userTag.findUnique({ where: { id } });
  }

  async deleteTag(id: number, projectId: number) {
    const result = await this.prisma.userTag.deleteMany({
      where: { id, project_id: projectId },
    });
    return result.count > 0;
  }

  async triggerRefresh(id: number, projectId: number) {
    const tag = await this.prisma.userTag.findFirst({
      where: { id, project_id: projectId },
      select: { id: true, tag_type: true },
    });
    if (!tag) return null;

    const started = Date.now();
    await this.prisma.userTag.update({ where: { id }, data: { status: 3 } });

    // 标签计算引擎尚未实现（规划于 R2：SQL/条件/指标/ID/首末次 五类计算）。
    // 此前该处写入 Math.random() 作为「覆盖人数」，会让 entity_count 完全失真，
    // 现改为如实记录一次失败，不再产出虚假指标。
    await this.prisma.userTag.update({ where: { id }, data: { status: 1 } });
    const history = await this.prisma.tagHistory.create({
      data: {
        tag_id: id,
        status: 3, // 3 = 失败
        duration_ms: Date.now() - started,
        error_msg: '标签计算引擎尚未实现（规划于 R2 交付）',
      },
    });

    return {
      tag_id: id,
      tag_type: tag.tag_type,
      status: 'not_implemented',
      history_id: history.id,
      message: '标签计算引擎尚未实现，未产生覆盖人数',
    };
  }
}
