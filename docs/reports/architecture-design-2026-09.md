# AllData 架构设计报告(2026 H2 — 2027)

> **报告日期**:2026-09-13
> **前置文档**:[现状分析报告](./analysis-report-2026-09.md)
> **定位**:给出从"演示级平台"走向"生产级平台"的目标架构与关键设计决策

---

## 1. 设计目标与原则

### 1.1 北极星

> **AllData = 可私有化部署的用户行为分析与运营平台,核心闭环为:采集 → 身份 → 分析 → 分群 → 触达。**

### 1.2 设计原则

| 原则 | 含义 | 反面案例(现状) |
|------|------|----------------|
| **内核优先** | 资源向核心闭环倾斜,垂直模块一律可插拔 | 财务/KoCRM/MTA 与内核同等投入 |
| **单源实现** | 每个能力只有一个权威实现 | api 与 api-go 双后端并行 |
| **契约先行** | 前后端以 @alldata/shared 的 Zod Schema 为唯一契约 | 部分接口绕过 Schema 手写类型 |
| **默认安全** | 密钥不出库、CORS 白名单、SQL 网关强制审计 | 密钥入库、CORS 全放行 |
| **可度量** | 一切性能/容量声称必须有压测数据 | "100k QPS" 无报告佐证 |

---

## 2. 产品架构设计

### 2.1 三层产品架构

```
┌─────────────────────────────────────────────────────────────────┐
│  L3 智能层(AI,横切)                                              │
│  ChatBI 自然语言查询 · 智能预警(时序异常) · 看板 AI 摘要           │
├─────────────────────────────────────────────────────────────────┤
│  L2 垂直应用层(可插拔插件,默认不启用)                             │
│  finance · kocrm · mta/mmm · marketing · marketplace · experience│
├─────────────────────────────────────────────────────────────────┤
│  L1 分析内核(P0,全部资源的主战场)                                 │
│  采集 SDK → 采集网关 → 数据管道 → 行为分析(6模型) → 看板/报表      │
│  埋点治理 · 用户画像/ID-Mapping · 标签分群 · 预警 · 订阅触达        │
├─────────────────────────────────────────────────────────────────┤
│  L0 平台底座                                                     │
│  租户/项目/RBAC · 审计 · 数据脱敏与隐私中心 · 开放API · 可观测性    │
└─────────────────────────────────────────────────────────────────┘
```

**决策 P-1**:L2 垂直模块以**功能开关(feature flag)+ 模块化路由**方式存在,默认关闭;安装即启用。内核代码不得反向依赖 L2。

**决策 P-2**:L1 内核中当前最优先补齐的是**数据入口**(生产级 Web SDK + 采集网关)与**身份打通**(ID-Mapping)——这是把平台从"演示"变"真实"的前提。

---

## 3. 技术架构设计

### 3.1 总体架构(目标态)

```
                      ┌───────────────────────────┐
   浏览器/小程序 ──────▶│  Web (React18/Vite5/Antd5) │
                      └─────────────┬─────────────┘
                                    │ HTTPS(REST + WS)
  采集 SDK(<10KB,TS)               ▼
        │              ┌─────────────────────────────┐
        │  events      │  采集网关 Collector(Go)      │◀── 独立部署、水平扩容
        └─────────────▶│  校验/限流/批量缓冲          │
                       └──────────────┬──────────────┘
                                      │
                              Kafka(topic: events)
                                      │
                       ┌──────────────▼──────────────┐
                       │  Stream Consumer(api 内)    │
                       │  ID-Mapping · 画像宽表更新   │
                       └──┬─────────┬─────────┬──────┘
                          ▼         ▼         ▼
                    PostgreSQL   ClickHouse   Redis
                     (元数据)   (事件/预聚合)  (缓存/队列)
                          ▲
                       ┌──┴───────────────────────────┐
                       │  API(Fastify,唯一权威后端)   │
                       │  查询网关 · 模块化业务路由     │
                       └──────────────────────────────┘
```

### 3.2 决策 T-1:双后端收敛 — TS 主后端 + Go 采集网关

**问题**:api(8.5k 行,33 模块)与 api-go(2.6k 行骨架)并行,且 Go 设计稿基于 MySQL,与现实不符。

**决策**:
1. **业务后端只保留 TypeScript(api)**。33 个模块以 CRUD/查询为主,Prisma + 共享 Zod Schema 的开发效率优势明显,重写无收益;
2. **api-go 转型为"采集网关 Collector"**,只做一件事:接收 SDK 埋点事件,校验、限流、批量写入 Kafka。理由:
   - 采集入口是全系统唯一真正需要极致吞吐与长连接保持的组件(Go 的主场);
   - 职责单一化后,api-go 现有 auth/gorm 等代码可删,保留 Gin + 连接池骨架;
   - 独立部署、独立扩容,与业务 API 故障域隔离。
