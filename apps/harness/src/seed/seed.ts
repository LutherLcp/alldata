/**
 * 种子数据入口
 *
 * 用法：
 *   pnpm seed           → 输出到控制台
 *   pnpm seed:json      → 输出 JSON 文件到 fixtures/
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateFullSeedData } from './factories.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, '../fixtures');

function main() {
  const args = process.argv.slice(2);
  const format = args.find((a) => a.startsWith('--format='))?.split('=')[1] || 'console';

  console.log('🌱 生成种子数据...\n');
  const data = generateFullSeedData();

  const summary = {
    users: data.users.length,
    projects: data.projects.length,
    folders: data.folders.length,
    dashboards: data.dashboards.length,
    reports: data.reports.length,
    stories: data.stories.length,
    events: data.events.length,
    tags: data.tags.length,
    metrics: data.metrics.length,
    categories: data.categories.length,
    dataTables: data.dataTables.length,
    warnings: data.warnings.length,
    notices: data.notices.length,
    downloads: data.downloads.length,
    calendars: data.calendars.length,
  };

  console.log('📊 数据统计:');
  console.table(summary);

  if (format === 'json') {
    if (!existsSync(fixturesDir)) {
      mkdirSync(fixturesDir, { recursive: true });
    }

    for (const [key, value] of Object.entries(data)) {
      const filePath = resolve(fixturesDir, `${key}.json`);
      writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf-8');
      console.log(`  ✅ ${filePath}`);
    }

    // 完整数据集
    const allPath = resolve(fixturesDir, 'all.json');
    writeFileSync(allPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`\n📁 完整数据集: ${allPath}`);
  } else {
    console.log('\n💡 使用 --format=json 导出到 fixtures/ 目录');
    console.log('\n--- 示例数据预览 ---');
    console.log('\n🏢 项目:', JSON.stringify(data.projects[0], null, 2));
    console.log('\n📊 看板:', JSON.stringify(data.dashboards[0], null, 2));
    console.log('\n🏷️ 标签:', JSON.stringify(data.tags[0], null, 2));
  }

  console.log('\n✨ 种子数据生成完成！');
}

main();
