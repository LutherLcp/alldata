/**
 * AI 模块 API 服务
 * 封装 AI 对话、洞察、异常检测等接口
 */
import { get, post } from './request';
import { useAuthStore } from '@/stores/auth';
import { useGlobalStore } from '@/stores/global';

// ─── 类型定义 ─────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionResponse {
  id: string;
  content: string;
  model: string;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  finish_reason: string;
  created_at: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  max_tokens: number;
  description: string;
}

export interface InsightRequest {
  project_id: number;
  data_type: string;
  data_id: number;
  context?: string;
}

export interface InsightResponse {
  id: string;
  summary: string;
  key_findings: string[];
  recommendations: string[];
  confidence: number;
  created_at: string;
}

export interface KeyFinding {
  title: string;
  description: string;
  importance: 'high' | 'medium' | 'low';
  metric_value?: number;
}

export interface Recommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  expected_impact?: string;
}

export interface AnomalyDetectionRequest {
  project_id: number;
  metric_name: string;
  data_points: Array<{ timestamp: string; value: number }>;
  sensitivity?: number;
}

export interface AnomalyPoint {
  timestamp: string;
  value: number;
  expected: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AnomalyResult {
  index: number;
  timestamp: string;
  value: number;
  expected: number;
  z_score?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'spike' | 'trend_shift' | 'seasonal_break' | 'gradual_drift';
  methods: string[];
}

export interface AnomalyDetectionResponse {
  id: string;
  anomalies: AnomalyResult[];
  total_anomalies: number;
  summary: string;
  created_at: string;
}

export interface AnomalyInterpretation {
  id: string;
  possible_causes: string[];
  recommendations: string[];
  severity_assessment: 'low' | 'medium' | 'high' | 'critical';
  detailed_analysis: string;
  created_at: string;
}

// ─── API 方法 ─────────────────────────────

export const aiApi = {
  /** AI 对话（非流式） */
  chat: (messages: ChatMessage[], options?: { model?: string; temperature?: number }) =>
    post<CompletionResponse>('/ai/chat', { messages, stream: false, ...options }),

  /** AI 文本完成 */
  complete: (prompt: string, options?: { model?: string; temperature?: number }) =>
    post<CompletionResponse>('/ai/complete', { prompt, ...options }),

  /** 获取可用模型列表 */
  getModels: () =>
    get<ModelInfo[]>('/ai/models'),

  /** 获取 AI 配置 */
  getConfig: () =>
    get<Record<string, unknown>>('/ai/config'),

  /** 生成完整智能洞察 */
  generateInsight: (data: InsightRequest) =>
    post<InsightResponse>('/ai/insight', data),

  /** 趋势摘要 */
  generateTrend: (data: Record<string, unknown>) =>
    post<{ summary: string }>('/ai/insight/trend', data),

  /** 关键发现 */
  generateFindings: (data: Record<string, unknown>) =>
    post<{ findings: KeyFinding[] }>('/ai/insight/findings', data),

  /** 行动建议 */
  generateRecommendations: (data: Record<string, unknown>) =>
    post<{ recommendations: Recommendation[] }>('/ai/insight/recommendations', data),

  /** 异常检测 */
  detectAnomalies: (data: AnomalyDetectionRequest) =>
    post<AnomalyDetectionResponse>('/ai/anomaly/detect', data),

  /** 异常解读 */
  interpretAnomalies: (data: { anomalies: AnomalyResult[]; metric_name: string; context?: string }) =>
    post<AnomalyInterpretation>('/ai/anomaly/interpret', data),

  /** 监控配置 */
  setupMonitor: (data: Record<string, unknown>) =>
    post('/ai/anomaly/monitor', data),
};

/**
 * SSE 流式对话
 * 使用 fetch API 实现流式读取
 */
export async function streamChat(
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  options?: { model?: string; temperature?: number },
): Promise<void> {
  const authStore = useAuthStore.getState();
  const globalStore = useGlobalStore.getState();
  const baseUrl = import.meta.env.VITE_API_URL ?? '/api';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authStore.token) {
    headers['Authorization'] = `Bearer ${authStore.token}`;
  }
  if (globalStore.currentProject) {
    headers['Project-Id'] = String(globalStore.currentProject.id);
  }

  const response = await fetch(`${baseUrl}/ai/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages, stream: true, ...options }),
  });

  if (!response.ok) {
    throw new Error(`AI 对话请求失败: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('无法读取流式响应');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.content) {
            onChunk(data.content);
          }
        } catch {
          // 忽略解析错误
        }
      }
    }
  }
}
