/**
 * MinIO 客户端封装
 * S3 兼容对象存储，用于文件上传/下载
 */
import * as Minio from 'minio';
import { Readable } from 'stream';
import { config } from '@/config';
import { logger } from '@/utils/logger';

let minioClient: Minio.Client | null = null;

export function getMinioClient(): Minio.Client {
  if (!minioClient) {
    minioClient = new Minio.Client({
      endPoint: config.MINIO_ENDPOINT,
      port: config.MINIO_PORT,
      useSSL: false,
      accessKey: config.MINIO_ACCESS_KEY,
      secretKey: config.MINIO_SECRET_KEY,
    });
    logger.info('MinIO client initialized');
  }
  return minioClient;
}

/** 确保 bucket 存在 */
export async function ensureBucket(): Promise<void> {
  const client = getMinioClient();
  const exists = await client.bucketExists(config.MINIO_BUCKET);
  if (!exists) {
    await client.makeBucket(config.MINIO_BUCKET, 'us-east-1');
    logger.info(`MinIO bucket "${config.MINIO_BUCKET}" created`);
  }
}

/** 上传文件 */
export async function uploadObject(
  objectName: string,
  stream: Buffer | Readable,
  size: number,
  contentType?: string,
): Promise<string> {
  const client = getMinioClient();
  await client.putObject(config.MINIO_BUCKET, objectName, stream, size, {
    'Content-Type': contentType ?? 'application/octet-stream',
  });
  return `/${config.MINIO_BUCKET}/${objectName}`;
}

/** 获取临时预签名 URL */
export async function getPresignedUrl(objectName: string, expiry = 3600): Promise<string> {
  const client = getMinioClient();
  return client.presignedGetObject(config.MINIO_BUCKET, objectName, expiry);
}

/** 删除对象 */
export async function removeObject(objectName: string): Promise<void> {
  const client = getMinioClient();
  await client.removeObject(config.MINIO_BUCKET, objectName);
}
