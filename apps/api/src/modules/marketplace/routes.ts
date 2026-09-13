import { sendSuccess } from '@/common/utils/response';
import { requireAuth } from '@/plugins/auth';
import type { SDKBuildOptions } from '@alldata/shared';
/**
 * SDK 编译工厂与开发者插件生态 Fastify 路由
 */
import type { FastifyInstance } from 'fastify';
import { generateSDKBundle, getMarketplacePlugins } from './service';

export async function marketplaceRoutes(app: FastifyInstance) {
  // 在线编译构建 SDK Bundle
  app.post('/sdk/build', { preHandler: requireAuth }, async (req, reply) => {
    const opts = req.body as SDKBuildOptions;
    const bundle = generateSDKBundle(opts || {});
    return sendSuccess(reply, bundle, 'SDK 代码定制编译成功');
  });

  // 获取插件市场与 Webhook 列表
  app.get('/plugins', { preHandler: requireAuth }, async (req, reply) => {
    const plugins = getMarketplacePlugins();
    return sendSuccess(reply, plugins);
  });
}
