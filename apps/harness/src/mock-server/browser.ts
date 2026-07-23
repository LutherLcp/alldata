/**
 * MSW 浏览器端 Mock Worker（前端开发用）
 */
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
/**
 * MSW 浏览器端 Worker（用于前端开发时拦截请求）
 */
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers.js';

export const worker = setupWorker(...handlers);
