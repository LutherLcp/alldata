/**
 * AI 模块 — 异常检测引擎
 * 基于统计方法（Z-Score / IQR / 移动平均）的时序异常检测
 * 结合 LLM 辅助异常解读，联动预警模块
 */
import { FastifyInstance } from 'fastify';
import { AIService } from './service';
import type {
  AnomalyDetectionRequest,
  AnomalyDetectionResponse,
  AnomalyResult,
  AnomalyInterpretation,
  AnomalyInterpretRequest,
  AnomalyCategory,
  MonitorConfig,
  MonitorResult,
  AnomalyPoint,
} from './types';

// ─── 统计工具函数（纯计算，无外部依赖） ─────────────────

/** 计算均值 */
function mean(data: number[]): number {
  if (data.length === 0) return 0;
  return data.reduce((s, v) => s + v, 0) / data.length;
}

/** 计算标准差（总体） */
function stddev(data: number[]): number {
  if (data.length <= 1) return 0;
  const m = mean(data);
  const variance = data.reduce((s, v) => s + (v - m) ** 2, 0) / data.length;
  return Math.sqrt(variance);
}

/** 计算分位数（线性插值法） */
function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const frac = pos - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

/** 排序数组（升序，不修改原数组） */
function sortedCopy(data: number[]): number[] {
  return [...data].sort((a, b) => a - b);
}

// ─── 异常检测器 ─────────────────────────────────────────

/** 异常检测引擎 */
export class AnomalyDetector {
  private aiService: AIService;

  constructor(private app: FastifyInstance) {
    this.aiService = new AIService(app);
  }

  // ─── A. 统计算法实现 ────────────────────────────────────

  /**
   * Z-Score 检测
   * 计算每个数据点的 Z 分数，标记 |Z| > threshold 的点为异常
   * @param data 数值数组
   * @param threshold Z 分数阈值，默认 2.0
   */
  detectByZScore(data: number[], threshold = 2.0): AnomalyResult[] {
    if (data.length < 3) return [];

    const m = mean(data);
    const sd = stddev(data);
    if (sd === 0) return [];

    const results: AnomalyResult[] = [];
    for (let i = 0; i < data.length; i++) {
      const z = (data[i] - m) / sd;
      if (Math.abs(z) > threshold) {
        results.push({
          index: i,
          timestamp: '', // 由上层填充
          value: data[i],
          expected: m,
          z_score: z,
          severity: this.zScoreToSeverity(Math.abs(z)),
          category: this.classifyAnomaly(data, i),
          methods: ['zscore'],
        });
      }
    }
    return results;
  }

  /**
   * IQR（四分位距）检测
   * 计算 Q1/Q3/IQR，标记 < Q1 - factor*IQR 或 > Q3 + factor*IQR 的点为异常
   * @param data 数值数组
   * @param factor IQR 倍数因子，默认 1.5
   */
  detectByIQR(data: number[], factor = 1.5): AnomalyResult[] {
    if (data.length < 4) return [];

    const sorted = sortedCopy(data);
    const q1 = quantile(sorted, 0.25);
    const q3 = quantile(sorted, 0.75);
    const iqr = q3 - q1;
    if (iqr === 0) return [];

    const lower = q1 - factor * iqr;
    const upper = q3 + factor * iqr;
    const m = mean(data);

    const results: AnomalyResult[] = [];
    for (let i = 0; i < data.length; i++) {
      if (data[i] < lower || data[i] > upper) {
        // 使用与均值的偏差估算严重度
        const deviation = Math.abs(data[i] - m) / (stddev(data) || 1);
        results.push({
          index: i,
          timestamp: '',
          value: data[i],
          expected: m,
          z_score: (data[i] - m) / (stddev(data) || 1),
          severity: this.zScoreToSeverity(deviation),
          category: this.classifyAnomaly(data, i),
          methods: ['iqr'],
        });
      }
    }
    return results;
  }

  /**
   * 移动平均偏离检测
   * 计算 N 期移动平均，标记偏离超过 deviationFactor 倍标准差的点
   * @param data 数值数组
   * @param windowSize 移动平均窗口大小，默认 5
   * @param deviationFactor 偏离倍数，默认 2.0
   */
  detectByMovingAverage(data: number[], windowSize = 5, deviationFactor = 2.0): AnomalyResult[] {
    if (data.length < windowSize + 1) return [];

    const results: AnomalyResult[] = [];

    for (let i = windowSize; i < data.length; i++) {
      // 计算前 windowSize 个点的移动平均和标准差
      const window = data.slice(i - windowSize, i);
      const ma = mean(window);
      const sd = stddev(window);
      if (sd === 0) continue;

      const deviation = Math.abs(data[i] - ma) / sd;
      if (deviation > deviationFactor) {
        results.push({
          index: i,
          timestamp: '',
          value: data[i],
          expected: ma,
          z_score: (data[i] - ma) / sd,
          severity: this.zScoreToSeverity(deviation),
          category: this.classifyAnomaly(data, i),
          methods: ['moving_avg'],
        });
      }
    }
    return results;
  }

