import type { ABVariant } from '@alldata/shared/types';

export interface EvaluatedExperimentStats {
  variants: ABVariant[];
  winning_variant?: string;
  p_value: number;
  is_significant: boolean;
}

/**
 * A/B 实验一致性 Hash 分流器与 Z-score 显著性检验引擎
 */
export class ABTestEvaluator {
  /** 一致性 Hash 计算用户命中 bucket (0-99) */
  static hashDiverter(userId: string, experimentKey: string): number {
    let hash = 0;
    const str = `${userId}:${experimentKey}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 100;
  }

  /** Z-score 频次假设计算 p-value 显著性 */
  static calculatePValue(n1: number, c1: number, n2: number, c2: number): number {
    const p1 = c1 / (n1 || 1);
    const p2 = c2 / (n2 || 1);
    const pPool = (c1 + c2) / (n1 + n2 || 1);
    const se = Math.sqrt(pPool * (1 - pPool) * (1 / (n1 || 1) + 1 / (n2 || 1)));
    const z = Math.abs(p1 - p2) / (se || 0.0001);

    // 标准正态累积分布近似导出 p-value
    return Number((Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI)).toFixed(4));
  }

  /** 评估实验全组显著性与胜出组判定 */
  static evaluateVariants(variants: ABVariant[]): EvaluatedExperimentStats {
    if (!variants || variants.length === 0) {
      return { variants: [], p_value: 1.0, is_significant: false };
    }

    const evaluated: ABVariant[] = variants.map((v) => {
      const cr =
        v.sample_count > 0 ? Number(((v.conversion_count / v.sample_count) * 100).toFixed(2)) : 0;
      return {
        ...v,
        conversion_rate: cr,
        is_winner: false,
      };
    });

    const control = evaluated[0];
    let minPValue = 1.0;
    let winningVariant: string | undefined;
    let maxLift = 0;

    for (let i = 1; i < evaluated.length; i++) {
      const v = evaluated[i];
      const p = ABTestEvaluator.calculatePValue(
        control.sample_count,
        control.conversion_count,
        v.sample_count,
        v.conversion_count,
      );
      v.p_value = p;
      if (p < minPValue) {
        minPValue = p;
      }

      const lift =
        control.conversion_rate > 0
          ? (v.conversion_rate - control.conversion_rate) / control.conversion_rate
          : 0;

      // 显著性阈值 p < 0.05 且转化率高于对照组
      if (p < 0.05 && lift > 0 && lift > maxLift) {
        maxLift = lift;
        winningVariant = v.name;
      }
    }

    if (winningVariant) {
      for (const v of evaluated) {
        if (v.name === winningVariant) {
          v.is_winner = true;
        }
      }
    }

    return {
      variants: evaluated,
      winning_variant: winningVariant,
      p_value: minPValue,
      is_significant: minPValue < 0.05,
    };
  }
}
