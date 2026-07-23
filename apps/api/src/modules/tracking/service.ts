/**
 * 埋点管理服务 — Story + EventDefinition + EventProperty CRUD
 */
import { FastifyInstance } from 'fastify';

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

  async getStory(id: number) {
    return this.prisma.story.findUnique({
      where: { id },
      include: { events: { include: { properties: true }, orderBy: { created_at: 'desc' } } },
    });
  }

  async createStory(data: { project_id: number; name: string; docs_url?: string }, userId: number) {
    return this.prisma.story.create({ data: { ...data, created_by: userId } });
  }

  async updateStory(id: number, data: { name?: string; docs_url?: string; status?: number }) {
    return this.prisma.story.update({ where: { id }, data });
  }

  async deleteStory(id: number) {
    return this.prisma.story.delete({ where: { id } });
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

  async getEvent(id: number) {
    return this.prisma.eventDefinition.findUnique({
      where: { id },
      include: { properties: { orderBy: { sort_order: 'asc' } } },
    });
  }

  async createEvent(data: {
    project_id: number; story_id?: number; name: string;
    display_name?: string; description?: string;
  }) {
    return this.prisma.eventDefinition.create({ data });
  }

  async updateEvent(id: number, data: {
    display_name?: string; description?: string; status?: number; story_id?: number;
  }) {
    return this.prisma.eventDefinition.update({ where: { id }, data });
  }

  async deleteEvent(id: number) {
    return this.prisma.eventDefinition.delete({ where: { id } });
  }

  // ─── EventProperty ──────────────────────────
  async createProperty(data: {
    event_id: number; name: string; data_type: string;
    is_required?: boolean; description?: string; sort_order?: number;
  }) {
    return this.prisma.eventProperty.create({ data });
  }

  async updateProperty(id: number, data: {
    data_type?: string; is_required?: boolean;
    description?: string; sort_order?: number;
  }) {
    return this.prisma.eventProperty.update({ where: { id }, data });
  }

  async deleteProperty(id: number) {
    return this.prisma.eventProperty.delete({ where: { id } });
  }
}
