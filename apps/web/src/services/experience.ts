/**
 * AI Data Copilot 与 Session Replay 体验分析 API 服务
 */
import type { CopilotQueryResult, HeatmapData, SessionRecording } from '@alldata/shared/types';
import { get, post } from './request';

export const experienceApi = {
  askCopilot: (prompt: string, projectId: number) =>
    post<CopilotQueryResult>(`/experience/copilot/ask?project_id=${projectId}`, {
      prompt,
    }),

  listSessions: (projectId: number, params?: { has_error?: boolean; user_id?: string }) =>
    get<SessionRecording[]>('/experience/sessions', {
      project_id: projectId,
      ...params,
    }),

  getSession: (sessionId: string, projectId: number) =>
    get<SessionRecording>(`/experience/sessions/${sessionId}`, {
      project_id: projectId,
    }),

  ingestSession: (data: Partial<SessionRecording>, projectId: number) =>
    post<SessionRecording>(`/experience/sessions?project_id=${projectId}`, data),

  getHeatmapData: (pageUrl: string, projectId: number, device = 'desktop') =>
    get<HeatmapData>('/experience/heatmap', {
      project_id: projectId,
      page_url: pageUrl,
      device,
    }),
};
