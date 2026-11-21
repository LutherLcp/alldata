import { buildApp } from '@/app';
import { ABTestEvaluator } from '@/modules/abtest/evaluator';
import { ABTestService } from '@/modules/abtest/service';
import type { ABVariant } from '@alldata/shared/types';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

describe('A/B Testing & Feature Flags Experimentation Engine', () => {
  let app: FastifyInstance;

  const mockPrisma = {
    project: {
      findFirst: vi.fn(),
    },
    userProjectRole: {
      findUnique: vi.fn(),
    },
  };

  beforeAll(async () => {
    app = await buildApp({
      prisma: mockPrisma as any,
      fastifyOptions: { logger: false },
      skipMinioInit: true,
      skipRedisInit: true,
      skipAudit: true,
      skipRateLimit: true,
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.userProjectRole.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.project.findFirst.mockResolvedValue({ id: 1, status: 1 });
  });

  describe('ABTestEvaluator (统计显著性检验与一致性分流算法)', () => {
    it('hashDiverter 能够产生确定性分布且值域在 [0, 99]', () => {
      const b1 = ABTestEvaluator.hashDiverter('USR_1001', 'exp_cta_color');
      const b2 = ABTestEvaluator.hashDiverter('USR_1001', 'exp_cta_color');
      expect(b1).toBe(b2);
      expect(b1).toBeGreaterThanOrEqual(0);
      expect(b1).toBeLessThan(100);

      // 不同用户获得不同分流桶
      const b3 = ABTestEvaluator.hashDiverter('USR_2002', 'exp_cta_color');
      expect(typeof b3).toBe('number');
    });

    it('calculatePValue 显著提升样本时计算出 p < 0.05', () => {
      // 对照组 5000人 转化450人 (9%)，实验组 5000人 转化680人 (13.6%)
      const p = ABTestEvaluator.calculatePValue(5000, 450, 5000, 680);
      expect(p).toBeLessThan(0.05);
    });

    it('calculatePValue 微弱差异样本时计算出 p >= 0.05', () => {
      // 对照组 1000人 转化100人 (10%)，实验组 1000人 转化102人 (10.2%)
      const p = ABTestEvaluator.calculatePValue(1000, 100, 1000, 102);
      expect(p).toBeGreaterThanOrEqual(0.05);
    });

    it('evaluateVariants 自动计算组转化率并判定胜出组', () => {
      const variants: ABVariant[] = [
        {
          name: '对照组 A',
          weight: 50,
          sample_count: 5000,
          conversion_count: 400,
          conversion_rate: 8.0,
          is_winner: false,
        },
        {
          name: '实验组 B',
          weight: 50,
          sample_count: 5000,
          conversion_count: 650,
          conversion_rate: 13.0,
          is_winner: false,
        },
      ];

      const report = ABTestEvaluator.evaluateVariants(variants);
      expect(report.is_significant).toBe(true);
      expect(report.winning_variant).toBe('实验组 B');
      expect(report.variants[1].is_winner).toBe(true);
      expect(report.variants[0].is_winner).toBe(false);
    });
  });

  describe('ABTestService (服务层全生命周期管理)', () => {
    it('管理 Feature Flags 创建、更新与灰度命中计算', async () => {
      const svc = new ABTestService(app);

      // 创建
      const flag = await svc.createFlag(
        1,
        {
          key: 'test_dark_mode_beta',
          name: '深色模式 Beta 灰度',
          rollout_percentage: 50,
        },
        1,
      );
      expect(flag.key).toBe('test_dark_mode_beta');
      expect(flag.rollout_percentage).toBe(50);

      // 更新
      const updated = await svc.updateFlag(flag.id, 1, { rollout_percentage: 80 });
      expect(updated?.rollout_percentage).toBe(80);

      // 评估
      const evalRes = await svc.evaluateFlag(1, 'test_dark_mode_beta', 'USR_TEST_1');
      expect(typeof evalRes.enabled).toBe('boolean');
      expect(evalRes.flag?.id).toBe(flag.id);
    });

    it('管理 A/B 实验创建与生成显著性评估报告', async () => {
      const svc = new ABTestService(app);

      const exp = await svc.createExperiment(
        1,
        {
          key: 'exp_checkout_streamline',
          name: '单页收银台支付转化实验',
          target_metric: 'payment_success_rate',
          variants: [
            {
              name: '多步收银 (对照)',
              weight: 50,
              sample_count: 3000,
              conversion_count: 300,
              conversion_rate: 10.0,
              is_winner: false,
            },
            {
              name: '单页极速 (实验)',
              weight: 50,
              sample_count: 3000,
              conversion_count: 450,
              conversion_rate: 15.0,
              is_winner: false,
            },
          ],
        },
        1,
      );

      expect(exp.key).toBe('exp_checkout_streamline');
      expect(exp.winning_variant).toBe('单页极速 (实验)');

      const report = await svc.getExperimentReport(exp.id, 1);
      expect(report?.stats.winning_variant).toBe('单页极速 (实验)');
      expect(report?.stats.is_significant).toBe(true);
    });
  });

  describe('A/B Testing REST API 集成链路', () => {
    const token = () => app.jwt.sign({ userId: '1', tenantId: '1', role: 'admin' });

    it('GET /api/abtest/flags 正常获取项目灰度开关列表', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/abtest/flags',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.code).toBe(200);
      expect(body.data).toBeInstanceOf(Array);
    });

    it('POST /api/abtest/flags/evaluate 评估指定用户的灰度放量', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/abtest/flags/evaluate',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
        payload: {
          key: 'enable_new_checkout_ui',
          user_id: 'USR_8899',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.code).toBe(200);
      expect(typeof body.data.enabled).toBe('boolean');
    });

    it('POST /api/abtest/experiments 缺少必填参数返回 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/abtest/experiments',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
        payload: { name: '缺少 key 和 target_metric' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('GET /api/abtest/experiments 获取实验列表', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/abtest/experiments',
        headers: {
          authorization: `Bearer ${token()}`,
          'project-id': '1',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.code).toBe(200);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.data[0].key).toBeDefined();
    });
  });
});
