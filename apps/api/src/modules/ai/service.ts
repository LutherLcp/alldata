/**
 * AI 模块 — 统一 LLM 调用层（核心）
 * 支持多 Provider 切换，流式响应，错误重试，用量统计
 */
import { FastifyInstance } from 'fastify';
import { loadLLMConfig, validateLLMConfig } from './config';
import type {
  ChatMessage,
  CompletionRequest,
  CompletionResponse,
  LLMConfig,
  StreamCallback,
  TokenUsage,
} from './types';
import { LLMProvider } from './types';

/** 最大重试次数 */
const MAX_RETRIES = 3;
/** 重试基础延迟（毫秒） */
const RETRY_BASE_DELAY = 1000;

/** LLM HTTP 请求体（OpenAI 兼容格式） */
interface OpenAIRequestBody {
  model: string;
  messages: ChatMessage[];
  max_tokens: number;
  temperature: number;
  stream: boolean;
}

/** LLM 调用统计 */
interface UsageStats {
  total_requests: number;
  total_tokens: number;
  total_errors: number;
  avg_latency_ms: number;
}

/** 统一 LLM 调用服务 */
export class AIService {
  private config: LLMConfig;
  private stats: UsageStats = {
    total_requests: 0,
    total_tokens: 0,
    total_errors: 0,
    avg_latency_ms: 0,
  };
  private latencySum = 0;

  constructor(private app: FastifyInstance) {
    this.config = loadLLMConfig();
  }

  /** 获取当前配置 */
  getConfig(): LLMConfig {
    return this.config;
  }

  /** 更新配置（运行时切换 Provider） */
  updateConfig(partial: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  /** 获取调用统计 */
  getStats(): UsageStats {
    return { ...this.stats };
  }

  /** 普通完成（非流式） */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();
    const messages = request.messages;
    const model = request.model ?? this.config.model;
    const maxTokens = request.maxTokens ?? this.config.maxTokens;
    const temperature = request.temperature ?? this.config.temperature;

    const body: OpenAIRequestBody = {
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: false,
    };

    const result = await this.callWithRetry(body);
    const elapsed = Date.now() - startTime;
    this.recordUsage(result.usage, elapsed);

    return result;
  }

