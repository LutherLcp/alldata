/**
 * A/B 实验与 Feature Flags 业务服务
 */
import { FastifyInstance } from 'fastify';
import { FeatureFlag, ABExperiment } from '@alldata/shared/types';
import { ABTestEvaluator } from './evaluator';

export class ABTestService {
  private prisma;
  constructor(private app: FastifyInstance) {
    this.prisma = app.prisma;
  }

  async listFlags(projectId: number): Promise<FeatureFlag[]> {
    return [
      {
        id: 1,
        project_id: projectId,
        key: 'enable_new_checkout_ui',
        name: '新版极速收银台页面灰度开关',
        description: '控制 30% 流量进入单页极速支付组件',
        status: 1,
        rollout_percentage: 30,
        created_by: 1,
        created_at: new Date(Date.now() - 432000000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        project_id: projectId,
        key: 'ai_copilot_preview',
        name: 'AI 问答 Copilot 内测功能开关',
        description: '仅针对内部测试用户及特定标签开放',
        status: 1,
        rollout_percentage: 100,
        created_by: 1,
        created_at: new Date(Date.now() - 864000000).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  }

  async listExperiments(projectId: number): Promise<ABExperiment[]> {
    const pVal = ABTestEvaluator.calculatePValue(5000, 450, 5000, 680);
    return [
      {
        id: 1,
        project_id: projectId,
        key: 'exp_homepage_banner_v2',
        name: '首页大促 Banner 文案与视觉样式 A/B 实验',
        hypothesis: '将 Banner 按钮改为红底白字高光样式可提升下单点击率 15%',
        target_metric: 'checkout_click_rate',
        status: 2,
        variants: [
          { name: '对照组 A (Control)', weight: 50, sample_count: 5000, conversion_count: 450, conversion_rate: 9.0, is_winner: false },
          { name: '实验组 B (Red Highlighting)', weight: 50, sample_count: 5000, conversion_count: 680, conversion_rate: 13.6, is_winner: true, p_value: pVal },
        ],
        winning_variant: '实验组 B (Red Highlighting)',
        p_value: pVal,
        created_by: 1,
        created_at: new Date(Date.now() - 604800000).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  }

  async evaluateFlag(key: string, userId: string): Promise<{ enabled: boolean; bucket: number }> {
    const bucket = ABTestEvaluator.hashDiverter(userId, key);
    return { enabled: bucket < 30, bucket };
  }
}
