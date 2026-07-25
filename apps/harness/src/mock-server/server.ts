/**
 * MSW Node 端 Mock Server（CI/测试用）
 */
import { setupServer } from 'msw/node';
import { handlers } from './handlers.js';

export const server = setupServer(...handlers);

// 独立启动模式
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  server.listen({ onUnhandledRequest: 'warn' });
  console.log('🚀 Mock Server 已启动（Node 模式）');
  console.log('   所有 API 请求将被 MSW 拦截并返回 Mock 数据');

  process.on('SIGINT', () => {
    server.close();
    console.log('\n🛑 Mock Server 已关闭');
    process.exit(0);
  });
}
