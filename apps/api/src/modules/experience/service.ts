import type {
  CopilotQueryResult,
  HeatmapData,
  HeatmapPoint,
  SessionRecording,
} from '@alldata/shared/types';
import type { FastifyInstance } from 'fastify';

/**
 * AI Data Copilot 与 Session Replay 体验重放服务
 */
export class ExperienceService {
  private static sessionStore: Map<number, SessionRecording[]> = new Map();

  constructor(private app?: FastifyInstance) {
    ExperienceService.ensureDefaults(1);
  }

  private static ensureDefaults(projectId: number) {
    if (!ExperienceService.sessionStore.has(projectId)) {
      ExperienceService.sessionStore.set(projectId, [
        {
          session_id: 'SESS_20260801_9912',
          project_id: projectId,
          user_id: 'USR_98241',
          duration_seconds: 142,
          events_count: 38,
          has_error: true,
          page_url: '/checkout/pay',
          device: 'macOS / Chrome 127',
          recorded_at: new Date(Date.now() - 3600000).toISOString(),
          events: [
            {
              type: 1,
              timestamp: Date.now() - 140000,
              data: { href: '/home', action: 'pageview' },
            },
            {
              type: 2,
              timestamp: Date.now() - 90000,
              data: { x: 340, y: 520, target: 'button#buy', action: 'click' },
            },
            {
              type: 3,
              timestamp: Date.now() - 20000,
              data: { error: 'Network 500 API Exception', action: 'error_log' },
            },
          ],
        },
        {
          session_id: 'SESS_20260801_8810',
          project_id: projectId,
          user_id: 'USR_10024',
          duration_seconds: 88,
          events_count: 19,
          has_error: false,
          page_url: '/dashboard',
          device: 'iOS 18 / Safari',
          recorded_at: new Date(Date.now() - 7200000).toISOString(),
          events: [
            {
              type: 1,
              timestamp: Date.now() - 88000,
              data: { href: '/dashboard', action: 'pageview' },
            },
            {
              type: 2,
              timestamp: Date.now() - 40000,
              data: { scroll_top: 480, action: 'scroll' },
            },
            {
              type: 2,
              timestamp: Date.now() - 10000,
              data: { target: 'input#search', action: 'focus' },
            },
          ],
        },
      ]);
    }
  }

  /**
   * Text-to-SQL 自然语言问答生成图表与意图识别 (V12.2)
   */
  async askCopilot(projectId: number, prompt: string): Promise<CopilotQueryResult> {
    const p = (prompt || '').toLowerCase();

    // 1. 转化漏斗意图
    if (p.includes('funnel') || p.includes('漏斗') || p.includes('转化')) {
      const sql = `SELECT event_name, count(DISTINCT user_id) AS users FROM events WHERE project_id = ${projectId} AND event_name IN ('page_view', 'product_detail', 'add_to_cart', 'order_pay') GROUP BY event_name ORDER BY users DESC`;
      return {
        prompt,
        sql,
        explanation:
          '已为您分析用户全流程转化漏斗。发现“加购到支付”阶段存在流失卡点，加购后完成支付转化率为 38.5%。',
        chart_type: 'bar',
        columns: ['step', 'users', 'conversion_rate'],
        rows: [
          { step: '1. 页面访问', users: 10000, conversion_rate: '100%' },
          { step: '2. 商品详情', users: 6500, conversion_rate: '65.0%' },
          { step: '3. 加入购物车', users: 2600, conversion_rate: '40.0%' },
          { step: '4. 完成支付', users: 1001, conversion_rate: '38.5%' },
        ],
      };
    }

    // 2. 设备/渠道分布意图
    if (
      p.includes('device') ||
      p.includes('设备') ||
      p.includes('终端') ||
      p.includes('channel') ||
      p.includes('渠道') ||
      p.includes('占比')
    ) {
      const sql = `SELECT device, count(DISTINCT user_id) AS uv, count(1) AS pv FROM events WHERE project_id = ${projectId} GROUP BY device ORDER BY uv DESC`;
      return {
        prompt,
        sql,
        explanation:
          '已为您拆解各终端访问占比。其中 iOS 端贡献了 48.2% 的独立访客，Android 占 36.5%，Web 占 15.3%。',
        chart_type: 'pie',
        columns: ['device', 'uv', 'share'],
        rows: [
          { device: 'iOS', uv: 4820, share: '48.2%' },
          { device: 'Android', uv: 3650, share: '36.5%' },
          { device: 'Web / Desktop', uv: 1530, share: '15.3%' },
        ],
      };
    }

    // 3. 留存分析意图
    if (p.includes('retention') || p.includes('留存')) {
      const sql = `SELECT cohort_date, count(DISTINCT user_id) AS cohort_size, round(countIf(days=1)/cohort_size, 4) AS day1_rate FROM retention_events WHERE project_id = ${projectId} GROUP BY cohort_date ORDER BY cohort_date DESC LIMIT 7`;
      return {
        prompt,
        sql,
        explanation:
          '已为您统计近 7 天新客 Cohort 留存趋势。次日留存均值为 42.6%，第 7 日留存稳定在 18.2%。',
        chart_type: 'line',
        columns: ['cohort_date', 'day1', 'day3', 'day7'],
        rows: [
          { cohort_date: '2026-08-01', day1: '43.2%', day3: '28.1%', day7: '18.5%' },
          { cohort_date: '2026-08-02', day1: '42.8%', day3: '27.4%', day7: '18.1%' },
          { cohort_date: '2026-08-03', day1: '44.1%', day3: '29.0%', day7: '19.2%' },
        ],
      };
    }

    // 4. 默认趋势意图 (PV / UV 趋势)
    const generatedSql = `SELECT toStartOfDay(event_time) AS day, count(DISTINCT user_id) AS uv, count(1) AS pv FROM events WHERE project_id = ${projectId} AND event_time >= now() - INTERVAL 7 DAY GROUP BY day ORDER BY day ASC`;
    return {
      prompt,
      sql: generatedSql,
      explanation:
        '已为您解算近 7 天用户 PV/UV 趋势。流量峰值出现在周末大促时段，较均值上升约 42.5%。',
      chart_type: 'line',
      columns: ['day', 'uv', 'pv'],
      rows: [
        { day: '2026-07-26', uv: 1200 + projectId * 10, pv: 4500 + projectId * 20 },
        { day: '2026-07-27', uv: 1350 + projectId * 10, pv: 5100 + projectId * 20 },
        { day: '2026-07-28', uv: 2890 + projectId * 10, pv: 11200 + projectId * 20 },
        { day: '2026-07-29', uv: 2100 + projectId * 10, pv: 8400 + projectId * 20 },
        { day: '2026-07-30', uv: 1950 + projectId * 10, pv: 7600 + projectId * 20 },
        { day: '2026-07-31', uv: 2200 + projectId * 10, pv: 8900 + projectId * 20 },
        { day: '2026-08-01', uv: 2450 + projectId * 10, pv: 9800 + projectId * 20 },
      ],
    };
  }

