import { canAccessProject } from '@/common/middleware/projectAccess';
import { ApiError, sendSuccess } from '@/common/utils/response';
import { requireAuth } from '@/plugins/auth';
/**
 * AI 模块 — 路由定义
 * POST /api/ai/chat                — AI 对话（支持流式）
 * POST /api/ai/complete            — AI 文本完成
 * POST /api/ai/models              — 获取可用模型列表
 * GET  /api/ai/config              — 获取当前 AI 配置（脱敏）
 * POST /api/ai/insight             — 生成完整智能洞察
 * POST /api/ai/insight/trend       — 生成趋势摘要
 * POST /api/ai/insight/findings    — 提取关键发现
 * POST /api/ai/insight/recommendations — 生成行动建议
 * POST /api/ai/trends                  — 趋势异常检测
 */
import type { FastifyInstance } from 'fastify';
import { AnomalyDetector } from './anomaly';
import { AVAILABLE_MODELS, getSanitizedConfig } from './config';
import { InsightService } from './insight';
import { promptEngine } from './prompt-engine';
import { RootCauseAnalysisService } from './root-cause';
import { AIService } from './service';
import type {
  AnalysisResult,
  AnomalyDetectionRequest,
  AnomalyInterpretRequest,
  ChatMessage,
  CompletionRequest,
  InsightRequest,
  MonitorConfig,
  TimeSeriesData,
} from './types';

