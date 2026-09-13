/**
 * TanStack Query — queryKey 工厂
 *
 * 统一管理所有 queryKey，确保：
 * 1. 缓存命中精确（相同参数 → 相同 key → 命中缓存）
 * 2. invalidateQueries 精准失效（按前缀层级匹配）
 * 3. 类型安全（as const 推断）
 *
 * @example
 * // 精确匹配
 * queryKeys.dashboard.detail(42)
 * // => ['dashboard', 'detail', 42] as const
 *
 * // 前缀匹配 — 使看板列表缓存全部失效
 * queryClient.invalidateQueries({ queryKey: ['dashboard'] })
 */

import type { AnalysisQuery } from '@/services-new/analysis';

// ─── 分析模块 ───────────────────────────────────────────
export const analysisKeys = {
  all: ['analysis'] as const,

  /** 事件分析 */
  event: (projectId: number, params: AnalysisQuery) =>
    ['analysis', 'event', projectId, params] as const,

  /** 漏斗分析 */
  funnel: (projectId: number, params: AnalysisQuery) =>
    ['analysis', 'funnel', projectId, params] as const,

  /** 留存分析 */
  retention: (projectId: number, params: AnalysisQuery) =>
    ['analysis', 'retention', projectId, params] as const,

  /** 分布分析 */
  distribution: (projectId: number, params: AnalysisQuery) =>
    ['analysis', 'distribution', projectId, params] as const,

  /** 路径分析 */
  path: (projectId: number, params: AnalysisQuery) =>
    ['analysis', 'path', projectId, params] as const,

  /** 归因分析 */
  attribution: (projectId: number, params: AnalysisQuery) =>
    ['analysis', 'attribution', projectId, params] as const,
} as const;

// ─── 看板模块 ───────────────────────────────────────────
export const dashboardKeys = {
  all: ['dashboard'] as const,

  /** 文件夹树 */
  folderTree: (projectId: number) => ['dashboard', 'folders', projectId] as const,

  /** 看板列表（按项目 + 文件夹筛选） */
  list: (projectId: number, folderId?: number) =>
    ['dashboard', 'list', projectId, folderId] as const,

  /** 看板详情 */
  detail: (id: number) => ['dashboard', 'detail', id] as const,

  /** 看板内的报表列表 */
  reports: (dashboardId: number) => ['dashboard', 'reports', dashboardId] as const,
} as const;

// ─── 标签模块 ───────────────────────────────────────────
export const tagKeys = {
  all: ['tag'] as const,

  /** 标签列表 */
  list: (projectId: number, tagType?: string) => ['tag', 'list', projectId, tagType] as const,

  /** 标签详情 */
  detail: (id: number) => ['tag', 'detail', id] as const,
} as const;

// ─── 埋点管理 ───────────────────────────────────────────
export const trackingKeys = {
  all: ['tracking'] as const,

  /** 需求列表 */
  stories: (projectId: number) => ['tracking', 'stories', projectId] as const,

  /** 需求详情 */
  story: (id: number) => ['tracking', 'story', id] as const,

  /** 事件列表 */
  events: (projectId: number, storyId?: number) =>
    ['tracking', 'events', projectId, storyId] as const,

  /** 事件详情 */
  event: (id: number) => ['tracking', 'event', id] as const,
} as const;

// ─── 指标管理 ───────────────────────────────────────────
export const metricKeys = {
  all: ['metric'] as const,

  list: (projectId: number) => ['metric', 'list', projectId] as const,

  detail: (id: number) => ['metric', 'detail', id] as const,
} as const;

// ─── 用户管理 ───────────────────────────────────────────
export const userKeys = {
  all: ['user'] as const,

  list: (params?: { keyword?: string; status?: number; page?: number }) =>
    ['user', 'list', params] as const,

  detail: (id: number) => ['user', 'detail', id] as const,

  timeline: (userId: number, projectId: number) => ['user', 'timeline', userId, projectId] as const,
} as const;

// ─── 项目 ──────────────────────────────────────────────
export const projectKeys = {
  all: ['project'] as const,
  list: () => ['project', 'list'] as const,
  detail: (id: number) => ['project', 'detail', id] as const,
} as const;

// ─── 统一导出 ──────────────────────────────────────────
export const queryKeys = {
  analysis: analysisKeys,
  dashboard: dashboardKeys,
  tag: tagKeys,
  tracking: trackingKeys,
  metric: metricKeys,
  user: userKeys,
  project: projectKeys,
} as const;
