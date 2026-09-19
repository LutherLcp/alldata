import 'dotenv/config';

/**
 * CORS 白名单：支持逗号分隔的多个 Origin。
 * 优先读取 CORS_ORIGINS，兼容旧变量 CORS_ORIGIN。
 */
const corsOrigins = (process.env.CORS_ORIGINS ?? process.env.CORS_ORIGIN ?? 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const config = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number.parseInt(process.env.PORT ?? '4000', 10),
  HOST: process.env.HOST ?? '0.0.0.0',
  CORS_ORIGINS: corsOrigins,
  CORS_ORIGIN: corsOrigins[0],
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
  COOKIE_SECRET: process.env.COOKIE_SECRET ?? 'dev-cookie-secret-change-in-production',
  DATABASE_URL:
    process.env.DATABASE_URL ??
    'postgresql://alldata:alldata123@localhost:5432/alldata?schema=public',
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
  MINIO_ENDPOINT: process.env.MINIO_ENDPOINT ?? 'localhost',
  MINIO_PORT: Number.parseInt(process.env.MINIO_PORT ?? '9000', 10),
  MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
  MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY ?? 'minioadmin123',
  MINIO_BUCKET: process.env.MINIO_BUCKET ?? 'alldata',
  CLICKHOUSE_URL: process.env.CLICKHOUSE_URL ?? 'http://localhost:8123',
  CLICKHOUSE_DATABASE: process.env.CLICKHOUSE_DATABASE ?? 'alldata',
  // AI / LLM 配置
  LLM_PROVIDER: process.env.LLM_PROVIDER ?? 'OPENAI',
  LLM_API_KEY: process.env.LLM_API_KEY ?? '',
  LLM_BASE_URL: process.env.LLM_BASE_URL ?? '',
  LLM_MODEL: process.env.LLM_MODEL ?? 'gpt-4o',
  LLM_MAX_TOKENS: Number.parseInt(process.env.LLM_MAX_TOKENS ?? '4096', 10),
  LLM_TEMPERATURE: Number.parseFloat(process.env.LLM_TEMPERATURE ?? '0.7'),
  LLM_TIMEOUT: Number.parseInt(process.env.LLM_TIMEOUT ?? '30000', 10),
} as const;

export type Config = typeof config;
