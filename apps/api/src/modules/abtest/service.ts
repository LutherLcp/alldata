import type { ABExperiment, ABVariant, FeatureFlag } from '@alldata/shared/types';
/**
 * A/B 实验与 Feature Flags 业务服务
 */
import type { FastifyInstance } from 'fastify';
import { ABTestEvaluator } from './evaluator';

export class ABTestService {
  private prisma;
  private static flagsStore = new Map<number, FeatureFlag[]>();
  private static experimentsStore = new Map<number, ABExperiment[]>();

  constructor(private app: FastifyInstance) {
    this.prisma = app.prisma;
  }

  // ─── Feature Flags ─────────────────────────────────

  async listFlags(projectId: number): Promise<FeatureFlag[]> {
    if (!ABTestService.flagsStore.has(projectId)) {
      ABTestService.flagsStore.set(projectId, [
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
      ]);
    }

    return ABTestService.flagsStore.get(projectId) || [];
  }

  async createFlag(
    projectId: number,
    data: {
      key: string;
      name: string;
      description?: string;
      rollout_percentage?: number;
      status?: 1 | 2;
    },
    userId: number,
  ): Promise<FeatureFlag> {
    const list = await this.listFlags(projectId);
    const existing = list.find((f) => f.key === data.key);
    if (existing) {
      throw new Error(`Feature Flag with key '${data.key}' already exists`);
    }

    const newFlag: FeatureFlag = {
      id: Date.now(),
      project_id: projectId,
      key: data.key,
      name: data.name,
      description: data.description,
      status: data.status ?? 1,
      rollout_percentage: data.rollout_percentage ?? 0,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    list.unshift(newFlag);
    ABTestService.flagsStore.set(projectId, list);
    return newFlag;
  }

  async updateFlag(
    id: number,
    projectId: number,
    data: Partial<Pick<FeatureFlag, 'name' | 'description' | 'status' | 'rollout_percentage'>>,
  ): Promise<FeatureFlag | null> {
    const list = await this.listFlags(projectId);
    const idx = list.findIndex((f) => f.id === id);
    if (idx === -1) return null;

    const updated: FeatureFlag = {
      ...list[idx],
      ...data,
      updated_at: new Date().toISOString(),
    };

    list[idx] = updated;
    ABTestService.flagsStore.set(projectId, list);
    return updated;
  }

  async evaluateFlag(
    projectId: number,
    key: string,
    userId: string,
  ): Promise<{ enabled: boolean; bucket: number; flag?: FeatureFlag }> {
    const list = await this.listFlags(projectId);
    const flag = list.find((f) => f.key === key);

    if (!flag || flag.status !== 1) {
      return { enabled: false, bucket: 0, flag };
    }

    const bucket = ABTestEvaluator.hashDiverter(userId, key);
    const enabled = bucket < flag.rollout_percentage;
    return { enabled, bucket, flag };
  }

  // ─── A/B Experiments ───────────────────────────────

  async listExperiments(projectId: number): Promise<ABExperiment[]> {
    if (!ABTestService.experimentsStore.has(projectId)) {
      const defaultVariants: ABVariant[] = [
        {
          name: '对照组 A (Control)',
          weight: 50,
          sample_count: 5000,
          conversion_count: 450,
          conversion_rate: 9.0,
          is_winner: false,
        },
        {
          name: '实验组 B (Red Highlighting)',
          weight: 50,
          sample_count: 5000,
          conversion_count: 680,
          conversion_rate: 13.6,
          is_winner: true,
        },
      ];

      const evaluated = ABTestEvaluator.evaluateVariants(defaultVariants);

      ABTestService.experimentsStore.set(projectId, [
        {
          id: 1,
          project_id: projectId,
          key: 'exp_homepage_banner_v2',
          name: '首页大促 Banner 文案与视觉样式 A/B 实验',
          hypothesis: '将 Banner 按钮改为红底白字高光样式可提升下单点击率 15%',
          target_metric: 'checkout_click_rate',
          status: 2,
          variants: evaluated.variants,
          winning_variant: evaluated.winning_variant,
          p_value: evaluated.p_value,
          created_by: 1,
          created_at: new Date(Date.now() - 604800000).toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
    }

    return ABTestService.experimentsStore.get(projectId) || [];
  }

  async createExperiment(
    projectId: number,
    data: {
      key: string;
      name: string;
      hypothesis?: string;
      target_metric: string;
      variants?: ABVariant[];
    },
    userId: number,
  ): Promise<ABExperiment> {
    const list = await this.listExperiments(projectId);
    const existing = list.find((e) => e.key === data.key);
    if (existing) {
      throw new Error(`Experiment with key '${data.key}' already exists`);
    }

    const inputVariants: ABVariant[] = data.variants || [
      {
        name: '对照组 (Control)',
        weight: 50,
        sample_count: 1000,
        conversion_count: 100,
        conversion_rate: 10.0,
        is_winner: false,
      },
      {
        name: '实验组 (Variant A)',
        weight: 50,
        sample_count: 1000,
        conversion_count: 135,
        conversion_rate: 13.5,
        is_winner: false,
      },
    ];

    const evaluated = ABTestEvaluator.evaluateVariants(inputVariants);

    const newExperiment: ABExperiment = {
      id: Date.now(),
      project_id: projectId,
      key: data.key,
      name: data.name,
      hypothesis: data.hypothesis,
      target_metric: data.target_metric,
      status: 2,
      variants: evaluated.variants,
      winning_variant: evaluated.winning_variant,
      p_value: evaluated.p_value,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    list.unshift(newExperiment);
    ABTestService.experimentsStore.set(projectId, list);
    return newExperiment;
  }

  async getExperimentReport(id: number, projectId: number) {
    const list = await this.listExperiments(projectId);
    const exp = list.find((e) => e.id === id);
    if (!exp) return null;

    const evaluated = ABTestEvaluator.evaluateVariants(exp.variants);
    return {
      experiment: exp,
      stats: evaluated,
    };
  }
}
