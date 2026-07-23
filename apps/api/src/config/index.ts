import 'dotenv/config';

export const config = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '4000', 10),
  HOST: process.env.HOST ?? '0.0.0.0',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
  COOKIE_SECRET: process.env.COOKIE_SECRET ?? 'dev-cookie-secret-change-in-production',
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://alldata:alldata123@localhost:5432/alldata?schema=public',
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
  MINIO_ENDPOINT: process.env.MINIO_ENDPOINT ?? 'localhost',
  MINIO_PORT: parseInt(process.env.MINIO_PORT ?? '9000', 10),
  MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
  MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY ?? 'minioadmin123',
  MINIO_BUCKET: process.env.MINIO_BUCKET ?? 'alldata',
  CLICKHOUSE_URL: process.env.CLICKHOUSE_URL ?? 'http://localhost:8123',
  CLICKHOUSE_DATABASE: process.env.CLICKHOUSE_DATABASE ?? 'alldata',
} as const;

export type Config = typeof config;