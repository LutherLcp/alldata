import { getClickHouseClient } from '@/common/utils/clickhouse';
import type { FastifyInstance } from 'fastify';

export interface IdentityGraphResult {
  project_id: number;
  user_id?: number;
  anonymous_ids: string[];
  total_devices: number;
}

export class IdMappingService {
  // 内存快速映射缓存：key = `${projectId}:${anonymousId}` -> userId
  private static cache = new Map<string, number>();
  // 反向索引：key = `${projectId}:${userId}` -> Set<anonymousId>
  private static reverseCache = new Map<string, Set<string>>();

  constructor(private app?: FastifyInstance) {}

  /**
   * 记录设备与用户绑定关系 (OneID 身份图谱)
   */
  async recordMapping(projectId: number, anonymousId: string, userId: number): Promise<void> {
    if (!projectId || !anonymousId || !userId || userId <= 0) return;

    const key = `${projectId}:${anonymousId}`;
    const revKey = `${projectId}:${userId}`;

    IdMappingService.cache.set(key, userId);

    let set = IdMappingService.reverseCache.get(revKey);
    if (!set) {
      set = new Set();
      IdMappingService.reverseCache.set(revKey, set);
    }
    set.add(anonymousId);

    // 尝试持久化写入 ClickHouse id_mappings 表
    try {
      const ch = getClickHouseClient();
      await ch.insert({
        table: 'id_mappings',
        values: [
          {
            project_id: projectId,
            anonymous_id: anonymousId,
            user_id: userId,
            created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          },
        ],
        format: 'JSONEachRow',
      });
    } catch (err) {
      this.app?.log.warn?.(
        { err: (err as Error).message },
        '[IdMappingService] ClickHouse id_mappings insert skipped or failed',
      );
    }
  }

  /**
   * 根据 anonymous_id 解析出统一规范的 canonical user_id
   */
  async resolveUserId(projectId: number, anonymousId: string): Promise<number | null> {
    if (!projectId || !anonymousId) return null;

    const key = `${projectId}:${anonymousId}`;
    const cached = IdMappingService.cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    try {
      const ch = getClickHouseClient();
      const result = await ch.query({
        query: `SELECT user_id FROM id_mappings WHERE project_id = {projectId:UInt32} AND anonymous_id = {anonymousId:String} ORDER BY created_at DESC LIMIT 1`,
        query_params: { projectId, anonymousId },
        format: 'JSONEachRow',
      });
      const rows = await result.json<{ user_id: number }>();
      if (rows && rows.length > 0 && rows[0].user_id) {
        const uid = Number(rows[0].user_id);
        IdMappingService.cache.set(key, uid);
        return uid;
      }
    } catch (err) {
      this.app?.log.warn?.(
        { err: (err as Error).message },
        '[IdMappingService] ClickHouse id_mappings query skipped or failed',
      );
    }

    return null;
  }

  /**
   * 查询设备或用户标识关联的完整 Identity Graph
   */
  async getIdentityGraph(
    projectId: number,
    identifier: string | number,
  ): Promise<IdentityGraphResult> {
    let resolvedUserId: number | undefined;
    const anonymousIds = new Set<string>();

    if (typeof identifier === 'number' || /^\d+$/.test(String(identifier))) {
      resolvedUserId = Number(identifier);
    } else {
      anonymousIds.add(String(identifier));
      const uid = await this.resolveUserId(projectId, String(identifier));
      if (uid) resolvedUserId = uid;
    }

    if (resolvedUserId) {
      const revKey = `${projectId}:${resolvedUserId}`;
      const cachedSet = IdMappingService.reverseCache.get(revKey);
      if (cachedSet) {
        for (const aid of cachedSet) {
          anonymousIds.add(aid);
        }
      }

      try {
        const ch = getClickHouseClient();
        const result = await ch.query({
          query: `SELECT DISTINCT anonymous_id FROM id_mappings WHERE project_id = {projectId:UInt32} AND user_id = {userId:UInt64}`,
          query_params: { projectId, userId: resolvedUserId },
          format: 'JSONEachRow',
        });
        const rows = await result.json<{ anonymous_id: string }>();
        for (const row of rows) {
          if (row.anonymous_id) anonymousIds.add(row.anonymous_id);
        }
      } catch {
        // Skip on test / offline
      }
    }

    return {
      project_id: projectId,
      user_id: resolvedUserId,
      anonymous_ids: Array.from(anonymousIds),
      total_devices: anonymousIds.size,
    };
  }

  /**
   * 清空本地缓存（用于测试套件重置）
   */
  static clearCache(): void {
    IdMappingService.cache.clear();
    IdMappingService.reverseCache.clear();
  }
}
