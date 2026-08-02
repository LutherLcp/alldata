/**
 * 海量高并发性能测试数据压测生成器
 * 往 ClickHouse 与 PostgreSQL 数据库中并发注入 100,000+ 条真实用户行为事件与模型数据
 */
import { PrismaClient } from '@prisma/client';
import { createClient } from '@clickhouse/client';
import 'dotenv/config';

const prisma = new PrismaClient();

const clickhouse = createClient({
  url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  database: process.env.CLICKHOUSE_DB || 'default',
});

const EVENT_NAMES = ['$pageview', '$click', 'add_to_cart', 'checkout_start', 'payment_success', 'share_product', 'banner_click'];
const CITIES = ['Beijing', 'Shanghai', 'Shenzhen', 'Guangzhou', 'Hangzhou', 'Chengdu', 'Wuhan', 'Nanjing'];
const OS_LIST = ['iOS 17.5', 'Android 14', 'macOS 14.4', 'Windows 11'];

async function main() {
  console.log('🚀 启动海量测试数据高性能并发生成引擎...');
  const startTime = Date.now();

  const totalEvents = 100000;
  const batchSize = 10000;
  const projectId = 1;

  // 1. 自动初始化 ClickHouse 核心数据表
  console.log('⚡ 检查并建建 ClickHouse 高性能事件引擎表...');
  await clickhouse.exec({
    query: `
      CREATE TABLE IF NOT EXISTS tracking_events (
        project_id UInt32,
        event_name String,
        user_id String,
        distinct_id String,
        event_time DateTime,
        properties String
      ) ENGINE = MergeTree()
      ORDER BY (project_id, event_name, event_time, user_id);
    `,
  });

  // 2. 确保 PostgreSQL 默认项目存在
  await prisma.project.upsert({
    where: { id: projectId },
    update: {},
    create: {
      id: projectId,
      code: 'benchmark_proj',
      name: '百万级压测性能分析项目',
      status: 1,
      config: { timezone: 'Asia/Shanghai', currency: 'CNY' },
      created_by: 1,
    },
  });

  // 3. 批量推入 ClickHouse
  console.log(`⚡ 开始往 ClickHouse 注入 ${totalEvents} 条高性能行为事件 (分成 ${totalEvents / batchSize} 个批次)...`);

  for (let i = 0; i < totalEvents; i += batchSize) {
    const eventsBatch = [];
    const now = Date.now();

    for (let j = 0; j < batchSize; j++) {
      const idx = i + j;
      const userId = `user_${(idx % 5000) + 1}`;
      const eventName = EVENT_NAMES[idx % EVENT_NAMES.length];
      const city = CITIES[idx % CITIES.length];
      const os = OS_LIST[idx % OS_LIST.length];
      const eventTime = new Date(now - Math.floor(Math.random() * 14 * 24 * 3600 * 1000));

      eventsBatch.push({
        project_id: projectId,
        event_name: eventName,
        user_id: userId,
        distinct_id: `dist_${userId}`,
        event_time: eventTime.toISOString().replace('T', ' ').replace('Z', '').split('.')[0],
        properties: JSON.stringify({
          city,
          os,
          price: Math.floor(Math.random() * 500) + 10,
          page_url: `https://shop.example.com/product/${(idx % 50) + 1}`,
          duration: Math.floor(Math.random() * 120),
        }),
      });
    }

    await clickhouse.insert({
      table: 'tracking_events',
      values: eventsBatch,
      format: 'JSONEachRow',
    });
    console.log(`  ✓ 批次 [${i + 1} ~ ${i + batchSize}] 注入成功 (${eventsBatch.length} 条)`);
  }

  // 4. 在 PostgreSQL 批量生成测试 User
  console.log('⚡ 开始往 PostgreSQL 写入高密度 360 画像测试用户与全景数据...');
  const userUpserts = [];
  for (let u = 1; u <= 50; u++) {
    userUpserts.push(
      prisma.user.upsert({
        where: { id: u + 100 },
        update: {},
        create: {
          id: u + 100,
          username: `benchmark_user_${u}`,
          password_hash: '$2b$10$e8w.x7W3P/Q/1a2b3c4d5e6f7g8h9i0j',
          email: `user_${u}@benchmark.com`,
          status: 1,
          lang: 'zh_CN',
          login_method: 'password',
        },
      })
    );
  }
  await Promise.all(userUpserts);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n🎉 海量数据压测压入完成！数据总量: ${totalEvents} 条事件 + 50 个高密集画像用户。总耗时: ${duration}s`);
}

main()
  .catch((e) => {
    console.error('❌ 压测数据生成失败:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await clickhouse.close();
  });
