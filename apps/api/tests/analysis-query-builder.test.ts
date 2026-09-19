import {
  QueryBuildError,
  SCALAR_COLUMNS,
  buildAnalysisQuery,
  buildEventQuery,
  buildFunnelQuery,
} from '@/modules/analysis/query-builder';
import { describe, expect, it } from 'vitest';

const baseInput = {
  project_id: 7,
  event_name: 'page_view',
  time_range: { start: '2026-09-01T00:00:00Z', end: '2026-09-08T00:00:00Z', granularity: 'day' },
};

describe('分析查询构建器 — 多租户隔离', () => {
  it('每种分析类型都会强制注入 project_id 谓词', () => {
    const cases = [
      buildEventQuery({ ...baseInput, type: 'event' }),
      buildFunnelQuery({
        ...baseInput,
        type: 'funnel',
        funnel_events: ['view', 'cart', 'pay'],
      }),
      buildAnalysisQuery({
        ...baseInput,
        type: 'retention',
        retention_event: 'view',
      }),
      buildAnalysisQuery({ ...baseInput, type: 'distribution', dimensions: ['device_type'] }),
      buildAnalysisQuery({ ...baseInput, type: 'path' }),
      buildAnalysisQuery({ ...baseInput, type: 'attribute', target_event: 'pay' }),
    ];

    for (const built of cases) {
      expect(built.sql).toContain('project_id = {project_id:UInt32}');
      expect(built.params.project_id).toBe(7);
    }
  });

  it('project_id 非法时拒绝构建', () => {
    expect(() => buildEventQuery({ ...baseInput, type: 'event', project_id: 0 })).toThrow(
      QueryBuildError,
    );
    expect(() =>
      buildEventQuery({ ...baseInput, type: 'event', project_id: Number('abc') }),
    ).toThrow(QueryBuildError);
  });
});

describe('分析查询构建器 — 注入防护', () => {
  it('筛选取值走参数占位符，不拼接进 SQL', () => {
    const malicious = "'; DROP TABLE events; --";
    const { sql, params } = buildEventQuery({
      ...baseInput,
      type: 'event',
      filters: [{ field: 'country', op: 'eq', value: malicious }],
    });

    // 恶意内容不得出现在 SQL 文本中，只能存在于参数里
    expect(sql).not.toContain('DROP TABLE');
    expect(sql).not.toContain(malicious);
    expect(sql).toContain('{filter_value_0:String}');
    expect(params.filter_value_0).toBe(malicious);
  });

  it('属性维度的键通过参数传递，不拼接', () => {
    const evilKey = "a') OR 1=1 --";
    const { sql, params } = buildEventQuery({
      ...baseInput,
      type: 'event',
      dimensions: [evilKey],
    });

    expect(sql).not.toContain('OR 1=1');
    expect(sql).toContain('{dim_key_0:String}');
    expect(params.dim_key_0).toBe(evilKey);
  });

  it('未知维度不会退化为裸列名，而是走 JSONExtractString', () => {
    const { sql } = buildEventQuery({
      ...baseInput,
      type: 'event',
      dimensions: ['device_type', 'some_unknown_field'],
    });
    // 白名单列直接引用
    expect(sql).toContain('device_type');
    // 非白名单走属性解析
    expect(sql).toContain('JSONExtractString(properties, {dim_key_1:String})');
  });

  it('未在白名单中的操作符被拒绝', () => {
    expect(() =>
      buildEventQuery({
        ...baseInput,
        type: 'event',
        filters: [{ field: 'country', op: 'eq; DROP TABLE events', value: 'x' }],
      }),
    ).toThrow(QueryBuildError);
  });

  it('IN 操作符要求数组取值', () => {
    expect(() =>
      buildEventQuery({
        ...baseInput,
        type: 'event',
        filters: [{ field: 'country', op: 'in', value: 'CN' }],
      }),
    ).toThrow(QueryBuildError);

    const { sql, params } = buildEventQuery({
      ...baseInput,
      type: 'event',
      filters: [{ field: 'country', op: 'in', value: ['CN', 'US'] }],
    });
    expect(sql).toContain('{filter_value_0:Array(String)}');
    expect(params.filter_value_0).toEqual(['CN', 'US']);
  });

  it('非法时间或时间粒度被拒绝', () => {
    expect(() =>
      buildEventQuery({
        ...baseInput,
        type: 'event',
        time_range: { start: 'not-a-date', end: '2026-09-08' },
      }),
    ).toThrow(QueryBuildError);

    expect(() =>
      buildEventQuery({
        ...baseInput,
        type: 'event',
        time_range: { ...baseInput.time_range, granularity: 'day; DROP TABLE events' },
      }),
    ).toThrow(QueryBuildError);
  });

  it('指标别名限定为标识符字符集', () => {
    expect(() =>
      buildEventQuery({
        ...baseInput,
        type: 'event',
        metrics: [{ type: 'uv', alias: 'uv); DROP TABLE events; --' }],
      }),
    ).toThrow(QueryBuildError);
  });

  it('白名单列集合与事件表列定义一致', () => {
    expect(Object.keys(SCALAR_COLUMNS)).toEqual([
      'event_name',
      'device_type',
      'os',
      'browser',
      'country',
      'region',
    ]);
  });
});

