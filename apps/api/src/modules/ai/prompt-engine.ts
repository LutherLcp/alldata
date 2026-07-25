/**
 * AI 模块 — Prompt 模板引擎
 * 管理 Prompt 模板，支持变量替换和版本管理
 */
import type { PromptTemplate } from './types';

/** 内置模板定义 */
const BUILT_IN_TEMPLATES: PromptTemplate[] = [
  {
    name: 'insight-template',
    version: '1.0.0',
    description: '智能数据洞察分析模板',
    variables: ['data_summary', 'metric_name', 'time_range', 'context'],
    template: [
      '你是一位资深数据分析师，请基于以下数据提供深度洞察分析。',
      '',
      '## 数据概要',
      '指标名称：{{metric_name}}',
      '时间范围：{{time_range}}',
      '数据摘要：{{data_summary}}',
      '',
      '{{#context}}补充背景：{{context}}{{/context}}',
      '',
      '请输出以下内容：',
      '1. **数据总结**：一段简洁的数据整体描述（100字以内）',
      '2. **关键发现**：3-5条重要的数据洞察，每条用一句话描述',
      '3. **行动建议**：2-3条可执行的业务建议',
      '',
      '请以 JSON 格式返回，结构如下：',
      '{"summary": "...", "key_findings": ["..."], "recommendations": ["..."]}',
    ].join('\n'),
  },
  {
    name: 'nl2sql-template',
    version: '1.0.0',
    description: '自然语言转 SQL 查询模板',
    variables: ['question', 'tables_schema', 'context'],
    template: [
      '你是一位 SQL 专家，请将以下自然语言问题转换为 ClickHouse SQL 查询。',
      '',
      '## 可用表结构',
      '{{tables_schema}}',
      '',
      '## 用户问题',
      '{{question}}',
      '',
      '{{#context}}补充背景：{{context}}{{/context}}',
      '',
      '请输出以下内容：',
      '1. **SQL 语句**：可直接执行的 ClickHouse SQL',
      '2. **语句说明**：简要说明 SQL 逻辑',
      '',
      '请以 JSON 格式返回：',
      '{"sql": "...", "explanation": "...", "tables_used": ["..."]}',
      '',
      '注意：',
      '- 使用 ClickHouse 兼容语法',
      '- 优先使用聚合函数和 GROUP BY',
      '- 日期字段使用 toDate() 或 toDateTime() 函数',
    ].join('\n'),
  },
  {
    name: 'anomaly-template',
    version: '1.0.0',
    description: '异常检测分析模板',
    variables: ['metric_name', 'data_points', 'sensitivity'],
    template: [
      '你是一位数据异常检测专家，请分析以下指标数据中的异常点。',
      '',
      '## 指标信息',
      '指标名称：{{metric_name}}',
      '灵敏度要求：{{sensitivity}}',
      '',
      '## 数据点',
      '{{data_points}}',
      '',
      '请分析并输出：',
      '1. 识别出的异常数据点（包含时间戳、实际值、预期值、严重程度）',
      '2. 异常总结描述',
      '',
      '请以 JSON 格式返回：',
      '{',
      '  "anomalies": [{"timestamp": "...", "value": 0, "expected": 0, "severity": "low|medium|high"}],',
      '  "summary": "..."',
      '}',
      '',
      '严重程度判断标准：',
      '- high: 偏差超过 3 个标准差',
      '- medium: 偏差在 2-3 个标准差之间',
      '- low: 偏差在 1.5-2 个标准差之间',
    ].join('\n'),
  },
  {
    name: 'chat-template',
    version: '1.0.0',
    description: '通用对话模板（数据分析助手）',
    variables: ['context'],
    template: [
      '你是 AllData 全域数据运营平台的 AI 助手，专注于数据分析与运营支持。',
      '',
      '你的能力：',
      '1. 数据指标解读与趋势分析',
      '2. 数据报表和看板问题解答',
      '3. 异常检测与预警分析',
      '4. SQL 查询生成与优化',
      '5. 业务指标建议和最佳实践',
      '',
      '{{#context}}当前上下文：{{context}}{{/context}}',
      '',
      '回答要求：',
      '- 回答简洁专业，聚焦数据分析领域',
      '- 使用中文回复',
      '- 涉及数值时保留合理精度',
      '- 提供 SQL 时使用 ClickHouse 语法',
    ].join('\n'),
  },
];

/** Prompt 模板引擎 */
export class PromptEngine {
  private templates: Map<string, PromptTemplate>;

  constructor() {
    this.templates = new Map();
    // 注册内置模板
    for (const tpl of BUILT_IN_TEMPLATES) {
      this.register(tpl);
    }
  }

  /** 注册模板 */
  register(template: PromptTemplate): void {
    const key = `${template.name}@${template.version}`;
    this.templates.set(key, template);
    // 同时存一份无版本号的别名，指向最新版本
    this.templates.set(template.name, template);
  }

  /** 获取模板 */
  getTemplate(name: string, version?: string): PromptTemplate | null {
    if (version) {
      return this.templates.get(`${name}@${version}`) ?? null;
    }
    return this.templates.get(name) ?? null;
  }

  /** 列出所有模板 */
  listTemplates(): PromptTemplate[] {
    // 只返回带版本号的原始模板，去重
    const seen = new Set<string>();
    const result: PromptTemplate[] = [];
    for (const [key, tpl] of this.templates) {
      if (key.includes('@') && !seen.has(tpl.name)) {
        seen.add(tpl.name);
        result.push(tpl);
      }
    }
    return result;
  }

  /**
   * 渲染模板：将变量替换到模板中
   * 支持 {{variable}} 直接替换和 {{#variable}}...{{/variable}} 条件块
   */
  render(name: string, variables: Record<string, string>, version?: string): string {
    const tpl = this.getTemplate(name, version);
    if (!tpl) {
      throw new Error(`Prompt 模板未找到: ${name}${version ? `@${version}` : ''}`);
    }

    let result = tpl.template;

    // 处理条件块 {{#var}}content{{/var}}
    result = result.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_match, varName, content) => {
      const value = variables[varName];
      if (!value) return '';
      return content.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), value);
    });

    // 处理普通变量替换 {{variable}}
    result = result.replace(/\{\{(\w+)\}\}/g, (_match, varName) => {
      return variables[varName] ?? '';
    });

    return result;
  }
}

/** 全局单例 */
export const promptEngine = new PromptEngine();
