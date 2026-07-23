/**
 * @alldata/shared — 通用工具函数
 */
import { v4 as uuidv4 } from 'uuid';

/** 生成唯一 trace-id */
export function generateTraceId(): string {
  return uuidv4();
}

/** 安全 JSON 解析（支持大数值） */
export function parseJsonSafe<T = unknown>(text: string, fallback?: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return (fallback ?? null) as T;
  }
}

/** 数字格式化（千分位） */
export function formatNumber(
  num: number | string | null | undefined,
  options: { decimals?: number; prefix?: string; suffix?: string } = {},
): string {
  if (num == null || num === '') return '-';
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '-';
  const { decimals = 2, prefix = '', suffix = '' } = options;
  const formatted = n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
  return `${prefix}${formatted}${suffix}`;
}

/** 百分比格式化 */
export function formatPercent(num: number | null | undefined, decimals = 2): string {
  if (num == null) return '-';
  return `${(num * 100).toFixed(decimals)}%`;
}

/** 时长格式化（秒 → 人类可读） */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

/** 文件大小格式化 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/** URL 参数序列化 */
export function buildQueryParams(params: Record<string, unknown>): string {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return entries.length > 0 ? `?${entries.join('&')}` : '';
}

/** 深度克隆 */
export function deepClone<T>(obj: T): T {
  return structuredClone(obj);
}

/** 延迟 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 树形数据扁平化 */
export function flattenTree<T extends { children?: T[] }>(nodes: T[]): T[] {
  const result: T[] = [];
  const walk = (items: T[]) => {
    for (const item of items) {
      result.push(item);
      if (item.children?.length) walk(item.children);
    }
  };
  walk(nodes);
  return result;
}

/** 构建树形结构 */
export function buildTree<T extends { id: number | string; parent_id?: number | string | null }>(
  items: T[],
): (T & { children: T[] })[] {
  const map = new Map<number | string, T & { children: T[] }>();
  const roots: (T & { children: T[] })[] = [];

  for (const item of items) {
    map.set(item.id, { ...item, children: [] });
  }

  for (const item of items) {
    const node = map.get(item.id)!;
    if (item.parent_id != null && map.has(item.parent_id)) {
      map.get(item.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/** 防抖 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** 节流 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let last = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    }
  };
}