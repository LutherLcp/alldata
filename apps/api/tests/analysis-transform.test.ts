/**
 * 分析服务结果转换 — ClickHouse 行 → 前端契约
 *
 * chQuery 与 getRedisClient 都被 mock，测试走完整的 runAnalysis 路径
 * （含查询构建、缓存读写），但不触碰数据库/网络。
 *
 * 断言只针对「语义」：漏斗按 windowFunnel 语义累积、留存缺失天补 0、
 * 路径同名节点复用、归因占比等。
 */
import { chQuery } from '@/common/utils/clickhouse';
import type { AnalysisInput } from '@/modules/analysis/query-builder';
import { AnalysisService } from '@/modules/analysis/service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/common/utils/clickhouse', () => ({ chQuery: vi.fn() }));
vi.mock('@/common/utils/redis', () => ({
  getRedisClient: () => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
  }),
}));

// ─── 前端契约的（子集）类型，便于对结果做语义断言 ──────────────
interface FunnelStep {
  step: number;
  event: string;
  count: number;
  rate: number;
}
interface FunnelResult {
  query_id: string;
  type: string;
  steps: FunnelStep[];
  total_conversion: number;
  elapsed_ms: number;
}
interface RetentionResult {
  type: string;
  matrix: Array<{ date: string; base_users: number; retention_rates: number[] }>;
}
interface DistributionResult {
  type: string;
  buckets: string[];
  values: number[];
  total: number;
}
interface PathNode {
  id: string;
  name: string;
}
interface PathResult {
  type: string;
  nodes: PathNode[];
  links: Array<{ source: string; target: string; value: number }>;
}
interface AttributionResult {
  type: string;
  attributes: Array<{ channel: string; conversions: number; users: number; contribution: number }>;
}
interface EventResult {
  type: string;
  columns: string[];
  rows: number;
  series: Array<{ metric: string; alias: string; data: Array<Record<string, unknown>> }>;
}

const baseTimeRange = {
  start: '2026-09-01T00:00:00Z',
  end: '2026-09-08T00:00:00Z',
  granularity: 'day',
};

const chQueryMock = vi.mocked(chQuery);

beforeEach(() => {
  chQueryMock.mockReset();
});

/** 让 chQuery 返回指定行，并执行一次 runAnalysis */
async function run(overrides: Partial<AnalysisInput>, rows: Record<string, unknown>[] = []) {
  chQueryMock.mockResolvedValue(rows);
  return new AnalysisService().runAnalysis({
    project_id: 7,
    time_range: baseTimeRange,
    ...overrides,
  });
}

/** 名称 → 节点 id */
function nodeIdByName(nodes: PathNode[], name: string): string | undefined {
  return nodes.find((n) => n.name === name)?.id;
}

// ────────────────────────────────────────────────────────────

