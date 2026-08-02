import { aiRoutes } from '@/modules/ai';
import { analysisRoutes } from '@/modules/analysis';
import { authRoutes } from '@/modules/auth';
import { calendarRoutes } from '@/modules/calendar';
import { cdpRoutes } from '@/modules/cdp/routes';
import { marketingRoutes } from '@/modules/marketing/routes';
import { abtestRoutes } from '@/modules/abtest/routes';
import { experienceRoutes } from '@/modules/experience/routes';
import { mtaRoutes } from '@/modules/mta/routes';
import { securityRoutes } from '@/modules/security/routes';
import { dashboardRoutes } from '@/modules/dashboard';
import { dataAssetRoutes } from '@/modules/data_asset';
import { downloadRoutes } from '@/modules/download';
import { enumRoutes } from '@/modules/enum';
import { financeRoutes } from '@/modules/finance';
import { kocrmRoutes } from '@/modules/kocrm';
import { metricRoutes } from '@/modules/metric';
import { noticeRoutes } from '@/modules/notice';
import { projectRoutes } from '@/modules/project';
import { subscriptionRoutes } from '@/modules/subscription';
import { tagRoutes } from '@/modules/tag';
import { trackingRoutes } from '@/modules/tracking';
import { uploadRoutes } from '@/modules/upload';
import { userRoutes } from '@/modules/user';
import { warningRoutes } from '@/modules/warning';
import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';

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

  // ─── V5 模块 ─────────────────────────────
  // 财务管理
  await app.register(financeRoutes, { prefix: '/api/finance' });

  // KoCRM 管理
  await app.register(kocrmRoutes, { prefix: '/api/kocrm' });

  // ─── V6 模块 ─────────────────────────────
  // 用户查询
  await app.register(userRoutes, { prefix: '/api/users' });

  // 版本日历
  await app.register(calendarRoutes, { prefix: '/api/calendar' });

  // 数据资产
  await app.register(dataAssetRoutes, { prefix: '/api/assets' });

  // ─── V7 模块 ─────────────────────────────
  // AI 智能服务
  await app.register(aiRoutes, { prefix: '/api/ai' });

  // ─── V9 模块 (CDP 与客户旅程) ──────────────
  await app.register(cdpRoutes, { prefix: '/api/cdp' });

  // ─── V10 模块 (营销 Flow) ──────────────────
  await app.register(marketingRoutes, { prefix: '/api/marketing' });

  // ─── V11 模块 (A/B Test 实验平台) ─────────
  await app.register(abtestRoutes, { prefix: '/api/abtest' });

  // ─── V12 模块 (AI Copilot & Session 录屏) ──
  await app.register(experienceRoutes, { prefix: '/api/experience' });

  // ─── V13 模块 (全渠道多触点归因 MTA) ─────
  await app.register(mtaRoutes, { prefix: '/api/mta' });

  // ─── V14 模块 (数据血缘与 GDPR 隐私安全) ──
  await app.register(securityRoutes, { prefix: '/api/security' });
}