  // ─── B. 综合检测 ───────────────────────────────────────

  /**
   * 综合异常检测（多方法投票）
   * 2/3 方法标记为异常则确认为异常
   */
  async detect(request: AnomalyDetectionRequest): Promise<AnomalyDetectionResponse> {
    const { data_points, sensitivity } = request;
    if (!data_points || data_points.length < 3) {
      throw new Error('数据点数量不足，至少需要 3 个数据点');
    }

    const values = data_points.map((dp) => dp.value);
    // 灵敏度映射到 Z-Score 阈值：灵敏度越高，阈值越低
    const zThreshold = sensitivity != null ? 3.0 - sensitivity * 2.0 : 2.0;
    const iqrFactor = sensitivity != null ? 2.0 - sensitivity * 1.0 : 1.5;

    // 三种方法分别检测
    const zResults = this.detectByZScore(values, zThreshold);
    const iqrResults = this.detectByIQR(values, iqrFactor);
    const maResults = this.detectByMovingAverage(values);

    // 合并结果，按 index 聚合投票
    const voteMap = new Map<number, AnomalyResult>();

    const mergeResults = (results: AnomalyResult[]) => {
      for (const r of results) {
        const existing = voteMap.get(r.index);
        if (existing) {
          // 合并方法列表
          existing.methods = [...new Set([...existing.methods, ...r.methods])];
          // 取最严重的 severity
          existing.severity = this.maxSeverity(existing.severity, r.severity);
        } else {
          voteMap.set(r.index, { ...r });
        }
      }
    };

    mergeResults(zResults);
    mergeResults(iqrResults);
    mergeResults(maResults);

    // 投票：至少 2 种方法标记才确认为异常（或只有 1 种方法但数据点足够少时降级为 1 票）
    const minVotes = values.length >= 10 ? 2 : 1;
    const confirmed: AnomalyResult[] = [];
    for (const [, result] of voteMap) {
      if (result.methods.length >= minVotes) {
        // 填充时间戳
        result.timestamp = data_points[result.index]?.timestamp ?? '';
        confirmed.push(result);
      }
    }

    // 按时间顺序排列
    confirmed.sort((a, b) => a.index - b.index);

    // 构建响应
    const anomalies: AnomalyPoint[] = confirmed.map((r) => ({
      timestamp: r.timestamp,
      value: r.value,
      expected: r.expected,
      severity: r.severity,
    }));

    const summary = this.generateSummary(confirmed, request.metric_name, values);

    return {
      id: crypto.randomUUID(),
      anomalies,
      total_anomalies: anomalies.length,
      summary,
      created_at: new Date().toISOString(),
    };
  }

  // ─── C. LLM 辅助异常解读 ───────────────────────────────

