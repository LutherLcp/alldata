/**
 * 枚举字典 API 服务
 * （原 v4.ts：早期按后端大版本划分的历史分层，已按业务域拆分）
 */
import { del, get, post, put } from './request';

export const enumApi = {
  list: (projectId: number) => get('/enums', { project_id: projectId }),
  create: (data: any) => post('/enums', data),
  update: (id: number, data: any) => put(`/enums/${id}`, data),
  delete: (id: number) => del(`/enums/${id}`),
};
