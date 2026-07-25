/**
 * 枚举管理服务 — EnumDefinition CRUD
 */
import { FastifyInstance } from 'fastify';

export class EnumService {
  private prisma;
  constructor(private app: FastifyInstance) { this.prisma = app.prisma; }

  async listEnums(projectId: number) {
    return this.prisma.enumDefinition.findMany({ where: { project_id: projectId }, orderBy: { created_at: 'desc' } });
  }
  async getEnum(id: number) { return this.prisma.enumDefinition.findUnique({ where: { id } }); }
  async createEnum(data: { project_id: number; type_key: string; name: string; items: any; description?: string }, userId: number) {
    const { project_id, type_key, name, items, description } = data;
    return this.prisma.enumDefinition.create({ data: { project_id, type_key, name, items, description, created_by: userId } });
  }
  async updateEnum(id: number, data: { name?: string; items?: any; description?: string }) {
    return this.prisma.enumDefinition.update({ where: { id }, data });
  }
  async deleteEnum(id: number) { return this.prisma.enumDefinition.delete({ where: { id } }); }
}