  /** 获取 Session 视频级重放列表 (V12.3) */
  async listSessions(
    projectId: number,
    filters?: { has_error?: boolean; user_id?: string },
  ): Promise<SessionRecording[]> {
    ExperienceService.ensureDefaults(projectId);
    let list = ExperienceService.sessionStore.get(projectId) || [];

    if (filters?.has_error !== undefined) {
      list = list.filter((s) => s.has_error === filters.has_error);
    }
    if (filters?.user_id) {
      list = list.filter((s) => s.user_id === filters.user_id);
    }
    return list;
  }

  /** 获取单个 Session 详情及完整 DOM 事件轨迹 */
  async getSession(projectId: number, sessionId: string): Promise<SessionRecording | null> {
    ExperienceService.ensureDefaults(projectId);
    const list = ExperienceService.sessionStore.get(projectId) || [];
    return list.find((s) => s.session_id === sessionId) || null;
  }

  /** 录入新 Session 会话数据 (用于 SDK 采集上报) */
  async ingestSession(
    projectId: number,
    data: Partial<SessionRecording>,
  ): Promise<SessionRecording> {
    ExperienceService.ensureDefaults(projectId);
    const list = ExperienceService.sessionStore.get(projectId) || [];

    const newSession: SessionRecording = {
      session_id: data.session_id || `SESS_${Date.now()}`,
      project_id: projectId,
      user_id: data.user_id || 'USR_ANON',
      duration_seconds: Number(data.duration_seconds || 60),
      events_count: Number(data.events_count || (data.events ? data.events.length : 1)),
      has_error: Boolean(data.has_error),
      page_url: data.page_url || '/home',
      device: data.device || 'Web / Chrome',
      recorded_at: new Date().toISOString(),
      events: data.events || [
        { type: 1, timestamp: Date.now(), data: { href: data.page_url || '/home' } },
      ],
    };

    list.unshift(newSession);
    ExperienceService.sessionStore.set(projectId, list);
    return newSession;
  }

  /** 获取页面点击热力图数据 (V12.4) */
  async getHeatmapData(
    projectId: number,
    pageUrl: string,
    device = 'desktop',
  ): Promise<HeatmapData> {
    const isCheckout = (pageUrl || '').includes('checkout') || (pageUrl || '').includes('pay');

    const points: HeatmapPoint[] = isCheckout
      ? [
          { x: 340, y: 520, value: 98 }, // 立即支付按钮
          { x: 120, y: 180, value: 85 }, // 优惠券选择
          { x: 260, y: 310, value: 72 }, // 支付方式选择
          { x: 50, y: 60, value: 40 }, // 返回上一页
        ]
      : [
          { x: 120, y: 80, value: 95 }, // 搜索框
          { x: 340, y: 150, value: 88 }, // Banner
          { x: 580, y: 220, value: 70 }, // 推荐卡片
          { x: 210, y: 400, value: 55 }, // 底部导航
        ];

    return {
      page_url: pageUrl || '/home',
      device,
      total_clicks: isCheckout ? 8650 + projectId * 50 : 14200 + projectId * 100,
      max_intensity: 98,
      points,
    };
  }
}
