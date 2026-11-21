import 'dotenv/config';
import { buildApp } from '@/app';
import { closeRedis } from '@/common/utils/redis';
import { config } from '@/config';
import { logger } from '@/utils/logger';

export { buildApp };

async function start() {
  const app = await buildApp();

  const shutdown = async () => {
    logger.info('Shutting down...');
    await app.close();
    if ((app as any).prisma?.$disconnect) {
      await (app as any).prisma.$disconnect();
    }
    await closeRedis();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    logger.info(`Server running at http://${config.HOST}:${config.PORT}`);
    logger.info(`API Docs: http://${config.HOST}:${config.PORT}/docs`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

// 仅在非测试环境直接启动
if (process.env.NODE_ENV !== 'test') {
  start();
}
