import { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => ({
    success: true,
    data: { status: 'ok', timestamp: new Date().toISOString() },
  }));

  app.get('/ready', async (request, reply) => {
    try {
      await app.prisma.$queryRaw`SELECT 1`;
      return { success: true, data: { status: 'ready' } };
    } catch {
      reply.code(503);
      return { success: false, error: { code: 'NOT_READY', message: 'Database not ready', statusCode: 503 } };
    }
  });
}