3. `docs/md_files/backend_go_design_report.md` 降级为参考文档并加"非本项目现状"声明。

### 3.3 决策 T-2:数据管道与身份打通(CDP 核心)

**事件主表(ClickHouse)分区与生命周期**:

```sql
CREATE TABLE events (
  distinct_id   String,          -- 设备/匿名 ID
  user_id       String DEFAULT '',-- 登录后绑定的业务 ID
  one_id        String,          -- ID-Mapping 后的统一 ID(物化时回填)
  project_id    LowCardinality(String),
  event         LowCardinality(String),
  properties    Map(String,String),        -- 标量属性
  properties_json String,                  -- 复杂属性
  time          DateTime64(3),
  ...
) ENGINE = MergeTree
PARTITION BY toYYYYMMDD(time)              -- 按日分区,TTL 180 天可配
ORDER BY (project_id, event, time);
```

**ID-Mapping 设计**(现状完全缺失,是 CDP 缺失的核心):

```
匿名设备 distinct_id ──登录绑定──▶ user_id
        │                              │
        └──────── 合并到 one_id ────────┘
```

- PG 表 `id_mappings(one_id, id_type, id_value, first_seen, last_seen)` 记录映射;Consumer 消费事件时维护绑定关系;
- 事件写入 CH 后由物化视图/后台任务回填 `one_id`;
- 用户画像宽表 `user_profiles`(ReplacingMergeTree):标签 + 属性 + 首末次行为,供分群与画像查询。

**决策 T-2 交付物**:ID-Mapping 服务 + 画像宽表 + `events` 表重构(分区/排序键对齐查询模式)。

### 3.4 决策 T-3:统一查询网关(分析 DSL)

现状 6 类分析各自拼 SQL。目标收敛为**单一查询网关**:

```
前端(语义参数: 指标/维度/筛选/时间/分析类型)
   → POST /api/query  (Zod Schema 严格校验, @alldata/shared 共享)
   → QueryPlanner: 语法树校验 → 白名单校验 → 生成 CH SQL
   → 执行: 缓存查询(Redis, hash(key)) → 超时 30s → KILL QUERY
   → 资源治理: 项目级并发配额 + 大结果集采样降级
```

要点:
- **SQL 分析不再拼接原始 SQL**,改为受控模板 + 参数化;保留"高级模式"但经 `sqlglot` 类解析器白名单校验(只读、禁 DDL/DCL、强制 project_id 谓词);
- 所有查询携带 `trace_id`,CH 慢查询日志回流可观测体系;
- 响应统一 `code/message/data` 分页契约(已有,保持)。

### 3.5 决策 T-4:多租户与权限模型

```
tenant(租户)
  └── project(项目,数据隔离单元)
        └── member(UserProjectRole + Role)
              └── permission(权限树 code,如 dashboard:edit)
```

- **行级隔离**:所有 CH 查询与 PG 查询强制注入 `project_id`(查询网关统一保证,禁止模块自行拼查询);
- RBAC 权限树已有雏形(auth_tree 缓存),补齐:权限点清单化、接口级装饰器 `requirePerm('dashboard:edit')`、前端路由/按钮双端同源(权限码出自 @alldata/shared);
- 数据权限不足沿用 `code 20201` 契约。

### 3.6 决策 T-5:安全设计(修复 P0)

| 项 | 设计 |
|----|------|
| CORS | Origin 白名单(环境变量 `CORS_ORIGINS`,逗号分隔),生产禁用 `cb(null, true)` |
| 密钥 | 仓库只保留 `.env.example`;真实密钥走部署环境注入(自托管可用 Docker secrets / Vault);**轮换已泄露的默认密钥** |
| SQL 网关 | 见 T-3;SQL 分析操作全量审计 |
| 文件上传 | 类型白名单 + 魔数校验 + MinIO 桶策略(已有基础,补魔数校验) |
| 限流 | 分层:全局 → 接口组 → 分析查询(项目配额),Redis 滑动窗口(已有) |
| 审计 | 审计插件已有,补:登录/导出/SQL 执行/权限变更四类强制事件 |

### 3.7 决策 T-6:部署与可观测

```
环境分层: dev(compose 单机) / staging / prod
prod 拓扑(第一阶段): Nginx/Traefik ── api ×2 ── collector ×2
                      CH 单机(后续可升集群) + PG 主备 + Redis 哨兵
```

- **可观测三件套**:结构化日志(pino,已有)+ 指标(接口 P95/CH 查询耗时/队列积压,先以 `/metrics` + Grafana Agent 起步)+ 链路(trace_id 贯穿 API→CH);
- **容量真相**:以压测报告替代口号——R1 出 1k QPS 基线报告,R3 出 10k,采集链路单独冲 50k+(Collector 水平扩容验证);
- **备份**:PG 每日逻辑备份 + CH `BACKUP TABLE` 周备份 + MinIO 版本化。

