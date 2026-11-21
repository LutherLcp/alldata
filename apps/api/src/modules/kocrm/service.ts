/**
 * KoCRM 私域创作者与社媒矩阵管理服务 — 账户 + 达人矩阵 CRUD 与影响力评估
 */
import type { FastifyInstance } from 'fastify';

export interface CreatorInfluenceResult {
  score: number;
  tier: 'S' | 'A' | 'B' | 'C';
  evaluated_at: string;
}

export class KocrmService {
  private prisma;

  constructor(private app: FastifyInstance) {
    this.prisma = app.prisma;
  }

  // ─── Account 账户管理 ───

  async listAccounts(projectId: number) {
    return this.prisma.kocrmAccount.findMany({
      where: { project_id: projectId },
      orderBy: { created_at: 'desc' },
    });
  }

  async createAccount(data: {
    project_id: number;
    platform: string;
    account_name: string;
    account_id: string;
    meta?: Record<string, unknown>;
  }) {
    const { project_id, platform, account_name, account_id, meta } = data;
    return this.prisma.kocrmAccount.create({
      data: {
        project_id,
        platform,
        account_name,
        account_id,
        meta: (meta || {}) as any,
      },
    });
  }

  async updateAccount(
    id: number,
    projectId: number,
    data: {
      platform?: string;
      account_name?: string;
      account_id?: string;
      status?: number;
      meta?: Record<string, unknown>;
    },
  ) {
    const existing = await this.prisma.kocrmAccount.findFirst({
      where: { id, project_id: projectId },
    });
    if (!existing) return null;

    const updateData: Record<string, unknown> = { ...data };
    if (data.meta) updateData.meta = data.meta as any;
    return this.prisma.kocrmAccount.update({ where: { id }, data: updateData });
  }

  async deleteAccount(id: number, projectId: number): Promise<boolean> {
    const existing = await this.prisma.kocrmAccount.findFirst({
      where: { id, project_id: projectId },
    });
    if (!existing) return false;
    await this.prisma.kocrmAccount.delete({ where: { id } });
    return true;
  }

  // ─── Creator KOC/达人管理 ───

  async listCreators(projectId: number) {
    return this.prisma.kocrmCreator.findMany({
      where: { project_id: projectId },
      orderBy: { created_at: 'desc' },
    });
  }

  async createCreator(data: {
    project_id: number;
    platform: string;
    name: string;
    uid: string;
    followers?: number;
    tags?: string[];
    meta?: Record<string, unknown>;
  }) {
    const { project_id, platform, name, uid, followers, tags, meta } = data;
    return this.prisma.kocrmCreator.create({
      data: {
        project_id,
        platform,
        name,
        uid,
        followers: followers || 0,
        tags: tags || [],
        meta: (meta || {}) as any,
      },
    });
  }

  async updateCreator(
    id: number,
    projectId: number,
    data: {
      platform?: string;
      name?: string;
      uid?: string;
      followers?: number;
      status?: number;
      tags?: string[];
      meta?: Record<string, unknown>;
    },
  ) {
    const existing = await this.prisma.kocrmCreator.findFirst({
      where: { id, project_id: projectId },
    });
    if (!existing) return null;

    const updateData: Record<string, unknown> = { ...data };
    if (data.meta) updateData.meta = data.meta as any;
    return this.prisma.kocrmCreator.update({ where: { id }, data: updateData });
  }

  async deleteCreator(id: number, projectId: number): Promise<boolean> {
    const existing = await this.prisma.kocrmCreator.findFirst({
      where: { id, project_id: projectId },
    });
    if (!existing) return false;
    await this.prisma.kocrmCreator.delete({ where: { id } });
    return true;
  }

  /**
   * 计算达人综合影响力评分 (KOC Social Influence Scoring)
   */
  async calculateCreatorInfluence(
    id: number,
    projectId: number,
  ): Promise<{ creator: any; influence: CreatorInfluenceResult } | null> {
    const creator = await this.prisma.kocrmCreator.findFirst({
      where: { id, project_id: projectId },
    });
    if (!creator) return null;

    const followers = creator.followers || 0;
    let score = 50;
    if (followers >= 1_000_000) {
      score = 95;
    } else if (followers >= 500_000) {
      score = 88;
    } else if (followers >= 100_000) {
      score = 78;
    } else if (followers >= 10_000) {
      score = 65;
    } else {
      score = 50;
    }

    const platform = (creator.platform || '').toLowerCase();
    if (platform.includes('抖音') || platform.includes('douyin')) {
      score = Math.min(100, score + 3);
    } else if (platform.includes('小红书') || platform.includes('xhs')) {
      score = Math.min(100, score + 2);
    }

    const tier: 'S' | 'A' | 'B' | 'C' =
      score >= 90 ? 'S' : score >= 80 ? 'A' : score >= 65 ? 'B' : 'C';

    const metaObj = (creator.meta as Record<string, unknown>) || {};
    const influenceData: CreatorInfluenceResult = {
      score,
      tier,
      evaluated_at: new Date().toISOString(),
    };

    const updated = await this.prisma.kocrmCreator.update({
      where: { id },
      data: {
        meta: {
          ...metaObj,
          influence: influenceData,
        } as any,
      },
    });

    return {
      creator: updated,
      influence: influenceData,
    };
  }
}
