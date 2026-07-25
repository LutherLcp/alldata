/**
 * AI 模块 — 智能分析摘要服务（InsightService）
 * 基于分析结果自动生成文字洞察：趋势识别、异常发现、关键发现、行动建议
 */
import { FastifyInstance } from 'fastify';
import { AIService } from './service';
import { promptEngine } from './prompt-engine';
import type {
  InsightRequest,
  InsightResponse,
  TimeSeriesData,
  AnalysisResult,
  AnomalyPoint,
  KeyFinding,
  Recommendation,
  StatisticalSummary,
} from './types';

// ─── 统计工具函数（自实现，无外部依赖） ─────────────────────────

/** 计算均值 */
function calcMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** 计算中位数 */
function calcMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** 计算标准差 */
function calcStdDev(values: number[], mean: number): number {
  if (values.length <= 1) return 0;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/** 计算分位数（线性插值） */
function calcPercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

/** 计算统计摘要 */
function calcStatisticalSummary(values: number[]): StatisticalSummary {
  if (values.length === 0) {
    return { count: 0, mean: 0, median: 0, std_dev: 0, min: 0, max: 0, change_rate: 0, q1: 0, q3: 0, iqr: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mean = calcMean(values);
  const median = calcMedian(values);
  const std_dev = calcStdDev(values, mean);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const q1 = calcPercentile(sorted, 25);
  const q3 = calcPercentile(sorted, 75);
  const iqr = q3 - q1;

  // 变化率：首尾值对比
  const first = values[0];
  const last = values[values.length - 1];
  const change_rate = first !== 0 ? Math.round(((last - first) / Math.abs(first)) * 10000) / 100 : 0;

  return { count: values.length, mean, median, std_dev, min, max, change_rate, q1, q3, iqr };
}

/** 基于 Z-Score 检测异常点 */
function detectAnomaliesByZScore(
  values: number[],
  dates: string[],
  mean: number,
  stdDev: number,
  threshold = 2.0,
): AnomalyPoint[] {
  if (stdDev === 0) return [];
  const anomalies: AnomalyPoint[] = [];

  for (let i = 0; i < values.length; i++) {
    const zScore = Math.abs((values[i] - mean) / stdDev);
    if (zScore >= threshold) {
      let severity: 'low' | 'medium' | 'high' = 'low';
      if (zScore >= 3.0) severity = 'high';
      else if (zScore >= 2.5) severity = 'medium';

      anomalies.push({
        timestamp: dates[i],
        value: values[i],
        expected: Math.round(mean * 100) / 100,
        severity,
      });
    }
  }

  return anomalies;
}

/** 基于 IQR 检测异常点 */
function detectAnomaliesByIQR(
  values: number[],
  dates: string[],
  q1: number,
  q3: number,
  iqr: number,
  factor = 1.5,
): AnomalyPoint[] {
  const lower = q1 - factor * iqr;
  const upper = q3 + factor * iqr;
  const anomalies: AnomalyPoint[] = [];

  for (let i = 0; i < values.length; i++) {
    if (values[i] < lower || values[i] > upper) {
      const deviation = values[i] > upper ? values[i] - upper : lower - values[i];
      const normalizedDev = iqr > 0 ? deviation / iqr : 0;

      let severity: 'low' | 'medium' | 'high' = 'low';
      if (normalizedDev > 3.0) severity = 'high';
      else if (normalizedDev > 2.0) severity = 'medium';

      anomalies.push({
        timestamp: dates[i],
        value: values[i],
        expected: Math.round(((q1 + q3) / 2) * 100) / 100,
        severity,
      });
    }
  }

  return anomalies;
}

/** 合并去重异常点（取 severity 更高的） */
function mergeAnomalies(a: AnomalyPoint[], b: AnomalyPoint[]): AnomalyPoint[] {
  const severityRank = { low: 1, medium: 2, high: 3, critical: 4 };
  const map = new Map<string, AnomalyPoint>();

  for (const point of [...a, ...b]) {
    const existing = map.get(point.timestamp);
    if (!existing || severityRank[point.severity] > severityRank[existing.severity]) {
      map.set(point.timestamp, point);
    }
  }

  return Array.from(map.values()).sort((x, y) => x.timestamp.localeCompare(y.timestamp));
}

// ─── 分析类型专用数据提取器 ──────────────────────────────────────

/** 从事件分析结果提取时序数据 */
function extractEventTimeSeries(data: Record<string, unknown>): TimeSeriesData | null {
  const series = data['series'] as Array<{ metric: string; alias: string; data: Array<{ date: string; value: number }> }> | undefined;
  if (!series || series.length === 0) return null;
  const first = series[0];
  return {
    metric_name: first.alias || first.metric,
    points: (first.data || []).map((d) => ({ date: d.date, value: d.value })),
    granularity: 'day',
  };
}

/** 从漏斗分析结果提取描述 */
function extractFunnelSummary(data: Record<string, unknown>): string {
  const steps = data['steps'] as Array<{ step: number; event: string; count: number; rate: number }> | undefined;
  const totalConversion = data['total_conversion'] as number | undefined;
  if (!steps || steps.length === 0) return '无漏斗数据';

  const lines = steps.map((s) => `步骤${s.step}（${s.event}）：${s.count} 次，转化率 ${s.rate}%`);
  lines.push(`整体转化率：${totalConversion ?? steps[steps.length - 1].rate}%`);

  // 找出最大流失步骤
  if (steps.length >= 2) {
    let maxDrop = 0;
    let maxDropStep = '';
    for (let i = 1; i < steps.length; i++) {
      const drop = steps[i - 1].count - steps[i].count;
      if (drop > maxDrop) {
        maxDrop = drop;
        maxDropStep = `步骤${i}（${steps[i - 1].event}）→ 步骤${i + 1}（${steps[i].event}）`;
      }
    }
    if (maxDropStep) lines.push(`最大流失环节：${maxDropStep}（流失 ${maxDrop} 次）`);
  }

  return lines.join('\n');
}

/** 从留存分析结果提取描述 */
function extractRetentionSummary(data: Record<string, unknown>): string {
  const matrix = data['matrix'] as Array<{ date: string; base_users: number; retention_rates: number[] }> | undefined;
  if (!matrix || matrix.length === 0) return '无留存数据';

  const lines = matrix.map((row) => {
    const rates = row.retention_rates.slice(0, 4).map((r, i) => `Day${i}:${r}%`).join(' ');
    return `${row.date}（${row.base_users}人）：${rates}`;
  });

  // 找出平均 Day1、Day7 留存
  const day1Rates = matrix.filter((r) => r.retention_rates.length > 1).map((r) => r.retention_rates[1]);
  if (day1Rates.length > 0) {
    const avgDay1 = Math.round(calcMean(day1Rates));
    lines.push(`平均次日留存：${avgDay1}%`);
  }

  return lines.join('\n');
}

/** 从分布分析结果提取描述 */
function extractDistributionSummary(data: Record<string, unknown>): string {
  const buckets = data['buckets'] as string[] | undefined;
  const values = data['values'] as number[] | undefined;
  const total = data['total'] as number | undefined;
  if (!buckets || !values || buckets.length === 0) return '无分布数据';

  const lines: string[] = [];
  const maxIdx = values.indexOf(Math.max(...values));
  const minIdx = values.indexOf(Math.min(...values));
  lines.push(`总样本数：${total ?? values.reduce((a, b) => a + b, 0)}`);
  lines.push(`最高频区间：${buckets[maxIdx]}（${values[maxIdx]} 次）`);
  lines.push(`最低频区间：${buckets[minIdx]}（${values[minIdx]} 次）`);

  // 简单偏度判断
  const mid = Math.floor(buckets.length / 2);
  const leftSum = values.slice(0, mid).reduce((a, b) => a + b, 0);
  const rightSum = values.slice(mid).reduce((a, b) => a + b, 0);
  if (leftSum > rightSum * 1.3) lines.push('分布形态：左偏（低值集中）');
  else if (rightSum > leftSum * 1.3) lines.push('分布形态：右偏（高值集中）');
  else lines.push('分布形态：近似对称');

  return lines.join('\n');
}

// ─── InsightService ─────────────────────────────────────────────

/** 智能分析摘要服务 */
export class InsightService {
  private ai: AIService;

  constructor(private app: FastifyInstance) {
    this.ai = new AIService(app);
  }

  /**
   * 根据分析结果生成完整洞察（总结 + 发现 + 异常 + 建议）
   */
  async generateInsight(request: InsightRequest): Promise<InsightResponse> {
    const { data_type, data_id, context } = request;

    // 构建数据摘要文本（由请求方在 context 中携带分析数据摘要）
    const dataSummary = context || `数据类型：${data_type}，数据 ID：${data_id}`;

    // 使用 PromptEngine 渲染 insight 模板
    const systemPrompt = promptEngine.render('insight-template', {
      data_summary: dataSummary,
      metric_name: data_type,
      time_range: `数据 ID ${data_id}`,
      context: context ?? '',
    });

    try {
      const completion = await this.ai.complete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: '请基于上述数据生成完整的洞察分析报告，以 JSON 格式返回。' },
        ],
        temperature: 0.4,
      });

      // 尝试解析 LLM 返回的 JSON
      const parsed = this.parseLLMJson(completion.content);

      return {
        id: completion.id,
        summary: parsed.summary ?? '数据洞察分析完成',
        key_findings: parsed.key_findings ?? [],
        recommendations: parsed.recommendations ?? [],
        confidence: this.calcConfidence(dataSummary),
        created_at: new Date().toISOString(),
      };
    } catch (err) {
      this.app.log.error(`洞察生成失败: ${(err as Error).message}`);
      // LLM 失败时降级返回基础统计
      return {
        id: crypto.randomUUID(),
        summary: `数据摘要：${dataSummary.slice(0, 200)}`,
        key_findings: ['数据量有限，暂无显著发现'],
        recommendations: ['建议积累更多数据后再次分析'],
        confidence: 0.5,
        created_at: new Date().toISOString(),
      };
    }
  }

  /**
   * 生成趋势分析摘要
   */
  async generateTrendSummary(data: TimeSeriesData): Promise<string> {
    const values = data.points.map((p) => p.value);
    const stats = calcStatisticalSummary(values);

    // 构建趋势描述
    let trendDesc = '';
    if (stats.change_rate > 10) trendDesc = '整体呈明显上升趋势';
    else if (stats.change_rate > 3) trendDesc = '整体呈温和上升趋势';
    else if (stats.change_rate < -10) trendDesc = '整体呈明显下降趋势';
    else if (stats.change_rate < -3) trendDesc = '整体呈温和下降趋势';
    else trendDesc = '整体保持平稳';

    const summaryLines = [
      `指标「${data.metric_name}」趋势分析（${data.points.length} 个数据点）：`,
      `- 趋势判断：${trendDesc}（变化率 ${stats.change_rate}%）`,
      `- 均值：${stats.mean.toFixed(2)}，中位数：${stats.median.toFixed(2)}`,
      `- 最大值：${stats.max}，最小值：${stats.min}`,
      `- 标准差：${stats.std_dev.toFixed(2)}（波动${stats.std_dev / stats.mean > 0.3 ? '较大' : '适中'}）`,
    ];

    // 调用 LLM 生成更自然的描述
    try {
      const completion = await this.ai.complete({
        messages: [
          {
            role: 'system',
            content: '你是一位资深数据分析师，请用简洁专业的中文描述以下指标的趋势特征。',
          },
          {
            role: 'user',
            content: [
              `指标名称：${data.metric_name}`,
              `统计摘要：均值=${stats.mean.toFixed(2)}，中位数=${stats.median.toFixed(2)}，标准差=${stats.std_dev.toFixed(2)}，最小=${stats.min}，最大=${stats.max}，变化率=${stats.change_rate}%`,
              '请输出一段 100 字以内的趋势分析描述。',
            ].join('\n'),
          },
        ],
        temperature: 0.3,
        maxTokens: 300,
      });
      return completion.content;
    } catch {
      // 降级返回统计摘要
      return summaryLines.join('\n');
    }
  }

  /**
   * 识别数据中的异常点（结合 Z-Score 和 IQR 两种方法）
   */
  async identifyAnomalies(data: TimeSeriesData): Promise<AnomalyPoint[]> {
    const values = data.points.map((p) => p.value);
    const dates = data.points.map((p) => p.date);

    if (values.length < 3) return [];

    const stats = calcStatisticalSummary(values);

    // Z-Score 方法（阈值 2.0）
    const zAnomalies = detectAnomaliesByZScore(values, dates, stats.mean, stats.std_dev, 2.0);

    // IQR 方法（系数 1.5）
    const iqrAnomalies = detectAnomaliesByIQR(values, dates, stats.q1, stats.q3, stats.iqr, 1.5);

    // 合并去重
    return mergeAnomalies(zAnomalies, iqrAnomalies);
  }

  /**
   * 从分析结果中提取 Top 3-5 个关键发现
   */
  async extractKeyFindings(data: AnalysisResult): Promise<KeyFinding[]> {
    const dataSummary = this.buildAnalysisSummary(data);

    try {
      const completion = await this.ai.complete({
        messages: [
          {
            role: 'system',
            content: [
              '你是一位资深数据分析师，请从分析数据中提取 3-5 个最重要的关键发现。',
              `分析类型：${data.type}`,
              '',
              '请以 JSON 数组格式返回，每项包含：',
              '{"title": "发现标题", "description": "发现描述", "importance": "high|medium|low"}',
            ].join('\n'),
          },
          { role: 'user', content: dataSummary },
        ],
        temperature: 0.3,
      });

      const parsed = this.parseLLMJson(completion.content);
      const findings: KeyFinding[] = Array.isArray(parsed) ? parsed : (parsed.findings ?? []);
      return findings.slice(0, 5).map((f: Partial<KeyFinding>) => ({
        title: f.title ?? '未知发现',
        description: f.description ?? '',
        importance: f.importance ?? 'medium',
        metric_value: f.metric_value,
      }));
    } catch {
      // 降级：基于统计生成基础发现
      return this.buildFallbackFindings(data);
    }
  }

  /**
   * 基于数据洞察生成可执行的行动建议
   */
  async generateRecommendations(data: AnalysisResult, context?: string): Promise<Recommendation[]> {
    const dataSummary = this.buildAnalysisSummary(data);

    try {
      const completion = await this.ai.complete({
        messages: [
          {
            role: 'system',
            content: [
              '你是一位资深数据分析师，请基于数据分析结果提供 2-3 条可执行的行动建议。',
              `分析类型：${data.type}`,
              context ? `业务背景：${context}` : '',
              '',
              '请以 JSON 数组格式返回，每项包含：',
              '{"title": "建议标题", "description": "建议描述", "priority": "high|medium|low", "expected_impact": "预期效果"}',
            ].join('\n'),
          },
          { role: 'user', content: dataSummary },
        ],
        temperature: 0.4,
      });

      const parsed = this.parseLLMJson(completion.content);
      const recs: Recommendation[] = Array.isArray(parsed) ? parsed : (parsed.recommendations ?? []);
      return recs.slice(0, 3).map((r: Partial<Recommendation>) => ({
        title: r.title ?? '未知建议',
        description: r.description ?? '',
        priority: r.priority ?? 'medium',
        expected_impact: r.expected_impact,
      }));
    } catch {
      return this.buildFallbackRecommendations(data);
    }
  }

  // ─── 内部方法 ─────────────────────────────────────────────────

  /** 将分析结果转为文本摘要（供 LLM 阅读） */
  private buildAnalysisSummary(data: AnalysisResult): string {
    const lines: string[] = [`分析类型：${data.type}`];

    if (data.time_range) {
      lines.push(`时间范围：${data.time_range.start} ~ ${data.time_range.end}`);
    }

    switch (data.type) {
      case 'event': {
        const ts = extractEventTimeSeries(data.data);
        if (ts) {
          const values = ts.points.map((p) => p.value);
          const stats = calcStatisticalSummary(values);
          lines.push(
            `指标：${ts.metric_name}`,
            `数据点数：${values.length}`,
            `均值：${stats.mean.toFixed(2)}，标准差：${stats.std_dev.toFixed(2)}`,
            `最大值：${stats.max}，最小值：${stats.min}，变化率：${stats.change_rate}%`,
          );
        }
        break;
      }
      case 'funnel':
        lines.push(extractFunnelSummary(data.data));
        break;
      case 'retention':
        lines.push(extractRetentionSummary(data.data));
        break;
      case 'distribution':
        lines.push(extractDistributionSummary(data.data));
        break;
      default:
        lines.push(JSON.stringify(data.data).slice(0, 500));
    }

    return lines.join('\n');
  }

  /** 解析 LLM 返回的 JSON（兼容 Markdown 代码块） */
  private parseLLMJson(content: string): any {
    // 去除可能的 Markdown 代码块标记
    const cleaned = content
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      // 尝试提取 JSON 片段
      const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          return {};
        }
      }
      return {};
    }
  }

  /** 根据数据量估算置信度（0-1） */
  private calcConfidence(dataSummary: string): number {
    const len = dataSummary.length;
    if (len > 500) return 0.92;
    if (len > 200) return 0.85;
    if (len > 100) return 0.75;
    return 0.6;
  }

  /** LLM 失败时的降级关键发现 */
  private buildFallbackFindings(data: AnalysisResult): KeyFinding[] {
    const findings: KeyFinding[] = [];

    if (data.type === 'event') {
      const ts = extractEventTimeSeries(data.data);
      if (ts) {
        const stats = calcStatisticalSummary(ts.points.map((p) => p.value));
        if (Math.abs(stats.change_rate) > 10) {
          findings.push({
            title: stats.change_rate > 0 ? '指标呈显著上升趋势' : '指标呈显著下降趋势',
            description: `变化率 ${stats.change_rate}%，需关注变化原因`,
            importance: 'high',
            metric_value: stats.change_rate,
          });
        }
        if (stats.std_dev / stats.mean > 0.3) {
          findings.push({
            title: '数据波动较大',
            description: `变异系数 ${(stats.std_dev / stats.mean).toFixed(2)}，建议排查异常时段`,
            importance: 'medium',
            metric_value: stats.std_dev,
          });
        }
      }
    } else if (data.type === 'funnel') {
      const steps = data.data['steps'] as Array<{ count: number; rate: number }> | undefined;
      if (steps && steps.length >= 2) {
        const lastRate = steps[steps.length - 1].rate;
        findings.push({
          title: '整体转化率偏低',
          description: `最终转化率仅 ${lastRate}%，建议优化转化路径`,
          importance: lastRate < 20 ? 'high' : 'medium',
          metric_value: lastRate,
        });
      }
    }

    if (findings.length === 0) {
      findings.push({
        title: '数据暂无显著发现',
        description: '建议积累更多数据后再次分析',
        importance: 'low',
      });
    }

    return findings;
  }

  /** LLM 失败时的降级行动建议 */
  private buildFallbackRecommendations(data: AnalysisResult): Recommendation[] {
    const recs: Recommendation[] = [];

    if (data.type === 'funnel') {
      recs.push({
        title: '优化漏斗转化路径',
        description: '建议对流失最严重的步骤进行专项分析，找出用户流失原因并优化体验',
        priority: 'high',
        expected_impact: '提升整体转化率 10-20%',
      });
    } else if (data.type === 'retention') {
      recs.push({
        title: '提升用户次日留存',
        description: '建议优化新用户首日体验，增加用户激活引导流程',
        priority: 'high',
        expected_impact: '提升次日留存 5-10%',
      });
    } else {
      recs.push({
        title: '持续监控数据趋势',
        description: '建议设置定期数据监控，关注异常波动并及时响应',
        priority: 'medium',
        expected_impact: '降低数据风险',
      });
    }

    return recs;
  }
}