export async function aiRoutes(app: FastifyInstance) {
  const svc = new AIService(app);
  const insightSvc = new InsightService(app);
  const anomalyDetector = new AnomalyDetector(app);
  const rootCauseService = new RootCauseAnalysisService(app);

  // ─── AI 对话（支持流式） ─────────────────────
  app.post('/chat', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as CompletionRequest & { context?: string };
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return ApiError.badRequest(reply, '缺少 messages 参数');
    }

    // 验证消息格式
    for (const msg of body.messages) {
      if (!msg.role || !msg.content) {
        return ApiError.badRequest(reply, '消息必须包含 role 和 content 字段');
      }
    }

    // 构建系统 Prompt
    const messages: ChatMessage[] = [...body.messages];
    const hasSystem = messages.some((m) => m.role === 'system');
    if (!hasSystem) {
      const systemPrompt = promptEngine.render('chat-template', {
        context: body.context ?? '',
      });
      messages.unshift({ role: 'system', content: systemPrompt });
    }

    // 流式响应
    if (body.stream) {
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      await svc.stream(
        { ...body, messages },
        {
          onChunk(chunk: string) {
            reply.raw.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          },
          onEnd(usage) {
            reply.raw.write(`data: ${JSON.stringify({ done: true, usage })}\n\n`);
            reply.raw.end();
          },
          onError(error: Error) {
            reply.raw.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            reply.raw.end();
          },
        },
      );

      return;
    }

    // 非流式响应
    try {
      const result = await svc.complete({ ...body, messages });
      return sendSuccess(reply, result);
    } catch (err) {
      return ApiError.internal(reply, `AI 对话失败: ${(err as Error).message}`);
    }
  });

  // ─── NL2SQL 自然语言转查询 ────────────────────
  app.post('/nl2sql', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as { question: string; project_id: number; context?: string };
    if (!body.question || !body.project_id) {
      return ApiError.badRequest(reply, '缺少 question 或 project_id 参数');
    }

    if (!(await canAccessProject(req, body.project_id))) {
      return ApiError.forbidden(reply, '无权访问该项目');
    }

    try {
      // 1. 获取项目事件与属性 Schema 上下文
      const events = await app.prisma.eventDefinition.findMany({
        where: { project_id: body.project_id },
        include: { properties: true },
        take: 50,
      });

      const schemaText = events
        .map(
          (e: {
            name: string;
            display_name: string | null;
            properties: Array<{ name: string; data_type: string }>;
          }) =>
            `表/事件: ${e.name} (${e.display_name ?? '未命名'})\n` +
            `属性: ${e.properties.map((p: { name: string; data_type: string }) => `${p.name} (${p.data_type})`).join(', ')}`,
        )
        .join('\n\n');

      // 2. 渲染 Prompt
      const prompt = promptEngine.render('nl2sql-template', {
        question: body.question,
        tables_schema:
          schemaText || '默认事件表: events (event_name, user_id, timestamp, properties)',
        context: body.context ?? '',
      });

      // 3. 调用 AI 补全
      const result = await svc.complete({
        messages: [{ role: 'user', content: prompt }],
      });

      // 4. 解析结果并安全检查（只允许 SELECT 语句）
      let parsed: { sql?: string; explanation?: string; tables_used?: string[] } = {};
      try {
        parsed = JSON.parse(result.content);
      } catch {
        parsed = { sql: result.content, explanation: '生成 SQL 查询' };
      }

      const sqlUpper = (parsed.sql ?? '').toUpperCase();
      if (
        sqlUpper.includes('DROP ') ||
        sqlUpper.includes('DELETE ') ||
        sqlUpper.includes('UPDATE ') ||
        sqlUpper.includes('ALTER ') ||
        sqlUpper.includes('TRUNCATE ')
      ) {
        return ApiError.badRequest(reply, '生成的 SQL 包含非法数据修改指令，已被安全拦截');
      }

      return sendSuccess(reply, {
        sql: parsed.sql ?? '',
        explanation: parsed.explanation ?? '',
        tables_used: parsed.tables_used ?? ['events'],
      });
    } catch (err) {
      return ApiError.internal(reply, `NL2SQL 生成失败: ${(err as Error).message}`);
    }
  });

  // ─── AI 文本完成 ──────────────────────────────
  app.post('/complete', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as CompletionRequest;
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return ApiError.badRequest(reply, '缺少 messages 参数');
    }

    try {
      const result = await svc.complete(body);
      return sendSuccess(reply, result);
    } catch (err) {
      return ApiError.internal(reply, `AI 完成请求失败: ${(err as Error).message}`);
    }
  });

  // ─── 获取可用模型列表 ─────────────────────────
  app.post('/models', { preHandler: requireAuth }, async (_req, reply) => {
    return sendSuccess(reply, AVAILABLE_MODELS);
  });

  // ─── 获取当前 AI 配置（脱敏） ─────────────────
  app.get('/config', { preHandler: requireAuth }, async (_req, reply) => {
    const config = svc.getConfig();
    const sanitized = getSanitizedConfig(config);
    return sendSuccess(reply, sanitized);
  });

  // ─── 生成完整智能洞察 ─────────────────────────
  app.post('/insight', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as InsightRequest;
    if (!body.project_id || !body.data_type || !body.data_id) {
      return ApiError.badRequest(reply, '缺少 project_id、data_type 或 data_id 参数');
    }

    if (!(await canAccessProject(req, body.project_id))) {
      return ApiError.forbidden(reply, '无权访问该项目');
    }

    try {
      const result = await insightSvc.generateInsight(body);
      return sendSuccess(reply, result);
    } catch (err) {
      return ApiError.internal(reply, `洞察生成失败: ${(err as Error).message}`);
    }
  });

  // ─── 生成趋势摘要 ───────────────────────────────
  app.post('/insight/trend', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as TimeSeriesData;
    if (
      !body.metric_name ||
      !body.points ||
      !Array.isArray(body.points) ||
      body.points.length === 0
    ) {
      return ApiError.badRequest(reply, '缺少 metric_name 或 points 参数');
    }

    try {
      const summary = await insightSvc.generateTrendSummary(body);
      return sendSuccess(reply, { summary });
    } catch (err) {
      return ApiError.internal(reply, `趋势摘要生成失败: ${(err as Error).message}`);
    }
  });

  // ─── 提取关键发现 ───────────────────────────────
  app.post('/insight/findings', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as AnalysisResult;
    if (!body.type || !body.data) {
      return ApiError.badRequest(reply, '缺少 type 或 data 参数');
    }

    try {
      const findings = await insightSvc.extractKeyFindings(body);
      return sendSuccess(reply, { findings });
    } catch (err) {
      return ApiError.internal(reply, `关键发现提取失败: ${(err as Error).message}`);
    }
  });

  // ─── 生成行动建议 ───────────────────────────────
  app.post('/insight/recommendations', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as AnalysisResult & { context?: string };
    if (!body.type || !body.data) {
      return ApiError.badRequest(reply, '缺少 type 或 data 参数');
    }

    try {
      const recommendations = await insightSvc.generateRecommendations(body, body.context);
      return sendSuccess(reply, { recommendations });
    } catch (err) {
      return ApiError.internal(reply, `行动建议生成失败: ${(err as Error).message}`);
    }
  });

  // ─── 趋势异常检测 ───────────────────────────────
  app.post('/trends', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as TimeSeriesData;
    if (
      !body.metric_name ||
      !body.points ||
      !Array.isArray(body.points) ||
      body.points.length === 0
    ) {
      return ApiError.badRequest(reply, '缺少 metric_name 或 points 参数');
    }

    try {
      const anomalies = await insightSvc.identifyAnomalies(body);
      return sendSuccess(reply, { anomalies });
    } catch (err) {
      return ApiError.internal(reply, `趋势异常检测失败: ${(err as Error).message}`);
    }
  });

  // ─── 异常检测：接收时序数据，返回异常点检测结果 ──
  app.post('/anomaly/detect', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as AnomalyDetectionRequest;
    if (
      !body.project_id ||
      !body.metric_name ||
      !body.data_points ||
      !Array.isArray(body.data_points)
    ) {
      return ApiError.badRequest(reply, '缺少 project_id、metric_name 或 data_points 参数');
    }

    if (!(await canAccessProject(req, body.project_id))) {
      return ApiError.forbidden(reply, '无权访问该项目');
    }
    if (body.data_points.length < 3) {
      return ApiError.badRequest(reply, '数据点数量不足，至少需要 3 个');
    }

    try {
      const result = await anomalyDetector.detect(body);
      return sendSuccess(reply, result);
    } catch (err) {
      return ApiError.internal(reply, `异常检测失败: ${(err as Error).message}`);
    }
  });

  // ─── 异常解读：对已检测到的异常进行 LLM 解读 ──────────
  app.post('/anomaly/interpret', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as AnomalyInterpretRequest;
    if (!body.anomalies || !Array.isArray(body.anomalies) || !body.metric_name) {
      return ApiError.badRequest(reply, '缺少 anomalies 或 metric_name 参数');
    }

    try {
      const result = await anomalyDetector.interpretAnomalies(body);
      return sendSuccess(reply, result);
    } catch (err) {
      return ApiError.internal(reply, `异常解读失败: ${(err as Error).message}`);
    }
  });

  // ─── 监控配置：设置持续监控的指标配置 ──────────────────
  app.post('/anomaly/monitor', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as MonitorConfig;
    if (!body.project_id || !body.metric_name || !body.check_interval || !body.detection_methods) {
      return ApiError.badRequest(
        reply,
        '缺少 project_id、metric_name、check_interval 或 detection_methods 参数',
      );
    }

    if (!(await canAccessProject(req, body.project_id))) {
      return ApiError.forbidden(reply, '无权访问该项目');
    }

    try {
      const result = await anomalyDetector.setupMonitor(body);
      return sendSuccess(reply, result);
    } catch (err) {
      return ApiError.internal(reply, `设置监控失败: ${(err as Error).message}`);
    }
  });

  // ─── 多维指标异常波动自动化根因诊断 ────────────
  app.post('/root-cause', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body as any;
    const projectIdRaw =
      body?.project_id ?? req.headers['project-id'] ?? req.headers['x-project-id'];

    const projectId = Number(projectIdRaw);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return ApiError.badRequest(reply, '缺少或非法的 project_id');
    }

    const hasAccess = await canAccessProject(req, projectId);
    if (!hasAccess) {
      return ApiError.forbidden(reply, '无权访问该项目');
    }

    if (!body?.baseline_period?.start || !body?.current_period?.start) {
      return ApiError.badRequest(reply, '缺少基线周期 baseline_period 或当前周期 current_period');
    }

    const result = await rootCauseService.diagnose(projectId, {
      ...body,
      project_id: projectId,
    });
    return sendSuccess(reply, result);
  });
}
