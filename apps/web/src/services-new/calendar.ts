/**
 * 版本日历 API 服务
 */
import { get, post, put, del } from './request';

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

export const calendarApi = {
  list: (projectId: number, params?: { start_date?: string; end_date?: string; type?: string }) =>
    get<CalendarItem[]>('/calendar', { project_id: projectId, ...params }),
  get: (id: number) => get<CalendarItem>(`/calendar/${id}`),
  create: (data: Partial<CalendarItem> & { project_id: number; title: string; start_date: string; type: string }) =>
    post<CalendarItem>('/calendar', data),
  update: (id: number, data: Partial<CalendarItem>) =>
    put<CalendarItem>(`/calendar/${id}`, data),
  delete: (id: number) => del(`/calendar/${id}`),
};