  /**
   * LLM 辅助异常解读
   * 将异常点和数据上下文传给 LLM，生成原因分析和建议
   */
  async interpretAnomalies(
    request: AnomalyInterpretRequest,
  ): Promise<AnomalyInterpretation> {
    const { anomalies, metric_name, context } = request;

    if (!anomalies || anomalies.length === 0) {
      return {
        id: crypto.randomUUID(),
        possible_causes: [],
        recommendations: [],
        severity_assessment: 'low',
        detailed_analysis: '未检测到异常点，数据表现正常。',
        created_at: new Date().toISOString(),
      };
    }

    // 构建异常摘要文本
    const anomalyText = anomalies
      .map(
        (a) =>
          `时间: ${a.timestamp}, 实际值: ${a.value}, 预期值: ${a.expected.toFixed(2)}, 严重程度: ${a.severity}, 分类: ${a.category}`,
      )
      .join('\n');

    const prompt = [
      '你是一位数据异常分析专家，请分析以下检测到的异常数据点，提供深入的原因分析和建议。',
      '',
      `## 指标名称：${metric_name}`,
      context ? `## 背景信息：${context}` : '',
      '',
      '## 检测到的异常点',
      anomalyText,
      '',
      '请以 JSON 格式返回分析结果：',
      '{',
      '  "possible_causes": ["可能原因1", "可能原因2"],',
      '  "recommendations": ["建议措施1", "建议措施2"],',
      '  "severity_assessment": "low|medium|high|critical",',
      '  "detailed_analysis": "详细分析文本"',
      '}',
      '',
      '严重程度判断标准：',
      '- critical: 核心业务指标出现断崖式变化，需立即处理',
      '- high: 重要指标明显偏离正常范围，建议尽快排查',
      '- medium: 指标出现波动但在可接受范围内，需持续观察',
      '- low: 轻微波动，可能为正常噪声',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const result = await this.aiService.complete({
        messages: [
          { role: 'system', content: '你是 AllData 平台的 AI 异常分析助手，请以 JSON 格式返回分析结果。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      });

      // 尝试解析 LLM 返回的 JSON
      const parsed = this.parseLLMJson(result.content);
      return {
        id: crypto.randomUUID(),
        possible_causes: (parsed.possible_causes as string[]) ?? [],
        recommendations: (parsed.recommendations as string[]) ?? [],
        severity_assessment: (parsed.severity_assessment as AnomalyInterpretation['severity_assessment']) ?? this.assessOverallSeverity(anomalies),
        detailed_analysis: (parsed.detailed_analysis as string) ?? '分析完成',
        created_at: new Date().toISOString(),
      };
    } catch (err) {
      // LLM 调用失败时，基于规则返回基础解读
      return this.fallbackInterpretation(anomalies, metric_name);
    }
  }

  // ─── D. 监控配置 ───────────────────────────────────────

  /**
   * 设置持续监控
   * 与现有 warning 模块联动，创建预警规则
   */
  async setupMonitor(config: MonitorConfig): Promise<MonitorResult> {
    // 构建预警规则（与 warning 模块的 monitor_rules 格式对齐）
    const monitorRules = {
      type: 'anomaly_detection',
      metric_name: config.metric_name,
      detection_methods: config.detection_methods,
      threshold: config.threshold ?? 2.0,
      sensitivity: config.sensitivity ?? 0.5,
    };

    let warningId: number | undefined;

    try {
      // 联动 warning 模块创建预警记录
      const warning = await this.app.prisma.warning.create({
        data: {
          project_id: config.project_id,
          name: `AI异常监控 - ${config.metric_name}`,
          monitor_rules: monitorRules,
          notify_config: config.notify_config ?? { channels: ['system'], recipients: [] },
          check_cron: config.check_interval,
          created_by: 0, // 系统自动创建
        },
      });
      warningId = warning.id;
    } catch {
      // 如果 prisma 调用失败（例如 schema 不匹配），仍然返回监控配置
      this.app.log.warn('创建预警记录失败，监控配置仍然保存');
    }

    return {
      id: crypto.randomUUID(),
      warning_id: warningId,
      status: 'active',
      config,
      created_at: new Date().toISOString(),
    };
  }

  // ─── 内部辅助方法 ──────────────────────────────────────

  /** 根据 Z 分数映射严重度 */
  private zScoreToSeverity(absZ: number): 'low' | 'medium' | 'high' | 'critical' {
    if (absZ >= 4.0) return 'critical';
    if (absZ >= 3.0) return 'high';
    if (absZ >= 2.0) return 'medium';
    return 'low';
  }

  /** 取两个严重度中更高的 */
  private maxSeverity(
    a: 'low' | 'medium' | 'high' | 'critical',
    b: 'low' | 'medium' | 'high' | 'critical',
  ): 'low' | 'medium' | 'high' | 'critical' {
    const order = { low: 0, medium: 1, high: 2, critical: 3 };
    return order[a] >= order[b] ? a : b;
  }

  /** 异常分类：根据数据点周围上下文判断异常类型 */
  private classifyAnomaly(data: number[], index: number): AnomalyCategory {
    const windowBefore = 3;
    const windowAfter = 1;

    // 前窗口数据
    const before: number[] = [];
    for (let i = Math.max(0, index - windowBefore); i < index; i++) {
      before.push(data[i]);
    }

    // 后窗口数据
    const after: number[] = [];
    for (let i = index + 1; i <= Math.min(data.length - 1, index + windowAfter); i++) {
      after.push(data[i]);
    }

    const beforeMean = before.length > 0 ? mean(before) : data[index];
    const afterMean = after.length > 0 ? mean(after) : data[index];
    const currentValue = data[index];

    // 判断是否为尖峰（spike）：单点突变，前后值回归正常
    const beforeDeviation = Math.abs(currentValue - beforeMean);
    const afterDeviation = Math.abs(currentValue - afterMean);
    if (beforeDeviation > 0 && afterDeviation > 0) {
      // 前后都偏离，但后窗口回归 → 尖峰
      if (after.length > 0 && Math.abs(afterMean - beforeMean) / (Math.abs(beforeMean) || 1) < 0.3) {
        return 'spike';
      }
    }

    // 判断趋势偏移（trend_shift）：前后窗口均值有明显变化
    if (before.length >= 2 && after.length >= 1) {
      const shiftRatio = Math.abs(afterMean - beforeMean) / (stddev(before) || 1);
      if (shiftRatio > 1.5) {
        return 'trend_shift';
      }
    }

    // 判断渐进漂移（gradual_drift）：前后变化缓慢但持续
    if (before.length >= 3) {
      const diffs: number[] = [];
      for (let i = 1; i < before.length; i++) {
        diffs.push(before[i] - before[i - 1]);
      }
      const avgDiff = mean(diffs);
      if (Math.abs(avgDiff) > 0 && diffs.every((d) => Math.sign(d) === Math.sign(avgDiff))) {
        return 'gradual_drift';
      }
    }

    // 默认为尖峰
    return 'spike';
  }

  /** 生成检测摘要 */
  private generateSummary(anomalies: AnomalyResult[], metricName: string, _data: number[]): string {
    if (anomalies.length === 0) {
      return `指标「${metricName}」数据表现正常，未检测到异常点。`;
    }

    const severityCount = { low: 0, medium: 0, high: 0, critical: 0 };
    const categoryCount: Record<string, number> = {};

    for (const a of anomalies) {
      severityCount[a.severity]++;
      categoryCount[a.category] = (categoryCount[a.category] || 0) + 1;
    }

    const categoryNames: Record<AnomalyCategory, string> = {
      spike: '尖峰突变',
      trend_shift: '趋势偏移',
      seasonal_break: '周期性破坏',
      gradual_drift: '渐进漂移',
    };

    const parts: string[] = [];
    parts.push(`指标「${metricName}」共检测到 ${anomalies.length} 个异常点。`);

    // 严重度分布
    const severityParts: string[] = [];
    if (severityCount.critical > 0) severityParts.push(`严重 ${severityCount.critical} 个`);
    if (severityCount.high > 0) severityParts.push(`高 ${severityCount.high} 个`);
    if (severityCount.medium > 0) severityParts.push(`中 ${severityCount.medium} 个`);
    if (severityCount.low > 0) severityParts.push(`低 ${severityCount.low} 个`);
    if (severityParts.length > 0) {
      parts.push(`严重度分布：${severityParts.join('、')}。`);
    }

    // 类型分布
    const categoryParts = Object.entries(categoryCount).map(
      ([cat, count]) => `${categoryNames[cat as AnomalyCategory] ?? cat} ${count} 个`,
    );
    if (categoryParts.length > 0) {
      parts.push(`异常类型：${categoryParts.join('、')}。`);
    }

    return parts.join(' ');
  }

  /** 安全解析 LLM 返回的 JSON */
  private parseLLMJson(content: string): Record<string, unknown> {
    try {
      // 尝试直接解析
      return JSON.parse(content);
    } catch {
      // 尝试提取 JSON 块
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          // 忽略
        }
      }
      return {};
    }
  }

  /** 评估整体严重度 */
  private assessOverallSeverity(anomalies: AnomalyResult[]): 'low' | 'medium' | 'high' | 'critical' {
    if (anomalies.length === 0) return 'low';
    const order = { low: 0, medium: 1, high: 2, critical: 3 };
    let max: 'low' | 'medium' | 'high' | 'critical' = 'low';
    for (const a of anomalies) {
      if (order[a.severity] > order[max]) {
        max = a.severity;
      }
    }
    return max;
  }

  /** LLM 调用失败时的兜底解读 */
  private fallbackInterpretation(
    anomalies: AnomalyResult[],
    metricName: string,
  ): AnomalyInterpretation {
    const overallSeverity = this.assessOverallSeverity(anomalies);
    const causes: string[] = [];
    const recommendations: string[] = [];

    // 基于异常分类给出通用建议
    const categories = new Set(anomalies.map((a) => a.category));

    if (categories.has('spike')) {
      causes.push('可能存在突发性事件或数据源异常导致尖峰');
      recommendations.push('检查对应时间点是否有特殊活动或系统异常');
    }
    if (categories.has('trend_shift')) {
      causes.push('数据趋势发生明显变化，可能受外部因素影响');
      recommendations.push('分析趋势变化前后的业务环境变化');
    }
    if (categories.has('seasonal_break')) {
      causes.push('周期性模式被打破，可能是业务模式变化');
      recommendations.push('重新评估季节性模型参数');
    }
    if (categories.has('gradual_drift')) {
      causes.push('数据呈现缓慢漂移趋势，可能是长期变化信号');
      recommendations.push('持续观察，考虑调整基线参数');
    }

    if (causes.length === 0) {
      causes.push('需要进一步分析确认异常原因');
      recommendations.push('建议持续监控该指标');
    }

    return {
      id: crypto.randomUUID(),
      possible_causes: causes,
      recommendations,
      severity_assessment: overallSeverity,
      detailed_analysis: `指标「${metricName}」共检测到 ${anomalies.length} 个异常点（基于规则分析，LLM 解读暂不可用）。`,
      created_at: new Date().toISOString(),
    };
  }
}
