/**
 * 推送订阅服务 — Subscription + PushConfig CRUD
 */
import { FastifyInstance } from 'fastify';

export class SubscriptionService {
  private prisma;
  constructor(private app: FastifyInstance) { this.prisma = app.prisma; }

  // ─── Subscription ───
  async listSubscriptions(projectId: number) {
    return this.prisma.subscription.findMany({ where: { project_id: projectId }, orderBy: { created_at: 'desc' } });
  }
  async getSubscription(id: number) { return this.prisma.subscription.findUnique({ where: { id } }); }
  async createSubscription(data: { project_id: number; entity_id: number; entity_type: string; name: string; schedule_cron: string; notify_type: string; notify_config?: any }, userId: number) {
    const { project_id, entity_id, entity_type, name, schedule_cron, notify_type } = data;
    return this.prisma.subscription.create({ data: { project_id, entity_id, entity_type, name, schedule_cron, notify_type, notify_config: data.notify_config || {}, created_by: userId } });
  }
  async updateSubscription(id: number, data: { name?: string; status?: number; schedule_cron?: string; notify_type?: string; notify_config?: any }) {
    return this.prisma.subscription.update({ where: { id }, data });
  }
  async deleteSubscription(id: number) { return this.prisma.subscription.delete({ where: { id } }); }
  async triggerSend(id: number) {
    // 模拟推送
    return { sent: true, subscription_id: id, sent_at: new Date().toISOString(), channel: 'email', recipients: 3 };
  }

  // ─── PushConfig ───
  async listPushConfigs(projectId: number) {
    return this.prisma.pushConfig.findMany({ where: { project_id: projectId }, orderBy: { created_at: 'desc' } });
  }
  async createPushConfig(data: { project_id: number; name: string; push_type: string; entity_id?: number; entity_type?: string; config?: any }, userId: number) {
    const { project_id, name, push_type, entity_id, entity_type } = data;
    return this.prisma.pushConfig.create({ data: { project_id, name, push_type, entity_id, entity_type, config: data.config || {}, created_by: userId } });
  }
  async deletePushConfig(id: number) { return this.prisma.pushConfig.delete({ where: { id } }); }
}
