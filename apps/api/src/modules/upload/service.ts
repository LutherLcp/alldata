/**
 * 文件上传服务 — MinIO
 */
import { FastifyInstance } from 'fastify';
import { uploadObject, getPresignedUrl, removeObject } from '@/common/utils/minio';
import { Readable } from 'stream';

export class UploadService {
  constructor(private app: FastifyInstance) {}

  /** 上传文件（multipart） */
  async uploadFile(data: Buffer, filename: string, mimetype: string, userId: number) {
    // 生成唯一对象名：uploads/{userId}/{timestamp}_{filename}
    const objectName = `uploads/${userId}/${Date.now()}_${filename}`;
    const url = await uploadObject(objectName, data, data.length, mimetype);

    // 记录到数据库（如果有 upload 表，否则只返回 URL）
    return {
      url,
      object_name: objectName,
      filename,
      mimetype,
      size: data.length,
    };
  }

  /** 获取临时下载 URL */
  async getDownloadUrl(objectName: string) {
    const url = await getPresignedUrl(objectName);
    return { url };
  }

  /** 删除文件 */
  async deleteFile(objectName: string) {
    await removeObject(objectName);
    return { deleted: true };
  }
}
