import { logger } from '@/utils/logger';
/**
 * ClickHouse 客户端封装
 * 为 V2 分析引擎预备，V1 仅建立连接基础
 */
import { type ClickHouseClient, createClient } from '@clickhouse/client';

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

/**
 * 执行查询并返回结果。
 *
 * 参数通过 ClickHouse 占位符（`{name:Type}`）传递，绝不要拼接进 SQL 字符串。
 */
export async function chQuery<T = Record<string, unknown>>(
  sql: string,
  params: Record<string, unknown> = {},
): Promise<T[]> {
  const ch = getClickHouseClient();
  const result = await ch.query({
    query: sql,
    query_params: params,
    format: 'JSONEachRow',
  });
  return result.json<T>();
}

/** 执行命令（DDL/DML） */
export async function chExec(sql: string, params: Record<string, unknown> = {}): Promise<void> {
  const ch = getClickHouseClient();
  await ch.command({ query: sql, query_params: params });
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
