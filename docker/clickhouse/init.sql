-- ClickHouse 初始化脚本
-- AllData 全域数据运营平台 — OLAP 分析库

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS alldata;

-- ============================================================
-- 事件数据主表（V2 分析引擎使用）
-- ============================================================
CREATE TABLE IF NOT EXISTS alldata.events
(
    project_id  UInt32,
    event_name  String,
    user_id     UInt64,
    event_time  DateTime,
    properties  String DEFAULT '{}',
    device_type String DEFAULT '',
    os          String DEFAULT '',
    browser     String DEFAULT '',
    country     String DEFAULT '',
    region      String DEFAULT '',
    dt          Date DEFAULT toDate(event_time)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (project_id, event_name, event_time, user_id)
TTL event_time + INTERVAL 2 YEAR;

-- ============================================================
-- 用户属性快照表
-- ============================================================
CREATE TABLE IF NOT EXISTS alldata.user_profiles
(
    project_id  UInt32,
    user_id     UInt64,
    properties  String DEFAULT '{}',
    first_seen  DateTime,
    last_seen   DateTime,
    updated_at  DateTime DEFAULT now()
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (project_id, user_id);

-- ============================================================
-- 日活指标预聚合物化视图（V2 性能优化）
-- ============================================================
CREATE TABLE IF NOT EXISTS alldata.mv_dau
(
    project_id  UInt32,
    dt          Date,
    uv          UInt64,
    pv          UInt64
)
ENGINE = SummingMergeTree()
ORDER BY (project_id, dt);

CREATE MATERIALIZED VIEW IF NOT EXISTS alldata.mv_dau_mv
TO alldata.mv_dau
AS
SELECT
    project_id,
    toDate(event_time) AS dt,
    countDistinct(user_id) AS uv,
    count() AS pv
FROM alldata.events
GROUP BY project_id, dt;

-- ============================================================
-- SQL 查询历史表
-- ============================================================
CREATE TABLE IF NOT EXISTS alldata.sql_query_history
(
    id          UInt64,
    project_id  UInt32,
    user_id     UInt32,
    sql_content String,
    status      UInt8 DEFAULT 1,
    duration_ms UInt32 DEFAULT 0,
    error_msg   String DEFAULT '',
    created_at  DateTime DEFAULT now()
)
ENGINE = MergeTree()
ORDER BY (project_id, created_at)
TTL created_at + INTERVAL 90 DAY;
