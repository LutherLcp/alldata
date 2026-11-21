/**
 * 开发者生态市场与 SDK 编译工厂 API 服务
 */
import type { AppPlugin, SDKBuildOptions } from '@alldata/shared';
import { get, post, put } from './request';

export interface TenantPluginItem extends AppPlugin {
  status: number; // 1=启用 2=禁用
  config?: Record<string, any>;
  health_status?: 'HEALTHY' | 'UNHEALTHY' | 'UNTESTED';
  last_tested_at?: string | null;
  installed_at?: string | null;
}

export interface PluginTestResult {
  success: boolean;
  pluginId: string;
  latencyMs: number;
  message: string;
  testedAt: string;
  echoPayload?: Record<string, any>;
}

export interface SDKBuildResult {
  code: string;
  bundleSizeKB: number;
  fileName: string;
}

export const marketplaceApi = {
  // 在线编译构建 SDK
  buildSDK: (opts: SDKBuildOptions) => post<SDKBuildResult>('/marketplace/sdk/build', opts),

  // 获取当前项目的插件市场列表 (含安装与配置状态)
  listPlugins: (projectId: number) =>
    get<TenantPluginItem[]>('/marketplace/plugins', { project_id: projectId }),

  // 获取单个插件配置
  getPlugin: (projectId: number, pluginId: string) =>
    get<TenantPluginItem>(`/marketplace/plugins/${pluginId}`, { project_id: projectId }),

  // 安装并启用插件
  installPlugin: (projectId: number, pluginId: string, config?: Record<string, any>) =>
    post<TenantPluginItem>(`/marketplace/plugins/${pluginId}/install?project_id=${projectId}`, {
      config,
    }),

  // 卸载插件
  uninstallPlugin: (projectId: number, pluginId: string) =>
    post<null>(`/marketplace/plugins/${pluginId}/uninstall?project_id=${projectId}`, {}),

  // 更新插件配置
  updateConfig: (projectId: number, pluginId: string, config: Record<string, any>) =>
    put<TenantPluginItem>(`/marketplace/plugins/${pluginId}/config?project_id=${projectId}`, {
      config,
    }),

  // 连通性测试 (Test Ping)
  testPlugin: (projectId: number, pluginId: string, payload?: Record<string, any>) =>
    post<PluginTestResult>(`/marketplace/plugins/${pluginId}/test?project_id=${projectId}`, {
      payload,
    }),
};
