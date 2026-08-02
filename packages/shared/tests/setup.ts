import { beforeAll, afterEach, afterAll } from 'vitest';
import { factories } from './factories/index.js';

beforeAll(() => {
  factories.resetCounters();
});

afterEach(() => {
  factories.resetCounters();
});

afterAll(() => {
  factories.resetCounters();
});
