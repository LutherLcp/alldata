/**
 * 埋点管理 API 服务
 */
import { get, post, put, del } from './request';

export interface Story {
  id: number; project_id: number; name: string; docs_url: string | null;
  status: number; created_by: number; created_at: string;
  _count?: { events: number };
}

export interface EventDef {
  id: number; project_id: number; story_id: number | null;
  name: string; display_name: string | null; description: string | null;
  status: number; created_at: string;
  story?: { id: number; name: string };
  properties?: EventProperty[];
}

export interface EventProperty {
  id: number; event_id: number; name: string; data_type: string;
  is_required: boolean; description: string | null; sort_order: number;
}

export const trackingApi = {
  listStories: (projectId: number) => get<Story[]>('/tracking/stories', { project_id: projectId }),
  getStory: (id: number) => get<Story>(`/tracking/stories/${id}`),
  createStory: (data: { project_id: number; name: string; docs_url?: string }) =>
    post<Story>('/tracking/stories', data),
  updateStory: (id: number, data: Partial<Story>) => put<Story>(`/tracking/stories/${id}`, data),
  deleteStory: (id: number) => del(`/tracking/stories/${id}`),

  listEvents: (projectId: number, storyId?: number) =>
    get<EventDef[]>('/tracking/events', { project_id: projectId, story_id: storyId }),
  getEvent: (id: number) => get<EventDef>(`/tracking/events/${id}`),
  createEvent: (data: { project_id: number; story_id?: number; name: string; display_name?: string; description?: string }) =>
    post<EventDef>('/tracking/events', data),
  updateEvent: (id: number, data: Partial<EventDef>) => put<EventDef>(`/tracking/events/${id}`, data),
  deleteEvent: (id: number) => del(`/tracking/events/${id}`),

  createProperty: (eventId: number, data: { name: string; data_type: string; is_required?: boolean; description?: string }) =>
    post<EventProperty>(`/tracking/events/${eventId}/properties`, data),
  updateProperty: (id: number, data: Partial<EventProperty>) => put<EventProperty>(`/tracking/properties/${id}`, data),
  deleteProperty: (id: number) => del(`/tracking/properties/${id}`),
};
