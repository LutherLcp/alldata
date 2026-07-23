/**
 * 请求上下文中间件
 * 从请求头提取 project-id, trace-id, language 注入到 request
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

// 扩展 FastifyRequest 类型
declare module 'fastify' {
  interface FastifyRequest {
    projectId: number | null;
    traceId: string;
    language: string;
  }
}

export async function requestContext(app: FastifyInstance) {
  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // 提取 project-id
    const projectIdHeader = request.headers['project-id'];
    request.projectId = projectIdHeader ? Number(projectIdHeader) : null;

    // 提取或生成 trace-id
    request.traceId = (request.headers['trace-id'] as string) || uuidv4();

    // 提取语言
    request.language = (request.headers['language'] as string) || 'zh_CN';

    // 注入 trace-id 到响应头
    reply.header('x-trace-id', request.traceId);
  });
}
