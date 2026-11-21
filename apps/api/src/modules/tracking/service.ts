/**
 * 埋点管理服务 — Story + EventDefinition + EventProperty CRUD
 *
 * 所有按 ID 的操作都带 project_id 过滤，避免跨租户按 ID 直接访问（IDOR）。
 * EventProperty 自身没有 project_id，通过所属事件关联校验项目归属。
 */
import { getClickHouseClient } from '@/common/utils/clickhouse';
import type { FastifyInstance } from 'fastify';
import { IdMappingService } from './id-mapping.service';

export class TrackingService {
  private prisma;
  private idMapping: IdMappingService;

  constructor(private app: FastifyInstance) {
    this.prisma = app.prisma;
    this.idMapping = new IdMappingService(app);
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

  /**
   * 接收客户端批量采集事件并持久化写入 ClickHouse
   */
  async ingestEvents(
    projectId: number,
    rawEvents: Array<{
      event_name: string;
      event_time?: number | string;
      distinct_id?: string;
      anonymous_id?: string;
      user_id?: number | string;
      properties?: Record<string, unknown>;
    }>,
    _context: { ip?: string; userAgent?: string } = {},
  ): Promise<{ received: number; accepted: number }> {
    // 1. 验证项目是否存在且有效
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, status: 1 },
      select: { id: true },
    });
    if (!project) {
      throw new Error(`Project ${projectId} not found or inactive`);
    }

    if (!rawEvents || rawEvents.length === 0) {
      return { received: 0, accepted: 0 };
    }

    // 2. 规范化并清洗事件，同时进行 ID-Mapping 图谱对齐
    const now = new Date();
    const rows = await Promise.all(
      rawEvents.map(async (e) => {
        const eventTime = e.event_time ? new Date(e.event_time) : now;
        const properties = e.properties || {};

        const os = (properties.$os as string) || '';
        const browser = (properties.$browser as string) || '';
        const deviceType =
          (properties.$device_type as string) ||
          (os === 'iOS' || os === 'Android' ? 'mobile' : 'desktop');

        let userId = 0;
        if (typeof e.user_id === 'number') {
          userId = e.user_id;
        } else if (typeof e.user_id === 'string' && /^\d+$/.test(e.user_id)) {
          userId = Number(e.user_id);
        }

        const anonymousId = e.anonymous_id || (properties.$original_id as string) || '';

        // 如果是 $identify 身份识别事件，建立绑定关系
        if (e.event_name === '$identify') {
          const identifiedIdRaw =
            properties.$identified_id ??
            e.user_id ??
            (typeof e.distinct_id === 'string' && /^\d+$/.test(e.distinct_id)
              ? Number(e.distinct_id)
              : 0);
          const identifiedId = Number(identifiedIdRaw);
          if (identifiedId > 0 && anonymousId) {
            await this.idMapping.recordMapping(projectId, anonymousId, identifiedId);
            userId = identifiedId;
          }
        } else if (anonymousId && userId > 0) {
          // 普通事件携带合法 userId 与 anonymousId，也同步建立映射
          await this.idMapping.recordMapping(projectId, anonymousId, userId);
        } else if (anonymousId && userId <= 0) {
          // 未登录匿名事件：通过 ID-Mapping 引擎解析归属的 canonical user_id
          const resolved = await this.idMapping.resolveUserId(projectId, anonymousId);
          if (resolved) {
            userId = resolved;
          }
        }

        return {
          project_id: projectId,
          event_name: e.event_name,
          user_id: userId,
          event_time: eventTime.toISOString().slice(0, 19).replace('T', ' '),
          properties: JSON.stringify(properties),
          device_type: deviceType,
          os: os,
          browser: browser,
          country: (properties.$country as string) || '',
          region: (properties.$region as string) || '',
          dt: eventTime.toISOString().slice(0, 10),
        };
      }),
    );

    // 3. 批量写入 ClickHouse events 表
    try {
      const ch = getClickHouseClient();
      await ch.insert({
        table: 'events',
        values: rows,
        format: 'JSONEachRow',
      });
    } catch (err) {
      this.app.log.warn(
        { err: (err as Error).message },
        '[TrackingService] ClickHouse batch insert skipped or failed',
      );
    }

    return { received: rawEvents.length, accepted: rows.length };
  }

  /**
   * 解析标识对应的 canonical user_id
   */
  async resolveIdentity(projectId: number, distinctId: string) {
    if (/^\d+$/.test(distinctId)) {
      return {
        project_id: projectId,
        distinct_id: distinctId,
        canonical_user_id: Number(distinctId),
        is_identified: true,
      };
    }
    const resolved = await this.idMapping.resolveUserId(projectId, distinctId);
    return {
      project_id: projectId,
      distinct_id: distinctId,
      canonical_user_id: resolved,
      is_identified: resolved !== null,
    };
  }

  /**
   * 获取用户/设备关联的 OneID 身份图谱
   */
  async getIdentityGraph(projectId: number, identifier: string | number) {
    return this.idMapping.getIdentityGraph(projectId, identifier);
  }
}
