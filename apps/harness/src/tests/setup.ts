/**
 * 测试环境初始化
 */
import { beforeAll, afterAll, afterEach } from 'vitest';
import { server } from '../mock-server/server.js';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