describe('分析查询构建器 — 语义正确性', () => {
  it('事件分析按粒度选择时间表达式并聚合指标', () => {
    const { sql } = buildEventQuery({
      ...baseInput,
      type: 'event',
      metrics: [
        { type: 'uv', alias: 'uv' },
        { type: 'count', alias: 'pv' },
      ],
      dimensions: ['device_type'],
      time_range: { ...baseInput.time_range, granularity: 'hour' },
    });

    expect(sql).toContain('toStartOfHour(event_time) AS dt');
    expect(sql).toContain('uniqExact(user_id) AS uv');
    expect(sql).toContain('count() AS pv');
    expect(sql).toContain('GROUP BY dt, device_type');
  });

  it('漏斗要求至少两步且使用 windowFunnel', () => {
    expect(() =>
      buildFunnelQuery({ ...baseInput, type: 'funnel', funnel_events: ['only_one'] }),
    ).toThrow(QueryBuildError);

    const { sql, params } = buildFunnelQuery({
      ...baseInput,
      type: 'funnel',
      funnel_events: ['view', 'cart', 'pay'],
      funnel_window_seconds: 3600,
    });
    expect(sql).toContain('windowFunnel({window_seconds:UInt32})');
    expect(sql).toContain('event_name = {funnel_step_1:String}');
    expect(params.funnel_step_2).toBe('pay');
    expect(params.window_seconds).toBe(3600);
  });

  it('留存以首个事件定义分群，且在派生表内计算日期偏移', () => {
    const { sql, params } = buildAnalysisQuery({
      ...baseInput,
      type: 'retention',
      retention_event: 'signup',
      retention_return_event: 'login',
    });
    expect(sql).toContain("dateDiff('day', c.cohort_dt, toDate(e.event_time)) AS day_offset");
    expect(sql).toContain('toDate(min(event_time)) AS cohort_dt');
    expect(sql).toContain('toDate(e.event_time) >= c.cohort_dt');
    // day_offset 必须是派生表的真实列，不能依赖 SELECT 别名参与 WHERE
    expect(sql).not.toMatch(/WHERE\s+dateDiff/);
    expect(params.retention_event).toBe('signup');
    expect(params.return_event).toBe('login');
  });

  it('路径分析对事件排序后再聚合，避免 groupArray 顺序不确定', () => {
    const { sql } = buildAnalysisQuery({ ...baseInput, type: 'path' });
    expect(sql).toContain('arraySort(groupArray((event_time, event_name)))');
    expect(sql).toContain('arrayMap(x -> x.2,');
    expect(sql).toContain('{max_steps:UInt32}');
    // 不应再依赖子查询 ORDER BY 来保证序列顺序
    expect(sql).not.toContain('ORDER BY user_id ASC, event_time ASC');
  });

  it('limit 被限制在上限内', () => {
    const { params } = buildEventQuery({ ...baseInput, type: 'event', limit: 999999 });
    expect(params.limit).toBe(1000);
  });

  it('归因默认使用 channel 属性键且可覆盖', () => {
    const { params } = buildAnalysisQuery({
      ...baseInput,
      type: 'attribute',
      target_event: 'purchase',
      channel_property: 'utm_source',
    });
    expect(params.channel_key).toBe('utm_source');
    expect(params.target_event).toBe('purchase');
  });
});
