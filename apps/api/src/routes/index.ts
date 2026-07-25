import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { authRoutes } from '@/modules/auth';
import { projectRoutes } from '@/modules/project';
import { dashboardRoutes } from '@/modules/dashboard';
import { analysisRoutes } from '@/modules/analysis';
import { uploadRoutes } from '@/modules/upload';
import { noticeRoutes } from '@/modules/notice';
import { trackingRoutes } from '@/modules/tracking';
import { tagRoutes } from '@/modules/tag';
import { metricRoutes } from '@/modules/metric';
import { warningRoutes } from '@/modules/warning';
import { subscriptionRoutes } from '@/modules/subscription';
import { downloadRoutes } from '@/modules/download';
import { enumRoutes } from '@/modules/enum';

export async function registerRoutes(app: FastifyInstance) {
  // 健康检查
  await app.register(healthRoutes, { prefix: '/api' });

  // 认证模块
  await app.register(authRoutes, { prefix: '/api/auth' });

  // 项目管理
  await app.register(projectRoutes, { prefix: '/api/projects' });

  // ─── V2 模块 ─────────────────────────────
  // 看板管理
  await app.register(dashboardRoutes, { prefix: '/api/dashboards' });

  // 分析引擎
  await app.register(analysisRoutes, { prefix: '/api/analysis' });

  // 文件上传
  await app.register(uploadRoutes, { prefix: '/api/upload' });

  // 站内信
  await app.register(noticeRoutes, { prefix: '/api/notices' });

  // 埋点管理
  await app.register(trackingRoutes, { prefix: '/api/tracking' });

  // 标签管理
  await app.register(tagRoutes, { prefix: '/api/tags' });

  // 指标管理
  await app.register(metricRoutes, { prefix: '/api/metrics' });

  // ─── V4 模块 ─────────────────────────────
  // 预警管理
  await app.register(warningRoutes, { prefix: '/api/warnings' });

  // 推送订阅
  await app.register(subscriptionRoutes, { prefix: '/api/subscriptions' });

  // 下载任务
  await app.register(downloadRoutes, { prefix: '/api/downloads' });

  // 枚举管理
  await app.register(enumRoutes, { prefix: '/api/enums' });
}