### 3.8 前端架构决策

| # | 决策 |
|---|------|
| F-1 | **图表库收敛为 echarts 一套**:现状 echarts 实际在用;`@ant-design/charts`、`@antv/g2`、`@antv/x6`、`@antv/x6-react-components` **经审计确认全代码库 0 引用**(R0 已移除,连同 `vite.config.ts` 中永不产出的 manualChunks 配置)。后续新增画布/多维可视化需求时按需引入 |
| F-2 | `services-new/` 更名 `services/`,内含 v4.ts/v5.ts 的历史分层合并为按域组织(auth/dashboard/analysis/...) |
| F-3 | 依赖审计:移除零引用包(react-hook-form/@hookform/resolvers 等待审计确认),目标首屏 JS ≤ 1.2MB(gzip) |
| F-4 | 路由级代码分割 + 图表组件懒加载(V5.3 已做部分,补齐 25 个页面的分包) |
| F-5 | 权限码与路由表同源化:菜单/路由/按钮权限均读 @alldata/shared 的权限常量 |

### 3.9 插件化垂直模块设计(L2)

```
apps/api/src/modules/<vertical>/
  ├── manifest.ts     # 模块清单: 路由前缀/权限点/feature flag/迁移脚本
  ├── routes.ts       # Fastify 插件式注册
  └── service.ts
```

- `registerModule(app, manifest)` 统一注册;`FEATURE_FINANCE=false` 时整模块不挂载;
- 前端菜单由后端 `/api/modules/enabled` 下发,未启用模块不可见不可达;
- 迁移顺序:先 finance(依赖最独立)→ kocrm → mta → marketplace。

### 3.10 AI 能力设计(L3)

```
用户输入 → AI 网关(api 内)
            ├── Provider 抽象(OpenAI/Anthropic/本地模型, 可配)
            ├── 成本治理: 每租户 token 配额 + 缓存 + 超时
            ├── 受控 ChatBI: NL → 查询 DSL(非裸 SQL)→ 复用 T-3 查询网关执行
            └── 降级: LLM 不可用 → 已有 mock 降级路径(V7.2 资产复用)
```

- ChatBI 输出必须是**查询 DSL JSON**,经 Schema 校验后进查询网关,禁止直接执行 LLM 生成的 SQL;
- 智能预警在现有 anomaly 骨架上接入真实时序检测(先 STL/移动方差等统计法,LLM 仅做归因解释);
- 看板 AI 摘要复用同一网关。

### 3.11 质量工程体系

| 层级 | 现状 | 目标(R2 末) |
|------|------|-------------|
| API 集成测试(harness) | 4 个文件 | 内核 33 模块中 L1 模块 100% 有冒烟用例 |
| 单元测试 | ~1 个文件 | utils/query 编译器/权限判断 70% |
| E2E | e2e-test.sh 脚本 | Playwright 冒烟 10 条(登录/建看板/查询/建标签/订阅) |
| CI 门禁 | ci.yml 存在 | lint + typecheck + test + build 全绿才可合并;覆盖率不设硬门禁但公示趋势 |

---

## 4. 目标数据模型摘要

| 存储 | 模型 | 用途 |
|------|------|------|
| PG | 现有 35 模型 + `id_mappings` + `tenant` | 元数据 + 身份映射 |
| CH | `events`(按日分区)+ `user_profiles`(宽表)+ 4 物化视图(保留并扩展 mv_daily_retention) | 行为数据 + 画像 |
| Redis | 现有 Key 规范保留 + `quota:{project_id}` 查询配额 | 缓存/队列/限流 |

---

## 5. 决策清单汇总(ADR 索引)

| ID | 决策 | 理由 |
|----|------|------|
| P-1 | 垂直模块插件化、默认关闭 | 收敛维护面 |
| P-2 | 优先补采集与身份 | 数据是平台之源 |
| T-1 | TS 主后端 + Go 采集网关,放弃 Go 全量重写 | 效率与职责最优化 |
| T-2 | ID-Mapping + 画像宽表 + events 分区重构 | CDP 内核 |
| T-3 | 统一查询网关 DSL,SQL 受控化 | 安全 + 性能治理统一收口 |
| T-4 | 租户/项目/RBAC + 强制 project_id 谓词 | 多租户地基 |
| T-5 | CORS 白名单 + 密钥出库 + 审计四事件 | P0 安全修复 |
| T-6 | 三环境分层 + 压测报告制 | 可信的容量叙事 |
| F-1~F-5 | 图表库收敛、目录治理、权限同源 | 前端一致性与体积 |
| A-1 | ChatBI 走查询 DSL 不生成裸 SQL | AI 安全边界 |