  /** 流式响应 — 通过回调方式 */
  async stream(request: CompletionRequest, callback: StreamCallback): Promise<void> {
    const startTime = Date.now();
    const model = request.model ?? this.config.model;
    const maxTokens = request.maxTokens ?? this.config.maxTokens;
    const temperature = request.temperature ?? this.config.temperature;

    // 检查配置是否有效，无效则返回 mock 响应
    const validation = validateLLMConfig(this.config);
    if (!validation.valid) {
      const mockContent =
        '[Mock] AI 服务当前为演示模式，请配置 LLM_API_KEY 环境变量以启用真实 AI 能力。';
      callback.onChunk(mockContent);
      callback.onEnd({ prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 });
      return;
    }

    const body: OpenAIRequestBody = {
      model,
      messages: request.messages,
      max_tokens: maxTokens,
      temperature,
      stream: true,
    };

    try {
      const response = await this.fetchLLM(body);
      if (!response.body) {
        throw new Error('LLM 响应体为空');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let usage: TokenUsage | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n').filter((l) => l.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              callback.onChunk(delta);
            }
            // 最后一个 chunk 可能带 usage
            if (parsed.usage) {
              usage = {
                prompt_tokens: parsed.usage.prompt_tokens ?? 0,
                completion_tokens: parsed.usage.completion_tokens ?? 0,
                total_tokens: parsed.usage.total_tokens ?? 0,
              };
            }
          } catch {
            // 跳过无法解析的行
          }
        }
      }

      const elapsed = Date.now() - startTime;
      this.recordUsage(
        usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        elapsed
      );
      callback.onEnd(usage);
    } catch (err) {
      this.stats.total_errors++;
      // 返回 mock 响应而不是错误
      const mockContent = '[Mock] AI 服务调用失败，当前为演示模式。';
      callback.onChunk(mockContent);
      callback.onEnd({ prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 });
    }
  }

  /** 流式响应 — AsyncGenerator 方式 */
  async *streamGenerator(
    request: CompletionRequest
  ): AsyncGenerator<string, TokenUsage | undefined> {
    const startTime = Date.now();
    const model = request.model ?? this.config.model;
    const maxTokens = request.maxTokens ?? this.config.maxTokens;
    const temperature = request.temperature ?? this.config.temperature;

    const body: OpenAIRequestBody = {
      model,
      messages: request.messages,
      max_tokens: maxTokens,
      temperature,
      stream: true,
    };

    const response = await this.fetchLLM(body);
    if (!response.body) {
      throw new Error('LLM 响应体为空');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let usage: TokenUsage | undefined;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n').filter((l) => l.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              yield delta;
            }
            if (parsed.usage) {
              usage = {
                prompt_tokens: parsed.usage.prompt_tokens ?? 0,
                completion_tokens: parsed.usage.completion_tokens ?? 0,
                total_tokens: parsed.usage.total_tokens ?? 0,
              };
            }
          } catch {
            // 跳过无法解析的行
          }
        }
      }
    } finally {
      const elapsed = Date.now() - startTime;
      this.recordUsage(
        usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        elapsed
      );
    }

    return usage;
  }

  // ─── 内部方法 ──────────────────────────────────────────

  /** 带重试的 LLM 调用 */
  private async callWithRetry(body: OpenAIRequestBody): Promise<CompletionResponse> {
    // 检查配置是否有效，无效则返回 mock 响应
    const validation = validateLLMConfig(this.config);
    if (!validation.valid) {
      return this.mockResponse(body);
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await this.fetchLLM(body);
        const text = await response.text();
        const data = JSON.parse(text);

        const choice = data.choices?.[0];
        if (!choice) {
          throw new Error('LLM 返回空结果');
        }

        return {
          id: data.id ?? crypto.randomUUID(),
          content: choice.message?.content ?? '',
          model: data.model ?? body.model,
          usage: {
            prompt_tokens: data.usage?.prompt_tokens ?? 0,
            completion_tokens: data.usage?.completion_tokens ?? 0,
            total_tokens: data.usage?.total_tokens ?? 0,
          },
          finish_reason: choice.finish_reason ?? 'stop',
          created_at: new Date().toISOString(),
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.app.log.warn(`LLM 调用失败 (第 ${attempt + 1} 次): ${lastError.message}`);

        if (attempt < MAX_RETRIES - 1) {
          // 指数退避
          const delay = RETRY_BASE_DELAY * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // 重试全部失败，返回 mock 响应
    return this.mockResponse(body);
  }

  /** Mock 响应 — 当 LLM 不可用时使用 */
  private mockResponse(body: OpenAIRequestBody): CompletionResponse {
    const userMsg = body.messages.filter((m) => m.role === 'user').pop()?.content ?? '';
    return {
      id: crypto.randomUUID(),
      content: `[Mock] 收到您的消息："${userMsg.slice(0, 50)}"。AI 服务当前为演示模式，请配置 LLM_API_KEY 环境变量以启用真实 AI 能力。`,
      model: body.model,
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
      finish_reason: 'stop',
      created_at: new Date().toISOString(),
    };
  }

  /** 底层 HTTP 请求 — 根据 Provider 构建请求 */
  private async fetchLLM(body: OpenAIRequestBody): Promise<Response> {
    const validation = validateLLMConfig(this.config);
    if (!validation.valid) {
      throw new Error(`LLM 配置无效: ${validation.errors.join(', ')}`);
    }

    const { url, headers, requestBody } = this.buildRequest(body);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '未知错误');
        throw new Error(`LLM API 错误 ${response.status}: ${errorText}`);
      }

      return response;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error(`LLM 请求超时 (${this.config.timeout}ms)`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /** 根据 Provider 构建具体请求参数 */
  private buildRequest(body: OpenAIRequestBody): {
    url: string;
    headers: Record<string, string>;
    requestBody: Record<string, unknown>;
  } {
    const baseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    switch (this.config.provider) {
      case LLMProvider.OPENAI:
      case LLMProvider.CUSTOM:
        return {
          url: `${this.config.baseUrl}/chat/completions`,
          headers: { ...baseHeaders, Authorization: `Bearer ${this.config.apiKey}` },
          requestBody: body as unknown as Record<string, unknown>,
        };

      case LLMProvider.TONGYI:
        // 通义千问兼容 OpenAI 格式
        return {
          url: `${this.config.baseUrl}/chat/completions`,
          headers: { ...baseHeaders, Authorization: `Bearer ${this.config.apiKey}` },
          requestBody: body as unknown as Record<string, unknown>,
        };

      case LLMProvider.WENXIN:
        // 文心一言使用 access_token 方式
        return {
          url: `${this.config.baseUrl}/chat/completions?access_token=${this.config.apiKey}`,
          headers: baseHeaders,
          requestBody: body as unknown as Record<string, unknown>,
        };

      default:
        return {
          url: `${this.config.baseUrl}/chat/completions`,
          headers: { ...baseHeaders, Authorization: `Bearer ${this.config.apiKey}` },
          requestBody: body as unknown as Record<string, unknown>,
        };
    }
  }

  /** 记录用量统计 */
  private recordUsage(usage: TokenUsage, elapsedMs: number): void {
    this.stats.total_requests++;
    this.stats.total_tokens += usage.total_tokens;
    this.latencySum += elapsedMs;
    this.stats.avg_latency_ms = Math.round(this.latencySum / this.stats.total_requests);
  }
}
