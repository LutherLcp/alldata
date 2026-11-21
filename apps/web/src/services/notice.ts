/**
 * 站内通知 API 服务
 * （原 v4.ts：早期按后端大版本划分的历史分层，已按业务域拆分）
 */
import { get, post } from './request';

export const noticeApi = {
  list: (projectId: number) => get('/notices', { project_id: projectId }),
  unreadCount: (projectId: number) => get('/notices/unread-count', { project_id: projectId }),
  markRead: (ids: number[]) => post('/notices/read', { ids }),
  markAllRead: (projectId: number) => post('/notices/read-all', { project_id: projectId }),
};
