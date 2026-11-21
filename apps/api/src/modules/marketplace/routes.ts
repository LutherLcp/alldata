import { requireProjectAccess } from '@/common/middleware/projectAccess';
import { ApiError, sendSuccess } from '@/common/utils/response';
import { requireAuth } from '@/plugins/auth';
import type { SDKBuildOptions } from '@alldata/shared';
/**
 * SDK 编译工厂与开发者插件生态 Fastify 路由 (支持多租户配置隔离与 IDOR 防护)
 */
import type { FastifyInstance } from 'fastify';
import { MarketplaceService, generateSDKBundle } from './service';

export async function marketplaceRoutes(app: FastifyInstance) {
  const svc = new MarketplaceService(app);
  const uid = (r: any) => Number(r.user?.userId || 1);

  // 在线编译构建 SDK Bundle (公开/已鉴权开发者工具)
  app.post('/sdk/build', { preHandler: requireAuth }, async (req, reply) => {
    const opts = req.body as SDKBuildOptions;
    const bundle = generateSDKBundle(opts || {});
    return sendSuccess(reply, bundle, 'SDK 代码定制编译成功');
  });

  // 获取插件市场列表 (融入当前项目的安装与启用状态)
  app.get('/plugins', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const plugins = await svc.listPlugins(req.projectId as number);
    return sendSuccess(reply, plugins);
  });

  // 获取单个插件信息及当前项目配置
  app.get('/plugins/:id', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const plugin = await svc.getPlugin(req.projectId as number, id);
    if (!plugin) {
      return ApiError.notFound(reply, '插件不存在');
    }
    return sendSuccess(reply, plugin);
  });

  // 为当前项目安装并启用插件
  app.post('/plugins/:id/install', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};
    const installed = await svc.installPlugin(
      req.projectId as number,
      id,
      uid(req),
      body.config || {},
    );
    if (!installed) {
      return ApiError.notFound(reply, '插件不存在，无法安装');
    }
    return sendSuccess(reply, installed, '插件安装并启用成功');
  });

  // 卸载/停用当前项目插件
  app.post('/plugins/:id/uninstall', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const success = await svc.uninstallPlugin(req.projectId as number, id);
    if (!success) {
      return ApiError.notFound(reply, '该插件尚未在当前项目安装');
    }
    return sendSuccess(reply, null, '插件已成功卸载');
  });

  // 更新插件运行配置
  app.put('/plugins/:id/config', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};
    const updated = await svc.updatePluginConfig(req.projectId as number, id, body.config || {});
    if (!updated) {
      return ApiError.notFound(reply, '未找到已安装的插件配置');
    }
    return sendSuccess(reply, updated, '插件配置更新成功');
  });

  // 连通性测试 (Test Ping / Webhook 试投递)
  app.post('/plugins/:id/test', { preHandler: requireProjectAccess() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};
    const testResult = await svc.testPlugin(req.projectId as number, id, body.payload || {});
    if (!testResult) {
      return ApiError.notFound(reply, '该插件未在当前项目安装，无法执行测试');
    }
    return sendSuccess(reply, testResult, '插件测试执行成功');
  });
}
