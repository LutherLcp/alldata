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
}
