/**
 * ClickHouse 客户端封装
 * 为 V2 分析引擎预备，V1 仅建立连接基础
 */
import { createClient, ClickHouseClient } from '@clickhouse/client';
import { logger } from '@/utils/logger';

const CLICKHOUSE_URL = process.env.CLICKHOUSE_URL ?? 'http://localhost:8123';
const CLICKHOUSE_USERNAME = process.env.CLICKHOUSE_USERNAME ?? 'default';
const CLICKHOUSE_PASSWORD = process.env.CLICKHOUSE_PASSWORD ?? '';
const CLICKHOUSE_DATABASE = process.env.CLICKHOUSE_DATABASE ?? 'alldata';

let client: ClickHouseClient | null = null;

export function getClickHouseClient(): ClickHouseClient {
  if (!client) {
    client = createClient({
      url: CLICKHOUSE_URL,
      username: CLICKHOUSE_USERNAME,
      password: CLICKHOUSE_PASSWORD,
      database: CLICKHOUSE_DATABASE,
    });
    logger.info('ClickHouse client initialized');
  }
  return client;
}

export async function closeClickHouse(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
  }
}

/** 执行查询并返回结果 */
export async function chQuery<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  const ch = getClickHouseClient();
  const result = await ch.query({ query: sql, format: 'JSONEachRow' });
  return result.json<T>();
}

/** 执行命令（DDL/DML） */
export async function chExec(sql: string): Promise<void> {
  const ch = getClickHouseClient();
  await ch.command({ query: sql });
}

/** 健康检查 */
export async function chPing(): Promise<boolean> {
  try {
    const ch = getClickHouseClient();
    await ch.ping();
    return true;
  } catch {
    return false;
  }
}