describe('漏斗（funnel）— windowFunnel 的 level 是「达到的最高步」', () => {
  it('每步用户数 = 所有 level >= 该步 的用户数之和（累积口径）', async () => {
    // level 0 的用户一步都没走完，不进入任何一步
    const rows = [
      { level: 0, users: 4 },
      { level: 1, users: 5 },
      { level: 2, users: 3 },
      { level: 3, users: 2 },
    ];

    const result = (await run(
      { type: 'funnel', funnel_events: ['view', 'cart', 'pay'] },
      rows,
    )) as unknown as FunnelResult;

    // 到达第 1 步 = level>=1 = 5+3+2 = 10；第 2 步 = 3+2 = 5；第 3 步 = 2
    expect(result.type).toBe('funnel');
    expect(result.steps.map((s) => s.step)).toEqual([1, 2, 3]);
    expect(result.steps.map((s) => s.event)).toEqual(['view', 'cart', 'pay']);
    expect(result.steps.map((s) => s.count)).toEqual([10, 5, 2]);
    expect(result.steps.map((s) => s.rate)).toEqual([100, 50, 20]);
    // 末步 rate 即整体转化率
    expect(result.total_conversion).toBe(20);
    // 漏斗必须单调不增
    expect(result.steps[0].count).toBeGreaterThanOrEqual(result.steps[1].count);
    expect(result.steps[1].count).toBeGreaterThanOrEqual(result.steps[2].count);
    expect(typeof result.query_id).toBe('string');
    expect(Number.isFinite(result.elapsed_ms)).toBe(true);
  });

  it('level 跳级（无 level=2 行）时仍按「达到」口径累积', async () => {
    const result = (await run({ type: 'funnel', funnel_events: ['a', 'b', 'c'] }, [
      { level: 1, users: 2 },
      { level: 3, users: 1 },
    ])) as unknown as FunnelResult;

    expect(result.steps.map((s) => s.count)).toEqual([3, 1, 1]);
    // 1/3 = 33.333... → 33.33
    expect(result.steps.map((s) => s.rate)).toEqual([100, 33.33, 33.33]);
  });

  it('rate 的分母是「到达首步的用户数」（所有 level>=1 之和），total_conversion 取末步 rate', async () => {
    const result = (await run({ type: 'funnel', funnel_events: ['a', 'b'] }, [
      { level: 1, users: 2 },
      { level: 2, users: 8 },
    ])) as unknown as FunnelResult;

    // 首步到达人数 = 2 + 8 = 10（level=1 的用户也到达了第 1 步）
    expect(result.steps.map((s) => s.count)).toEqual([10, 8]);
    expect(result.steps.map((s) => s.rate)).toEqual([100, 80]);
    expect(result.total_conversion).toBe(80);
  });

  it('空结果时全部为 0，不出现 NaN', async () => {
    const result = (await run(
      { type: 'funnel', funnel_events: ['a', 'b'] },
      [],
    )) as unknown as FunnelResult;

    expect(result.steps.map((s) => s.count)).toEqual([0, 0]);
    expect(result.steps.map((s) => s.rate)).toEqual([0, 0]);
    expect(result.total_conversion).toBe(0);
    expect(result.steps.every((s) => Number.isFinite(s.rate))).toBe(true);
  });
});

describe('留存（retention）— 按 cohort 分组并补齐缺失天', () => {
  it('base_users 取 day_offset=0，retention_rates 逐日计算且缺失天补 0', async () => {
    // 故意打乱行顺序，并混入 DateTime 字符串（应归一化为日期）
    const rows = [
      { cohort_dt: '2026-09-02', day_offset: 2, users: 5 },
      { cohort_dt: '2026-09-01 00:00:00', day_offset: 3, users: 10 },
      { cohort_dt: '2026-09-01', day_offset: 1, users: 40 },
      { cohort_dt: '2026-09-02', day_offset: 0, users: 50 },
      { cohort_dt: '2026-09-01', day_offset: 0, users: 100 },
    ];

    const result = (await run(
      { type: 'retention', retention_event: 'signup' },
      rows,
    )) as unknown as RetentionResult;

    // 按日期升序
    expect(result.matrix.map((m) => m.date)).toEqual(['2026-09-01', '2026-09-02']);

    const [day1, day2] = result.matrix;
    expect(day1.base_users).toBe(100);
    // 第 2 天没有数据 → 补 0；第 3 天 10/100 = 10%
    expect(day1.retention_rates).toEqual([100, 40, 0, 10]);

    expect(day2.base_users).toBe(50);
    expect(day2.retention_rates).toEqual([100, 0, 10]);
  });

  it('cohort 缺少 day_offset=0 时 base_users 为 0，比率全 0（不产生 NaN/Infinity）', async () => {
    const result = (await run({ type: 'retention', retention_event: 'signup' }, [
      { cohort_dt: '2026-09-03', day_offset: 2, users: 7 },
    ])) as unknown as RetentionResult;

    expect(result.matrix).toHaveLength(1);
    expect(result.matrix[0].base_users).toBe(0);
    expect(result.matrix[0].retention_rates).toEqual([0, 0, 0]);
    expect(result.matrix[0].retention_rates.every((r) => Number.isFinite(r))).toBe(true);
  });

  it('空结果时 matrix 为空数组', async () => {
    const result = (await run(
      { type: 'retention', retention_event: 'signup' },
      [],
    )) as unknown as RetentionResult;

    expect(result.matrix).toEqual([]);
  });
});

