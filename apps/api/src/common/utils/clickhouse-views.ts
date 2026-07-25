/**
 * ClickHouse 物化视图定义 — 预聚合加速分析查询
 * 
 * 按 project_id + event_date 预聚合
 */

export const MATERIALIZED_VIEWS = {
  // 每日事件统计
  daily_event_stats: `
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_event_stats
    ENGINE = SummingMergeTree()
    ORDER BY (project_id, event_date, event_name)
    AS SELECT
      project_id,
      toDate(timestamp) as event_date,
      event_name,
      count() as event_count,
      count(DISTINCT user_id) as unique_users,
      min(timestamp) as first_event_time,
      max(timestamp) as last_event_time
    FROM tracking_events
    GROUP BY project_id, event_date, event_name
  `,

  // 每小时事件统计
  hourly_event_stats: `
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_hourly_event_stats
    ENGINE = SummingMergeTree()
    ORDER BY (project_id, event_hour, event_name)
    AS SELECT
      project_id,
      toStartOfHour(timestamp) as event_hour,
      event_name,
      count() as event_count,
      count(DISTINCT user_id) as unique_users
    FROM tracking_events
    GROUP BY project_id, event_hour, event_name
  `,

  // 用户每日活跃统计
  daily_user_activity: `
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_user_activity
    ENGINE = SummingMergeTree()
    ORDER BY (project_id, event_date, user_id)
    AS SELECT
      project_id,
      toDate(timestamp) as event_date,
      user_id,
      count() as event_count,
      min(timestamp) as first_activity,
      max(timestamp) as last_activity,
      groupArray(DISTINCT event_name) as events_triggered
    FROM tracking_events
    WHERE user_id IS NOT NULL
    GROUP BY project_id, event_date, user_id
  `,

  // 事件属性统计
  event_property_stats: `
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_event_property_stats
    ENGINE = SummingMergeTree()
    ORDER BY (project_id, event_date, event_name, property_key)
    AS SELECT
      project_id,
      toDate(timestamp) as event_date,
      event_name,
      arrayJoin(JSONExtractKeys(properties)) as property_key,
      count() as occurrence_count
    FROM tracking_events
    GROUP BY project_id, event_date, event_name, property_key
  `,
};

/**
 * 查询优化建议
 */
export const QUERY_OPTIMIZATION = {
  // 使用预聚合视图
  useDailyStats: `
    SELECT event_date, event_name, sum(event_count) as total_count, sum(unique_users) as total_users
    FROM mv_daily_event_stats
    WHERE project_id = {projectId} AND event_date BETWEEN {startDate} AND {endDate}
    GROUP BY event_date, event_name
    ORDER BY event_date
  `,

  // 留存分析优化
  retentionQuery: `
    SELECT
      first_date,
      groupArray(day_offset) as days,
      groupArray(user_count) as counts
    FROM (
      SELECT
        toDate(a.timestamp) as first_date,
        dateDiff('day', toDate(a.timestamp), toDate(b.timestamp)) as day_offset,
        count(DISTINCT b.user_id) as user_count
      FROM tracking_events a
      INNER JOIN tracking_events b ON a.user_id = b.user_id
      WHERE a.project_id = {projectId} 
        AND b.project_id = {projectId}
        AND toDate(a.timestamp) >= {startDate}
      GROUP BY first_date, day_offset
    )
    GROUP BY first_date
    ORDER BY first_date
  `,

  // 漏斗分析优化
  funnelQuery: `
    SELECT
      step,
      count(DISTINCT user_id) as users
    FROM (
      SELECT
        user_id,
        arrayJoin([
          if(has(event_names, 'step1'), 1, NULL),
          if(has(event_names, 'step2'), 2, NULL),
          if(has(event_names, 'step3'), 3, NULL)
        ]) as step
      FROM (
        SELECT user_id, groupArray(event_name) as event_names
        FROM tracking_events
        WHERE project_id = {projectId} AND timestamp >= {startTime}
        GROUP BY user_id
      )
    )
    WHERE step IS NOT NULL
    GROUP BY step
    ORDER BY step
  `,
};

/**
 * 创建物化视图
 */
export async function createMaterializedViews(clickhouse: any): Promise<void> {
  for (const [name, sql] of Object.entries(MATERIALIZED_VIEWS)) {
    try {
      await clickhouse.query(sql).exec();
      console.log(`[ClickHouse] Materialized view created: ${name}`);
    } catch (error) {
      console.error(`[ClickHouse] Failed to create view ${name}:`, error);
    }
  }
}
