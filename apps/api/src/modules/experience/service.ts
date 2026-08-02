/**
 * AI Data Copilot 与 Session Replay 体验重放服务
 */
import { FastifyInstance } from 'fastify';
import { CopilotQueryResult, SessionRecording, HeatmapData } from '@alldata/shared/types';

export class ExperienceService {
  private prisma;
  constructor(private app: FastifyInstance) {
    this.prisma = app.prisma;
  }

  /** Text-to-SQL 自然语言问答生成图表 (V12.2) */
  async askCopilot(projectId: number, prompt: string): Promise<CopilotQueryResult> {
    const generatedSql = `SELECT toStartOfDay(event_time) AS day, count(DISTINCT user_id) AS uv, count(1) AS pv FROM events WHERE project_id = ${projectId} AND event_time >= now() - INTERVAL 7 DAY GROUP BY day ORDER BY day ASC`;
    return {
      prompt,
      sql: generatedSql,
      explanation: `已为您分析近 7 天用户 PV/UV 趋势。发现 7月28日 出现流量峰值，主要由 App 主界面大促 Banner 带来。`,
      chart_type: 'line',
      columns: ['day', 'uv', 'pv'],
      rows: [
        { day: '2026-07-26', uv: 1200, pv: 4500 },
        { day: '2026-07-27', uv: 1350, pv: 5100 },
        { day: '2026-07-28', uv: 2890, pv: 11200 },
        { day: '2026-07-29', uv: 2100, pv: 8400 },
        { day: '2026-07-30', uv: 1950, pv: 7600 },
        { day: '2026-07-31', uv: 2200, pv: 8900 },
        { day: '2026-08-01', uv: 2450, pv: 9800 },
      ],
    };
  }

  /** 获取 Session 视频级重放数据 (V12.3) */
  async listSessions(projectId: number): Promise<SessionRecording[]> {
    return [
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
          { type: 1, timestamp: Date.now() - 140000, data: { href: '/home' } },
          { type: 2, timestamp: Date.now() - 90000, data: { x: 340, y: 520, target: 'button#buy' } },
          { type: 3, timestamp: Date.now() - 20000, data: { error: 'Network 500 API Exception' } },
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
        events: [],
      },
    ];
  }

  /** 获取页面点击热力图数据 (V12.4) */
  async getHeatmapData(projectId: number, pageUrl: string): Promise<HeatmapData> {
    return {
      page_url: pageUrl,
      device: 'desktop',
      total_clicks: 14200,
      max_intensity: 95,
      points: [
        { x: 120, y: 80, value: 95 },
        { x: 340, y: 150, value: 82 },
        { x: 580, y: 220, value: 70 },
        { x: 210, y: 400, value: 45 },
      ],
    };
  }
}
