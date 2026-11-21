export interface TrackerConfig {
  /** 项目 ID（与后台项目的 project_id 对应） */
  projectId: number;
  /** 事件上报服务端 URL，例如 https://analytics.example.com/api/tracking/collect */
  serverUrl: string;
  /** 是否开启全埋点（自动采集 $pageview 和 $web_click），默认 true */
  autoTrack?: boolean;
  /** 批量上报阈值条数，默认 10 条 */
  batchSize?: number;
  /** 批量上报时间间隔（毫秒），默认 2000ms (2s) */
  batchIntervalMs?: number;
  /** 是否输出调试日志，默认 false */
  debug?: boolean;
  /** 自定义请求头 */
  headers?: Record<string, string>;
}

export interface TrackingEvent {
  event_name: string;
  project_id: number;
  user_id?: number | string;
  distinct_id: string;
  anonymous_id: string;
  event_time: number;
  properties: Record<string, unknown>;
}

export interface PresetProperties {
  $os?: string;
  $browser?: string;
  $screen_width?: number;
  $screen_height?: number;
  $url?: string;
  $title?: string;
  $referrer?: string;
  $utm_source?: string;
  $utm_medium?: string;
  $utm_campaign?: string;
  $utm_term?: string;
  $utm_content?: string;
  [key: string]: unknown;
}