describe('分布（distribution）— buckets/values/total', () => {
  it('优先取 dim_0，其次 device_type，缺失维度记为「未知」', async () => {
    const rows = [
      { dim_0: 'mobile', users: 10, events: 100 },
      { device_type: 'desktop', users: 5, events: 20 },
      { users: 3, events: 3 },
    ];

    const result = (await run(
      { type: 'distribution', dimensions: ['device_type'] },
      rows,
    )) as unknown as DistributionResult;

    expect(result.buckets).toEqual(['mobile', 'desktop', '未知']);
    expect(result.values).toEqual([10, 5, 3]);
    expect(result.total).toBe(18);
  });

  it('dim_0 为 null 时回退到 device_type', async () => {
    const result = (await run({ type: 'distribution', dimensions: ['device_type'] }, [
      { dim_0: null, device_type: 'ios', users: 2 },
    ])) as unknown as DistributionResult;

    expect(result.buckets).toEqual(['ios']);
  });

  it('ClickHouse 返回的字符串数值会被转成数字', async () => {
    const result = (await run({ type: 'distribution', dimensions: ['device_type'] }, [
      { dim_0: 'x', users: '7' },
      { dim_0: 'y', users: '5' },
    ])) as unknown as DistributionResult;

    expect(result.values).toEqual([7, 5]);
    expect(result.total).toBe(12);
  });
});

describe('路径（path）— 字符串还原为节点/连线图', () => {
  it('把 "A > B > C" 还原为节点与连线，同名节点复用同一个 id', async () => {
    const rows = [
      { path: 'home > product > cart', users: 10 },
      { path: 'home > search', users: 4 },
    ];

    const result = (await run({ type: 'path' }, rows)) as unknown as PathResult;

    expect(result.nodes.map((n) => n.name)).toEqual(['home', 'product', 'cart', 'search']);
    // 同名节点只出现一次
    expect(result.nodes.filter((n) => n.name === 'home')).toHaveLength(1);
    // id 唯一且与名字一一对应
    expect(new Set(result.nodes.map((n) => n.id)).size).toBe(result.nodes.length);

    const home = nodeIdByName(result.nodes, 'home');
    const product = nodeIdByName(result.nodes, 'product');
    const cart = nodeIdByName(result.nodes, 'cart');
    const search = nodeIdByName(result.nodes, 'search');

    expect(result.links).toHaveLength(3);
    expect(result.links).toContainEqual({ source: home, target: product, value: 10 });
    expect(result.links).toContainEqual({ source: product, target: cart, value: 10 });
    expect(result.links).toContainEqual({ source: home, target: search, value: 4 });
  });

  it('同一条边的多次出现会累加权重，且不产生重复节点', async () => {
    const rows = [
      { path: 'home > product', users: 3 },
      { path: 'home > product > cart', users: 7 },
    ];

    const result = (await run({ type: 'path' }, rows)) as unknown as PathResult;

    expect(result.nodes).toHaveLength(3);
    expect(result.nodes.filter((n) => n.name === 'product')).toHaveLength(1);

    const home = nodeIdByName(result.nodes, 'home');
    const product = nodeIdByName(result.nodes, 'product');
    const cart = nodeIdByName(result.nodes, 'cart');

    expect(result.links).toContainEqual({ source: home, target: product, value: 10 });
    expect(result.links).toContainEqual({ source: product, target: cart, value: 7 });
  });

  it('空 path 行被忽略；没有边时结果为空图', async () => {
    const result = (await run({ type: 'path' }, [
      { path: '', users: 5 },
      { path: 'home', users: 2 },
    ])) as unknown as PathResult;

    // 单步路径不产生任何边，因此也不产生节点（当前实现只在成边时建节点）
    expect(result.nodes).toEqual([]);
    expect(result.links).toEqual([]);
  });

  it('空结果时 nodes/links 均为空数组', async () => {
    const result = (await run({ type: 'path' }, [])) as unknown as PathResult;

    expect(result.nodes).toEqual([]);
    expect(result.links).toEqual([]);
  });
});

