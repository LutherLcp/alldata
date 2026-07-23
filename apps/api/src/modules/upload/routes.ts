/**
 * 文件上传路由
 */
import { FastifyInstance } from 'fastify';
import { requireAuth } from '@/plugins/auth';
import { sendSuccess, ApiError } from '@/common/utils/response';
import { UploadService } from './service';

export async function uploadRoutes(app: FastifyInstance) {
  const svc = new UploadService(app);

  // 上传文件（multipart/form-data）
  app.post('/', { preHandler: requireAuth }, async (req, reply) => {
    const data = await req.file();
    if (!data) return ApiError.badRequest(reply, '未选择文件');

    const buffer = await data.toBuffer();
    const userId = Number((req as any).user.userId);
    const result = await svc.uploadFile(buffer, data.filename, data.mimetype, userId);
    return sendSuccess(reply, result, '上传成功', 201);
  });

  // 获取临时下载 URL
  app.post('/presign', { preHandler: requireAuth }, async (req, reply) => {
    const { object_name } = req.body as any;
    if (!object_name) return ApiError.badRequest(reply, '缺少 object_name');
    const result = await svc.getDownloadUrl(object_name);
    return sendSuccess(reply, result);
  });

  // 删除文件
  app.delete('/:objectName', { preHandler: requireAuth }, async (req, reply) => {
    const { objectName } = req.params as { objectName: string };
    await svc.deleteFile(decodeURIComponent(objectName));
    return sendSuccess(reply, null, '删除成功');
  });
}
