/**
 * 版本日历 API 服务
 */
import { del, get, post, put } from './request';

export interface CalendarItem {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  type: string;
  status: number;
  created_by: number;
  created_at: string;
}

export interface CalendarRoadmapSummary {
  total_events: number;
  upcoming_releases: number;
  active_milestones: number;
  maintenance_windows: number;
}

export const calendarApi = {
  list: (projectId: number, params?: { start_date?: string; end_date?: string; type?: string }) =>
    get<CalendarItem[]>('/calendar', { project_id: projectId, ...params }),

  getRoadmapSummary: (projectId: number) =>
    get<CalendarRoadmapSummary>('/calendar/summary', { project_id: projectId }),

  get: (id: number, projectId: number) =>
    get<CalendarItem>(`/calendar/${id}`, { project_id: projectId }),

  create: (data: {
    project_id: number;
    title: string;
    start_date: string;
    type: string;
    description?: string;
    end_date?: string;
    status?: number;
  }) => post<CalendarItem>(`/calendar?project_id=${data.project_id}`, data),

  update: (id: number, data: Partial<CalendarItem>, projectId: number) =>
    put<CalendarItem>(`/calendar/${id}?project_id=${projectId}`, data),

  delete: (id: number, projectId: number) =>
    del<{ deleted: boolean }>(`/calendar/${id}?project_id=${projectId}`),
};
