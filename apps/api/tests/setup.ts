import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createMockServer } from './mocks/msw-server';

export const prisma = new PrismaClient({
  log: ['error'],
});

export const mockServer = createMockServer();

beforeAll(async () => {
  await prisma.$connect();
  mockServer.listen({ onUnhandledRequest: 'error' });
});

afterAll(async () => {
  mockServer.close();
  await prisma.$disconnect();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockServer.resetHandlers();
});

afterEach(() => {
  vi.restoreAllMocks();
});

export const cleanDatabase = async () => {
  const models = Reflect.ownKeys(prisma).filter(
    key => typeof key === 'string' && !key.startsWith('_') && !key.startsWith('$')
  ) as string[];

  for (const model of models) {
    const modelClient = (prisma as Record<string, { deleteMany: () => Promise<{ count: number }> }>)[model];
    if (modelClient && typeof modelClient.deleteMany === 'function') {
      try {
        await modelClient.deleteMany();
      } catch {
      }
    }
  }
};

export const seedDatabase = async (data: Record<string, unknown[]>) => {
  for (const [model, records] of Object.entries(data)) {
    const modelClient = (prisma as Record<string, { createMany: (args: { data: unknown[] }) => Promise<{ count: number }> }>)[model];
    if (modelClient && typeof modelClient.createMany === 'function') {
      await modelClient.createMany({ data: records });
    }
  }
};