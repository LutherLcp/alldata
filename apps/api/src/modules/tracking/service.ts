/**
 * 埋点管理服务 — Story + EventDefinition + EventProperty CRUD
 *
 * 所有按 ID 的操作都带 project_id 过滤，避免跨租户按 ID 直接访问（IDOR）。
 * EventProperty 自身没有 project_id，通过所属事件关联校验项目归属。
 */
import type { FastifyInstance } from 'fastify';

export class TrackingService {
  private prisma;

  constructor(private app: FastifyInstance) {
    this.prisma = app.prisma;
  }

  // ─── Story ──────────────────────────────────
  async listStories(projectId: number) {
    return this.prisma.story.findMany({
      where: { project_id: projectId },
      include: { _count: { select: { events: true } } },
      orderBy: { created_at: 'desc' },
    });
  }

  async getStory(id: number, projectId: number) {
    return this.prisma.story.findFirst({
      where: { id, project_id: projectId },
      include: { events: { include: { properties: true }, orderBy: { created_at: 'desc' } } },
    });
  }

  async createStory(
    data: { project_id: number; name: string; docs_url?: string; description?: string },
    userId: number,
  ) {
    const { project_id, name, docs_url } = data;
    return this.prisma.story.create({ data: { project_id, name, docs_url, created_by: userId } });
  }

  async updateStory(
    id: number,
    projectId: number,
    data: { name?: string; docs_url?: string; status?: number },
  ) {
    const result = await this.prisma.story.updateMany({
      where: { id, project_id: projectId },
      data,
    });
    if (result.count === 0) return null;
    return this.prisma.story.findUnique({ where: { id } });
  }

  async deleteStory(id: number, projectId: number) {
    const result = await this.prisma.story.deleteMany({
      where: { id, project_id: projectId },
    });
    return result.count > 0;
  }

  // ─── EventDefinition ────────────────────────
  async listEvents(projectId: number, storyId?: number) {
    const where: any = { project_id: projectId };
    if (storyId) where.story_id = storyId;
    return this.prisma.eventDefinition.findMany({
      where,
      include: { properties: true, story: { select: { id: true, name: true } } },
      orderBy: { created_at: 'desc' },
    });
  }

  async getEvent(id: number, projectId: number) {
    return this.prisma.eventDefinition.findFirst({
      where: { id, project_id: projectId },
      include: { properties: { orderBy: { sort_order: 'asc' } } },
    });
  }

  async createEvent(data: {
    project_id: number;
    story_id?: number;
    name: string;
    display_name?: string;
    description?: string;
    event_type?: string;
  }) {
    const { project_id, story_id, name, display_name, description } = data;
    return this.prisma.eventDefinition.create({
      data: { project_id, story_id, name, display_name, description },
    });
  }

  async updateEvent(
    id: number,
    projectId: number,
    data: {
      display_name?: string;
      description?: string;
      status?: number;
      story_id?: number;
    },
  ) {
    const result = await this.prisma.eventDefinition.updateMany({
      where: { id, project_id: projectId },
      data,
    });
    if (result.count === 0) return null;
    return this.prisma.eventDefinition.findUnique({ where: { id } });
  }

  async deleteEvent(id: number, projectId: number) {
    const result = await this.prisma.eventDefinition.deleteMany({
      where: { id, project_id: projectId },
    });
    return result.count > 0;
  }

  // ─── EventProperty ──────────────────────────
  async createProperty(
    data: {
      event_id: number;
      name: string;
      data_type: string;
      is_required?: boolean;
      description?: string;
      sort_order?: number;
    },
    projectId: number,
  ) {
    // EventProperty 自身没有 project_id，先确认所属事件属于该项目
    const event = await this.prisma.eventDefinition.findFirst({
      where: { id: data.event_id, project_id: projectId },
      select: { id: true },
    });
    if (!event) return null;

    return this.prisma.eventProperty.create({ data });
  }

  async updateProperty(
    id: number,
    projectId: number,
    data: {
      data_type?: string;
      is_required?: boolean;
      description?: string;
      sort_order?: number;
    },
  ) {
    // 通过所属事件关联校验项目归属
    const result = await this.prisma.eventProperty.updateMany({
      where: { id, event: { project_id: projectId } },
      data,
    });
    if (result.count === 0) return null;
    return this.prisma.eventProperty.findUnique({ where: { id } });
  }

  async deleteProperty(id: number, projectId: number) {
    const result = await this.prisma.eventProperty.deleteMany({
      where: { id, event: { project_id: projectId } },
    });
    return result.count > 0;
  }
}
