/**
 * MTA 全渠道多触点归因计算引擎 (Multi-Touch Attribution Engine)
 * 支持算法模型：
 * 1. 首次触点 (First Touch) - 100% 权重归因给第一个接触渠道
 * 2. 末次触点 (Last Touch) - 100% 权重归因给最后一个接触渠道
 * 3. 线性平摊 (Linear) - 平均分摊 1/N 权重到路径上所有渠道
 * 4. 时间衰减 (Time Decay) - 越接近转化时间的触点权重越高 (按半衰期 Exponential Decay)
 * 5. W 形模型 (W-Shaped) - 首次触点 (40%) + 转化前末次触点 (40%) + 中间所有触点平摊 (20%)
 */
import type { AttributionModelType, Touchpoint, ChannelROI } from '@alldata/shared';

export interface UserTouchPath {
  userId: string;
  touchpoints: Touchpoint[]; // 按时间正序排列
  conversionValue: number;   // 转化金额/价值
  isConverted: boolean;
}

export function evaluateAttribution(
  paths: UserTouchPath[],
  modelType: AttributionModelType = 'last_touch',
  halfLifeDays = 7,
): Record<string, { conversions: number; revenue: number; cost: number }> {
  const result: Record<string, { conversions: number; revenue: number; cost: number }> = {};

  const ensureChannel = (ch: string) => {
    if (!result[ch]) {
      result[ch] = { conversions: 0, revenue: 0, cost: 0 };
    }
  };

  for (const path of paths) {
    if (!path.touchpoints || path.touchpoints.length === 0) continue;

    // 统计成本
    for (const tp of path.touchpoints) {
      ensureChannel(tp.channel);
      result[tp.channel].cost += tp.cost || 0;
    }

    if (!path.isConverted) continue;

    const n = path.touchpoints.length;
    const value = path.conversionValue || 1;

    switch (modelType) {
      case 'first_touch': {
        const first = path.touchpoints[0];
        ensureChannel(first.channel);
        result[first.channel].conversions += 1;
        result[first.channel].revenue += value;
        break;
      }

      case 'last_touch': {
        const last = path.touchpoints[n - 1];
        ensureChannel(last.channel);
        result[last.channel].conversions += 1;
        result[last.channel].revenue += value;
        break;
      }

      case 'linear': {
        const weight = 1 / n;
        for (const tp of path.touchpoints) {
          ensureChannel(tp.channel);
          result[tp.channel].conversions += weight;
          result[tp.channel].revenue += value * weight;
        }
        break;
      }

      case 'time_decay': {
        const lastTime = new Date(path.touchpoints[n - 1].touch_time).getTime();
        let totalWeight = 0;
        const weights = path.touchpoints.map((tp) => {
          const t = new Date(tp.touch_time).getTime();
          const daysDiff = (lastTime - t) / (1000 * 3600 * 24);
          const w = Math.pow(0.5, daysDiff / halfLifeDays);
          totalWeight += w;
          return w;
        });

        path.touchpoints.forEach((tp, i) => {
          ensureChannel(tp.channel);
          const normWeight = weights[i] / (totalWeight || 1);
          result[tp.channel].conversions += normWeight;
          result[tp.channel].revenue += value * normWeight;
        });
        break;
      }

      case 'w_shaped': {
        if (n === 1) {
          const first = path.touchpoints[0];
          ensureChannel(first.channel);
          result[first.channel].conversions += 1;
          result[first.channel].revenue += value;
        } else if (n === 2) {
          const first = path.touchpoints[0];
          const last = path.touchpoints[1];
          ensureChannel(first.channel);
          ensureChannel(last.channel);
          result[first.channel].conversions += 0.5;
          result[first.channel].revenue += value * 0.5;
          result[last.channel].conversions += 0.5;
          result[last.channel].revenue += value * 0.5;
        } else {
          const first = path.touchpoints[0];
          const last = path.touchpoints[n - 1];
          const middleWeight = 0.2 / (n - 2);

          ensureChannel(first.channel);
          result[first.channel].conversions += 0.4;
          result[first.channel].revenue += value * 0.4;

          ensureChannel(last.channel);
          result[last.channel].conversions += 0.4;
          result[last.channel].revenue += value * 0.4;

          for (let i = 1; i < n - 1; i++) {
            const mid = path.touchpoints[i];
            ensureChannel(mid.channel);
            result[mid.channel].conversions += middleWeight;
            result[mid.channel].revenue += value * middleWeight;
          }
        }
        break;
      }
    }
  }

  return result;
}
