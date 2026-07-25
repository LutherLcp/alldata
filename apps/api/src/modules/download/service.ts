/**
 * 下载任务服务 — DownloadTask CRUD
 */
import { FastifyInstance } from 'fastify';

export class DownloadService {
  private prisma;
  constructor(private app: FastifyInstance) { this.prisma = app.prisma; }

  async listTasks(projectId: number) {
    const tasks = await this.prisma.downloadTask.findMany({ where: { project_id: projectId }, orderBy: { created_at: 'desc' } });
    return tasks.map((t: any) => ({ ...t, file_size: t.file_size ? Number(t.file_size) : null }));
  }

  async getTask(id: number) { return this.prisma.downloadTask.findUnique({ where: { id } }); }

  async createTask(data: { project_id: number; task_name: string; task_type: string }, userId: number) {
    const { project_id, task_name, task_type } = data;
    return this.prisma.downloadTask.create({ data: { project_id, task_name, task_type, created_by: userId } });
  }

  async deleteTask(id: number) { return this.prisma.downloadTask.delete({ where: { id } }); }

  async executeTask(id: number) {
    // 模拟异步导出
    await this.prisma.downloadTask.update({ where: { id }, data: { status: 2, progress: 50 } });
    // 模拟完成
    const task = await this.prisma.downloadTask.update({
      where: { id },
      data: { status: 3, progress: 100, file_url: `/downloads/report_${id}_${Date.now()}.xlsx`, file_size: BigInt(Math.floor(Math.random() * 1000000)), finished_at: new Date() },
    });
    // BigInt -> number for JSON serialization
    return { ...task, file_size: task.file_size ? Number(task.file_size) : 0 };
  }
}
