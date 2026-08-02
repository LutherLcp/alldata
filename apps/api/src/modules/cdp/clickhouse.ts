/**
 * CDP ClickHouse 引擎抽象层
 */
export class CDPClickHouseEngine {
  /** 构建 Cohort 人群交集过滤查询 SQL */
  static buildCohortSQL(projectId: number, rules: any[]): string {
    const conditions = rules.map((r) => {
      const op = r.operator === 'eq' ? '=' : r.operator === 'gt' ? '>' : r.operator === 'lt' ? '<' : 'LIKE';
      const val = typeof r.value === 'string' ? `'${r.value}'` : r.value;
      return `${r.property} ${op} ${val}`;
    }).join(' AND ');

    return `SELECT DISTINCT user_id FROM events WHERE project_id = ${projectId} ${conditions ? `AND (${conditions})` : ''}`;
  }

  /** 构建 客户旅程 路径节点查询 SQL */
  static buildJourneyPathSQL(projectId: number, dateRange: { start: string; end: string }): string {
    return `
      SELECT 
        event_name AS source_event,
        lead(event_name, 1) OVER (PARTITION BY user_id ORDER BY event_time) AS target_event,
        count(1) AS transition_count
      FROM events
      WHERE project_id = ${projectId} 
        AND event_time >= '${dateRange.start}' 
        AND event_time <= '${dateRange.end}'
      GROUP BY source_event, target_event
      HAVING target_event IS NOT NULL
      ORDER BY transition_count DESC
      LIMIT 20
    `;
  }
}
