/**
 * AI 模块 — LLM 配置管理
 * 从环境变量读取配置，提供默认值和验证
 */
import { LLMConfig, LLMProvider, ModelInfo } from './types';

/** 默认 LLM 配置（OpenAI gpt-4o） */
const DEFAULT_CONFIG: LLMConfig = {
  provider: LLMProvider.OPENAI,
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o',
  maxTokens: 4096,
  temperature: 0.7,
  timeout: 30000,
};

/** Provider 对应的默认 baseUrl */
const PROVIDER_BASE_URL: Record<LLMProvider, string> = {
  [LLMProvider.OPENAI]: 'https://api.openai.com/v1',
  [LLMProvider.TONGYI]: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  [LLMProvider.WENXIN]: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop',
  [LLMProvider.CUSTOM]: '',
};

/** 可用模型列表 */
export const AVAILABLE_MODELS: ModelInfo[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: LLMProvider.OPENAI, max_tokens: 128000, description: 'OpenAI 旗舰多模态模型' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: LLMProvider.OPENAI, max_tokens: 128000, description: 'OpenAI 轻量高效模型' },
  { id: 'qwen-turbo', name: '通义千问 Turbo', provider: LLMProvider.TONGYI, max_tokens: 131072, description: '阿里通义千问 Turbo' },
  { id: 'qwen-plus', name: '通义千问 Plus', provider: LLMProvider.TONGYI, max_tokens: 131072, description: '阿里通义千问 Plus' },
  { id: 'ernie-4.0-8k', name: '文心一言 4.0', provider: LLMProvider.WENXIN, max_tokens: 8192, description: '百度文心一言 4.0' },
  { id: 'ernie-3.5-8k', name: '文心一言 3.5', provider: LLMProvider.WENXIN, max_tokens: 8192, description: '百度文心一言 3.5' },
];

/** 解析 Provider 枚举 */
function parseProvider(value: string | undefined): LLMProvider {
  if (!value) return DEFAULT_CONFIG.provider;
  const upper = value.toUpperCase();
  if (Object.values(LLMProvider).includes(upper as LLMProvider)) {
    return upper as LLMProvider;
  }
  return DEFAULT_CONFIG.provider;
}

/** 从环境变量加载 LLM 配置 */
export function loadLLMConfig(): LLMConfig {
  const provider = parseProvider(process.env.LLM_PROVIDER);
  const baseUrl = process.env.LLM_BASE_URL || PROVIDER_BASE_URL[provider] || DEFAULT_CONFIG.baseUrl;

  const config: LLMConfig = {
    provider,
    apiKey: process.env.LLM_API_KEY || DEFAULT_CONFIG.apiKey,
    baseUrl,
    model: process.env.LLM_MODEL || DEFAULT_CONFIG.model,
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS ?? String(DEFAULT_CONFIG.maxTokens), 10),
    temperature: parseFloat(process.env.LLM_TEMPERATURE ?? String(DEFAULT_CONFIG.temperature)),
    timeout: parseInt(process.env.LLM_TIMEOUT ?? String(DEFAULT_CONFIG.timeout), 10),
  };

  return config;
}

/** 验证 LLM 配置是否有效 */
export function validateLLMConfig(config: LLMConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.apiKey) {
    errors.push('LLM_API_KEY 未配置');
  }
  if (!config.baseUrl) {
    errors.push('LLM_BASE_URL 未配置');
  }
  if (!config.model) {
    errors.push('LLM_MODEL 未配置');
  }
  if (config.temperature < 0 || config.temperature > 2) {
    errors.push('LLM_TEMPERATURE 必须在 0-2 之间');
  }
  if (config.maxTokens < 1 || config.maxTokens > 1000000) {
    errors.push('LLM_MAX_TOKENS 超出合理范围');
  }
  if (config.timeout < 1000 || config.timeout > 300000) {
    errors.push('LLM_TIMEOUT 必须在 1s-300s 之间');
  }

  return { valid: errors.length === 0, errors };
}

/** 获取脱敏后的配置（用于 API 返回） */
export function getSanitizedConfig(config: LLMConfig) {
  return {
    provider: config.provider,
    apiKey: config.apiKey ? `****${config.apiKey.slice(-4)}` : '(未配置)',
    baseUrl: config.baseUrl,
    model: config.model,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    timeout: config.timeout,
  };
}
