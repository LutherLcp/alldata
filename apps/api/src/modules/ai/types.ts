/**
 * AI 模块 — 类型定义
 * LLM 统一调用层所需的全部类型
 */

/** LLM 提供商枚举 */
export enum LLMProvider {
  OPENAI = 'OPENAI',
  TONGYI = 'TONGYI',
  WENXIN = 'WENXIN',
  CUSTOM = 'CUSTOM',
}

/** LLM 配置接口 */
export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number; // 超时毫秒，默认 30000
}

/** 对话消息 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** 完成请求 */
export interface CompletionRequest {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

/** Token 用量 */
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/** 完成响应 */
export interface CompletionResponse {
  id: string;
  content: string;
  model: string;
  usage: TokenUsage;
  finish_reason: string;
  created_at: string;
}

/** 流式回调 */
export interface StreamCallback {
  onChunk: (chunk: string) => void;
  onEnd: (usage?: TokenUsage) => void;
  onError: (error: Error) => void;
}

/** 智能分析请求 */
export interface InsightRequest {
  project_id: number;
  data_type: string; // 'dashboard' | 'report' | 'metric'
  data_id: number;
  context?: string;
}

/** 智能分析响应 */
export interface InsightResponse {
  id: string;
  summary: string;
  key_findings: string[];
  recommendations: string[];
  confidence: number;
  created_at: string;
}

/** NL2SQL 请求 */
export interface NL2SQLRequest {
  project_id: number;
  question: string;
  context?: string;
  tables?: string[];
}

/** NL2SQL 响应 */
export interface NL2SQLResponse {
  id: string;
  sql: string;
  explanation: string;
  confidence: number;
  tables_used: string[];
}

/** 异常检测请求 */
export interface AnomalyDetectionRequest {
  project_id: number;
  metric_name: string;
  data_points: Array<{ timestamp: string; value: number }>;
  sensitivity?: number; // 0-1，灵敏度
}

/** 异常检测结果 */
export interface AnomalyPoint {
  timestamp: string;
  value: number;
  expected: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AnomalyDetectionResponse {
  id: string;
  anomalies: AnomalyPoint[];
  total_anomalies: number;
  summary: string;
  created_at: string;
}

/** 异常分类枚举 */
export type AnomalyCategory = 'spike' | 'trend_shift' | 'seasonal_break' | 'gradual_drift';

/** 异常检测结果（内部使用，含分类信息） */
export interface AnomalyResult {
  index: number;
  timestamp: string;
  value: number;
  expected: number;
  z_score?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: AnomalyCategory;
  methods: string[]; // 哪些检测方法标记了该点
}

/** 异常解读请求 */
export interface AnomalyInterpretRequest {
  anomalies: AnomalyResult[];
  metric_name: string;
  context?: string;
}

/** 异常解读结果 */
export interface AnomalyInterpretation {
  id: string;
  possible_causes: string[];
  recommendations: string[];
  severity_assessment: 'low' | 'medium' | 'high' | 'critical';
  detailed_analysis: string;
  created_at: string;
}

/** 监控配置 */
export interface MonitorConfig {
  project_id: number;
  metric_name: string;
  check_interval: string; // cron 表达式，如 '*/5 * * * *'
  detection_methods: Array<'zscore' | 'iqr' | 'moving_avg'>;
  threshold?: number;
  sensitivity?: number;
  notify_config?: {
    channels: string[];
    recipients: string[];
  };
}

/** 监控配置结果 */
export interface MonitorResult {
  id: string;
  warning_id?: number;
  status: 'active' | 'inactive';
  config: MonitorConfig;
  created_at: string;
}

/** 时序数据点 */
export interface TimeSeriesPoint {
  date: string;
  value: number;
}

/** 时序数据 */
export interface TimeSeriesData {
  metric_name: string;
  points: TimeSeriesPoint[];
  granularity?: string; // 'day' | 'week' | 'month'
}

/** 分析结果（通用） */
export interface AnalysisResult {
  type: 'event' | 'funnel' | 'retention' | 'distribution' | 'path' | 'attribute';
  data: Record<string, unknown>;
  time_range?: { start: string; end: string };
}

/** 关键发现 */
export interface KeyFinding {
  title: string;
  description: string;
  importance: 'high' | 'medium' | 'low';
  metric_value?: number;
}

/** 行动建议 */
export interface Recommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  expected_impact?: string;
}

/** 统计摘要 */
export interface StatisticalSummary {
  count: number;
  mean: number;
  median: number;
  std_dev: number;
  min: number;
  max: number;
  change_rate: number; // 变化率（首尾对比百分比）
  q1: number;
  q3: number;
  iqr: number;
}

/** Prompt 模板 */
export interface PromptTemplate {
  name: string;
  version: string;
  template: string;
  variables: string[];
  description?: string;
}

/** 可用模型信息 */
export interface ModelInfo {
  id: string;
  name: string;
  provider: LLMProvider;
  max_tokens: number;
  description: string;
}
