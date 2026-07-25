/**
 * MSW 浏览器端 Mock Worker（前端开发用）
 */
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers.js';

export const worker = setupWorker(...handlers);