describe('归因（attribute）— 渠道转化占比', () => {
  it('contribution = 该渠道 conversions / 全部 conversions 总和 * 100', async () => {
    const rows = [
      { channel: 'google', users: 5, conversions: 10 },
      { channel: 'baidu', users: 3, conversions: 30 },
      { users: 1, conversions: 0 },
    ];

    const result = (await run(
      { type: 'attribute', target_event: 'purchase' },
      rows,
    )) as unknown as AttributionResult;

    expect(result.attributes.map((a) => a.channel)).toEqual(['google', 'baidu', '未知']);
    expect(result.attributes.map((a) => a.conversions)).toEqual([10, 30, 0]);
    expect(result.attributes.map((a) => a.users)).toEqual([5, 3, 1]);
    expect(result.attributes.map((a) => a.contribution)).toEqual([25, 75, 0]);
    // 占比之和为 100
    expect(result.attributes.reduce((sum, a) => sum + a.contribution, 0)).toBeCloseTo(100, 6);
  });

  it('渠道为空串时记为「未知」，字符串数值会被转换', async () => {
    const result = (await run({ type: 'attribute', target_event: 'purchase' }, [
      { channel: '', users: '2', conversions: '30' },
      { channel: 'weibo', users: '1', conversions: '10' },
    ])) as unknown as AttributionResult;

    expect(result.attributes.map((a) => a.channel)).toEqual(['未知', 'weibo']);
    expect(result.attributes.map((a) => a.conversions)).toEqual([30, 10]);
    expect(result.attributes.map((a) => a.contribution)).toEqual([75, 25]);
  });

  it('转化总数为 0 时 contribution 全为 0（不产生 NaN）', async () => {
    const result = (await run({ type: 'attribute', target_event: 'purchase' }, [
      { channel: 'a', users: 0, conversions: 0 },
    ])) as unknown as AttributionResult;

    expect(result.attributes[0].contribution).toBe(0);
    expect(Number.isFinite(result.attributes[0].contribution)).toBe(true);
  });
});

describe('事件（event）— 默认分析类型', () => {
  it('未指定 type 时默认走事件分析', async () => {
    const result = (await run({ event_name: 'page_view' }, [
      { dt: '2026-09-01 00:00:00', count: 5 },
    ])) as unknown as EventResult;

    expect(result.type).toBe('event');
    expect(result.rows).toBe(1);
    // 未指定指标时默认 count
    expect(result.columns).toEqual(['date', 'count']);
    expect(result.series[0].data[0]).toMatchObject({ date: '2026-09-01', value: 5 });
  });

  it('多指标 + 维度：列名与取值来自行数据，非白名单维度按维度下标取 dim_i 别名', async () => {
    const result = (await run(
      {
        type: 'event',
        event_name: 'page_view',
        metrics: [
          { type: 'count', alias: 'pv' },
          { type: 'uv', alias: 'uv' },
        ],
        dimensions: ['device_type', 'utm_source'],
      },
      // utm_source 是第 2 个维度（下标 1），构建器与服务端一致地输出 dim_1
      [{ dt: '2026-09-01 00:00:00', device_type: 'mobile', dim_1: 'ad', pv: 12, uv: 3 }],
    )) as unknown as EventResult;

    expect(result.columns).toEqual(['date', 'device_type', 'dim_1', 'pv', 'uv']);
    expect(result.series.map((s) => s.alias)).toEqual(['pv', 'uv']);
    expect(result.series[0].data[0]).toEqual({
      date: '2026-09-01',
      device_type: 'mobile',
      dim_1: 'ad',
      value: 12,
    });
    expect(result.series[1].data[0].value).toBe(3);
  });

  it('时间列在不同序列化形态下都归一化为日期', async () => {
    // ClickHouse 的 Date 可能序列化为字符串、数字时间戳或 Date 对象
    const result = (await run({ type: 'event', event_name: 'page_view' }, [
      { dt: '2026-09-01', count: 1 },
      { dt: Date.UTC(2026, 8, 2), count: 2 },
      { dt: new Date('2026-09-03T05:00:00Z'), count: 3 },
    ])) as unknown as EventResult;

    expect(result.series[0].data.map((d) => d.date)).toEqual([
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
    ]);
    expect(result.series[0].data.map((d) => d.value)).toEqual([1, 2, 3]);
  });
});
