/**
 * KoCRM 管理服务 — Account + Creator CRUD
 */
import { FastifyInstance } from 'fastify';

export class KocrmService {
  private prisma;
  constructor(private app: FastifyInstance) {
    this.prisma = app.prisma;
  }

  // ─── Account 账户 ───
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
    meta?: any;
  }) {
    const { project_id, platform, account_name, account_id, meta } = data;
    return this.prisma.kocrmAccount.create({
      data: { project_id, platform, account_name, account_id, meta: meta || {} },
    });
  }
  async updateAccount(
    id: number,
    data: {
      platform?: string;
      account_name?: string;
      account_id?: string;
      status?: number;
      meta?: any;
    }
  ) {
    return this.prisma.kocrmAccount.update({ where: { id }, data });
  }
  async deleteAccount(id: number) {
    return this.prisma.kocrmAccount.delete({ where: { id } });
  }

  // ─── Creator KOC/达人 ───
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
    meta?: any;
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
        meta: meta || {},
      },
    });
  }
  async updateCreator(
    id: number,
    data: {
      platform?: string;
      name?: string;
      uid?: string;
      followers?: number;
      status?: number;
      tags?: string[];
      meta?: any;
    }
  ) {
    return this.prisma.kocrmCreator.update({ where: { id }, data });
  }
  async deleteCreator(id: number) {
    return this.prisma.kocrmCreator.delete({ where: { id } });
  }
}
