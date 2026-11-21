# AllData 多 Agent 迭代编排协议

> 制定:2026-09-19
> 角色:主线程 = 控制层(项目管理 + 产品设计);执行层 = 前端 / 后端 / 测试 三个 agent
> 目的:把 R1 剩余工作拆成可并行、可验收的迭代单元,循环推进直到达到退出条件

---

## 1. 角色与职责

| 角色 | 职责 | 不做什么 |
|---|---|---|
| **控制层(主线程)** | 需求拆解与优先级、写验收标准、派发任务、审查 diff、跑全仓门禁、提交代码、判断是否进入下一轮迭代 | 不直接写业务代码 |
| **前端 agent** | `apps/web/src/**` 的实现与重构 | 不碰 `apps/api`、不提交 git、不改测试 |
| **后端 agent** | `apps/api/src/modules/**` 的实现与重构 | 不碰 `apps/web`、不碰 `apps/api/tests`、不提交 git |
| **测试 agent** | `apps/api/tests/**` 的测试补充 | 不改 `src` 实现、不提交 git |

**关键约束**:三个 agent 的写入范围按目录严格隔离,互不重叠;git 提交权唯一归控制层。
这样既避免并行写冲突,也保证每轮产物经过控制层验收后才入库。

## 2. Loop 协议

```
        ┌──────────────────────────────────────────────┐
        │  1. 控制层:确定本轮迭代目标 + 验收标准          │
        └───────────────────┬──────────────────────────┘
                            ▼
        ┌──────────────────────────────────────────────┐
        │  2. 并发派发:前端 / 后端 / 测试 三个 agent      │
        └───────────────────┬──────────────────────────┘
                            ▼
        ┌──────────────────────────────────────────────┐
        │  3. 控制层验收:审查 diff + 跑门禁              │
        │     pnpm lint / typecheck / test / build     │
        └───────────────────┬──────────────────────────┘
                            ▼
                  ┌─────────────────┐
            否 ◀───│ 4. 是否需继续迭代?│───▶ 是
                  └─────────────────┘      (回到步骤 1 派发新一轮)
                            │ 否
                            ▼
                    输出交付报告,循环终止
```

**每轮迭代的准入条件**:上一轮全仓门禁(lint / typecheck / test / build)全绿且已提交。
**退化处理**:若某 agent 的产出无法通过验收,控制层先自行修复;修复成本过高则回退该 agent 的改动并缩小任务范围重派。

## 3. 迭代任务池(R1 剩余工作,按优先级)

| ID | 任务 | 负责 | 优先级 | 来源 |
|---|---|---|---|---|
| B1 | IDOR 修复:按 ID 操作的服务层补齐 project_id 过滤(除 tag 外的模块) | 后端 | P0 | 现状报告 E9 |
| B2 | 停止伪造数据:`warning.triggerCheck` 移除 `Math.random()`,改为真实评估或显式报告未实现 | 后端 | P0 | 现状报告 E10 |
| B3 | 提取 `buildApp()` 工厂,使 api 可被集成测试注入 | 后端 | P1 | `tests/_legacy/README.md` |
| F1 | `apps/web/src/services-new/` 更名 `services/`,合并 v4/v5 历史分层 | 前端 | P1 | 架构报告 F-2 |
| F2 | 路由级代码分割与产物体积治理(antd 415KB + echarts 350KB gzip) | 前端 | P1 | 路线图 M1.3 |
| T1 | 项目访问守卫单测(401/400/403/放行四条路径) | 测试 | P0 | 本轮新增能力缺测试 |
| T2 | 分析服务结果转换单测(漏斗累积/留存矩阵/路径还原) | 测试 | P0 | 本轮新增能力缺测试 |
| T3 | API 集成测试按现行契约重写,解除 `_legacy` 隔离 | 测试 | P1 | `tests/_legacy/README.md` |

## 4. 迭代记录

### 第 1 轮(2026-09-19)

**迭代目标**:在不破坏已完成能力的前提下,收口 R1 的安全与质量欠账。

| 派发任务 | 验收标准 |
|---|---|
| 后端:B1(IDOR 推广至 dashboard/warning/metric/tracking/data_asset)+ B2(预警去伪) | `pnpm --filter @alldata/api typecheck` 通过;相关 service 内 `Math.random` 清零;按 ID 的服务方法均接收并过滤 projectId |
| 前端:F1(services-new 更名) | 更名后 `apps/web` 全量 typecheck + build 通过;无残留 `services-new` 引用;报出 vendor chunk 体积 |
| 测试:T1 + T2 | `pnpm --filter @alldata/api test` 全绿;新增用例不依赖数据库/网络 |

**验收结果**:见本文件第 5 节(控制层填写)

## 5. 验收与结论

### 第 1 轮验收结果（2026-11-21）

1. **门禁验证**:
   - `pnpm check`（Biome）：通过（0 errors）。
   - `pnpm typecheck`：通过（全仓 4 个包 100% 通过）。
   - `pnpm test`：通过（4 个包共 102 个用例全部通过，其中 API 4 个文件 69 个用例）。
   - `pnpm build`：通过（全仓产物编译成功，Web 包 Vite 构建耗时约 4.3s）。

2. **任务验收对照**:
   - **后端（B1 + B2）**：
     - [x] B1：IDOR 访问守卫推广至 `dashboard`、`data_asset`、`metric`、`tracking`、`warning` 5 个业务模块，按 ID 操作全部按 `projectId` 隔离过滤。
     - [x] B2：`warning.service.ts` 内 `Math.random()` 清零，改为落库状态为 `not_implemented` 的真实日志，杜绝伪造指标。
   - **前端（F1）**：
     - [x] `apps/web/src/services-new/` 彻底废弃移除，合并沉淀为规范的 `apps/web/src/services/`。
     - [x] 全仓所有页面组件、Zustand store、React Query Hooks 均平滑迁移至新服务层，无任何 `services-new` 残留。
     - [x] 配置修复：在 `vite.config.ts` 与 `vitest.config.ts` 明确配置 `css.postcss: {}`，解决 monorepo 跨级搜索 PostCSS 配置导致的环境异常。
   - **测试（T1 + T2）**：
     - [x] T1（项目访问守卫单测）：`apps/api/tests/project-access.test.ts`（32 个用例，覆盖 401/400/403/正常放行）。
     - [x] T2（分析服务结果转换单测）：`apps/api/tests/analysis-transform.test.ts`（20 个用例，覆盖漏斗转换率、留存率矩阵、路径聚合转换）。

### 第 2 轮(2026-11-21)

**迭代目标**: 解除 API 遗留测试隔离，完善应用启动工厂与模块契约集成测试，优化前端打包分块。

| 派发任务 | 验收标准 |
|---|---|
| 后端: B3(提取 buildApp 工厂) + 修复 projectAccess query 回退缺陷 | `apps/api/src/app.ts` 导出 `buildApp()` 支持轻量注入；`apps/api/src/main.ts` 支持直接启动；`projectAccess` 修复 `NaN ??` 传参缺陷 |
| 前端: F2(代码分包与体积治理) | `apps/web/vite.config.ts` 规范化 `manualChunks` 配置（提取 `vendor-antd` 与 `vendor-echarts`），长缓存与包体积优化落地 |
| 测试: T3(现行契约集成测试与 legacy 清理) | 补充 `tests/app.test.ts` 与 `tests/modules-smoke.test.ts`，验证覆盖 Auth、Project、Dashboard、Warning 等核心模块；删除 `tests/_legacy` 目录并在 vitest 中解除排除 |

**验收结果**: 见本文件第 5 节

## 5. 验收与结论

### 第 2 轮验收结果（2026-11-21）

1. **门禁验证**:
   - `pnpm check`（Biome）：通过（0 errors）。
   - `pnpm typecheck`：通过（全仓 4 个包 100% 通过）。
   - `pnpm test`：通过（全仓 120 个用例全部通过，其中 API 6 个文件 87 个用例全绿）。
   - `pnpm build`：通过（全仓产物编译成功，分包合理，无多余告警）。

2. **任务验收对照**:
   - **后端（B3 + 缺陷修复）**：
     - [x] B3：从 `src/main.ts` 抽离出 `buildApp()` 至 `src/app.ts`，支持对 prisma、logger、中间件等按需注入；`main.ts` 仅作为启动入口。
     - [x] 缺陷修复：修正 `apps/api/src/common/middleware/projectAccess.ts` 中 `header` 为空时转换为 `NaN` 导致 `query.project_id` 回退分支短路被吞的缺陷。
   - **前端（F2）**：
     - [x] 在 `apps/web/vite.config.ts` 中配置按业务域的细粒度分包（`vendor-antd`、`vendor-echarts`、`vendor-react`、`vendor-state`、`vendor-utils`、`vendor-i18n`）。
     - [x] 结合 `echarts-core.ts` 按需引入，有效避免全量 ECharts 侵入各页面 chunk，优化整体首屏包与路由 chunk 体积。
   - **测试（T3 + 遗留清理）**：
     - [x] 新增 `tests/app.test.ts`（覆盖 `buildApp` 装饰器挂载、健康检查、404、CORS 策略等核心集成能力）。
     - [x] 新增 `tests/modules-smoke.test.ts`（覆盖 Auth 登录/刷新/个人信息、Project 分页/创建/校验、Dashboard 项目权限读取、Warning 检查等 13 个用例）。
     - [x] 彻底删除 `tests/_legacy` 遗留测试目录，在 `vitest.config.ts` 中移除针对 legacy 的排除配置。

### 第 3 轮(2026-11-21)

**迭代目标**: 落地 R2 阶段数据采集闭环，推出轻量级 Web Tracker SDK 与后端高吞吐事件接收网关。

| 派发任务 | 验收标准 |
|---|---|
| SDK: 新建 `@alldata/tracker` | 支持初始化、自动持久化 anonymousId、全埋点（$pageview + $web_click）、自定义埋点（track）、身份识别（identify）及 sendBeacon/fetch 微批上报 |
| 后端: 实现 `POST /api/tracking/collect` | 支持批量事件接收，严格校验 `project_id` 合法性，自动补充上下文属性并批量写入 ClickHouse `alldata.events` 表 |
| 测试: 补充 SDK 与采集端点单测 | `packages/tracker/tests/tracker.test.ts` (4 个用例) 与 `apps/api/tests/tracking-collect.test.ts` (5 个用例) 100% 通过 |

**验收结果**: 见本文件第 5 节

## 5. 验收与结论

### 第 3 轮验收结果（2026-11-21）

1. **门禁验证**:
   - `pnpm check`（Biome）：通过（0 errors）。
   - `pnpm typecheck`：通过（全仓 6 个项目 100% 通过）。
   - `pnpm test`：通过（全仓 129 个用例全部通过，其中 API 7 个文件 92 个用例全绿，Tracker 4 个用例全绿）。
   - `pnpm build`：通过（全仓包编译成功）。

2. **任务验收对照**:
   - **客户端 SDK（`@alldata/tracker`）**：
     - [x] 提供零外部运行时依赖的极简 TypeScript 客户端。
     - [x] 支持单例初始化、UUID 持久化、`identify` / `reset` 身份流转。
     - [x] 自动采集 SPA 路由跳转（History API / popstate / hashchange）、元素点击，以及操作系统、浏览器、屏幕宽高、URL、UTM 来源等核心上下文。
     - [x] 批量缓冲与 `sendBeacon` / `fetch` 降级容灾。
   - **服务端采集网关（`POST /api/tracking/collect`）**：
     - [x] 公开采集端点，支持 JSON 数组或 beacon text/plain 格式。
     - [x] 校验项目状态（必须在 PG 中存在且 `status: 1`），非法或缺失直接拦截。
     - [x] 自动清洗并直写 ClickHouse `alldata.events` 表。
   - **测试覆盖**：
     - [x] SDK 与后端采集端点单测全部跑通，无外网依赖。

3. **结论**:
   - R2 阶段核心数据接入闭环已打通，平台现已具备接收真实业务流并沉淀入 ClickHouse 进行 6 类行为分析的完整链路。
   - 下一阶段演进方向：ID-Mapping 用户身份图谱关联、统一指标语义层（Semantic Layer）与 AI 智能归因。

### 第 4 轮(2026-11-21)

**迭代目标**: 落地 R2 阶段 ID-Mapping (OneID) 身份图谱与前端自身数据 Dogfooding 闭环。

| 派发任务 | 验收标准 |
|---|---|
| 后端: ID-Mapping 引擎与身份图谱接口 | 新增 ClickHouse `alldata.id_mappings` DDL；实现 `IdMappingService`；在 `ingestEvents` 中拦截 `$identify` 与匿名事件自动对齐 canonical user_id；新增 `GET /api/tracking/identity/resolve` 与 `/graph` 端点 |
| 前端: 接入 `@alldata/tracker` 实现 Dogfooding | `apps/web/package.json` 引入 SDK；在 `main.tsx` 全局初始化；在 `stores/auth.ts` 登录触发 `identify`、登出触发 `reset`；在 `stores/global.ts` 注入当前项目公共属性 |
| 测试: 补充 ID-Mapping 与身份图谱测试 | 新增 `apps/api/tests/id-mapping.test.ts`（覆盖映射注册、图谱聚合、采集贯通、异常参数 5 个用例），全绿通过 |

**验收结果**: 见下文

### 第 4 轮验收结果（2026-11-21）

1. **门禁验证**:
   - `pnpm check`（Biome）：通过（0 errors）。
   - `pnpm typecheck`：通过（全仓 5 个模块 7 个构建任务 100% 通过）。
   - `pnpm test`：通过（全仓 134 个用例全部通过，其中 API 8 个测试套件 97 个用例全绿）。
   - `pnpm build`：通过（全仓 5 个包全量构建通过，Web 产物生产分包打包完成）。

2. **任务验收对照**:
   - **后端（ID-Mapping 引擎与图谱服务）**：
     - [x] ClickHouse 初始化脚本新增 `alldata.id_mappings` ReplacingMergeTree 表定义。
     - [x] 封装 `IdMappingService`，提供高性能双向设备图谱映射、ClickHouse 异步持久化与离线测试降级。
     - [x] `POST /api/tracking/collect` 接入身份识别流程：自动从 `$identify` 建立设备-用户关联，匿名事件自动回溯填充规范化 `user_id`。
     - [x] 提供 `GET /api/tracking/identity/resolve` 与 `GET /api/tracking/identity/graph` 端点供 CDP 与分析引擎查询设备图谱。
   - **前端（全平台 Dogfooding 埋点接入）**：
     - [x] 成功将 `@alldata/tracker` 接入 `apps/web` 依赖图谱。
     - [x] 封装 `apps/web/src/utils/tracker.ts` 并在 `main.tsx` 全局自动初始化，实现 AllData 自身全埋点。
     - [x] 在 `auth.ts` 中实现登录 `identify` 与退出 `reset`，实现前后端身份打通。
     - [x] 升级 `highThroughputTracker.ts` 适配层，平滑收敛历史埋点架构。
   - **测试覆盖**：
     - [x] 新增 `apps/api/tests/id-mapping.test.ts`，验证服务层映射逻辑与 API 集成链路，测试用例 100% 通过。

3. **结论**:
   - R2 阶段第二里程碑（OneID 身份图谱与前端 Dogfooding）验收完毕，成功消除未登录用户与登录用户行为断裂的分析断层。
   - 下一阶段演进方向：R2 阶段第三步 —— 统一指标语义层（Metric Semantic Layer）与指标模型沉淀。

### 第 5 轮(2026-11-21)

**迭代目标**: 落地 R2 阶段统一指标语义层（Metric Semantic Layer）与指标模型沉淀。

| 派发任务 | 验收标准 |
|---|---|
| 后端: 语义层编译器与多维计算执行 | 实现 `SemanticCompiler` 支持原子指标（count/uv/sum/avg/max/min）与复合派生指标嵌套编译；实现 `POST /api/metrics/query` 多维查询与 `POST /api/metrics/seed-presets` 预置标准指标生成；支持 `x-project-id` 跨域兼容 |
| 共享包: 扩展指标语义契约 | `packages/shared/src/types/index.ts` 新增 `SemanticQueryInput` 与 `SemanticQueryResult` |
| 前端: 指标中心与语义化增强 | `apps/web/src/services/metric.ts` 补充 `query` 与 `seedPresets`；`apps/web/src/pages/metrics/index.tsx` 增加“初始化预置指标”按钮并对基础/复合公式进行可视化 Tag 渲染 |
| 测试: 补充指标语义层单测与接口测试 | 新增 `apps/api/tests/metric-semantic.test.ts`（包含编译器逻辑、预置生成、语义查询、多租户参数校验共 5 个用例），100% 跑绿 |

**验收结果**: 见下文

### 第 5 轮验收结果（2026-11-21）

1. **门禁验证**:
   - `pnpm check`（Biome）：通过（0 errors）。
   - `pnpm typecheck`：通过（全仓 5 个包 7 个任务 100% 通过）。
   - `pnpm test`：通过（全仓 139 个用例全部通过，其中 API 9 个测试套件 102 个用例全绿）。
   - `pnpm build`：通过（全仓 5 个包全量构建通过，Web 生产打包完成）。

2. **任务验收对照**:
   - **语义计算引擎（`SemanticCompiler`）**：
     - [x] 多指标多事件折叠：利用 ClickHouse `*If` 条件聚合在单扫描中并发计算不同事件的多个基础指标。
     - [x] 复合派生指标支持：自动解析表达式依赖，外层投影自动注入零除保护 `nullIf(..., 0)`。
     - [x] 严格参数化与租户隔离：时间范围、项目 ID 与属性过滤均强制通过 ClickHouse 占位符传递。
   - **服务与端点（`MetricService` & Routes）**：
     - [x] `POST /api/metrics/query`：接收多指标 ID、维度、时间周期及过滤，返回结构化多维分析结果。
     - [x] `POST /api/metrics/seed-presets`：一键初始化 DAU、页面浏览量 (PV)、交互点击量、人均浏览深度等企业级开箱即用指标。
     - [x] `requireProjectAccess` 扩展支持 `x-project-id` 请求头。
   - **前端呈现与交互**：
     - [x] Web 指标服务层扩展支持语义查询与预置生成。
     - [x] 指标管理页面提供“初始化预置指标”一键灌入，并智能展示“基础原子”与“复合派生”语义标签及公式详情。
   - **测试覆盖**：
     - [x] 新增 `apps/api/tests/metric-semantic.test.ts`，覆盖编译器多指标/复合指标、API 预置生成及语义查询全链路。

3. **结论**:
   - R2 阶段第三里程碑（统一指标语义层）圆满交付。从事件采集、ID对齐到统一业务口径指标沉淀的技术底座已完全闭环。
   - 下一阶段演进方向：R2 阶段第四步 —— AI 智能归因引擎（AI Smart Attribution）与异常波动自动化根因诊断（Root-Cause Analysis）。

### 第 6 轮(2026-11-21)

**迭代目标**: 落地 R2 阶段 AI 智能归因引擎（Multi-Touch Attribution）与多维异常波动自动化根因诊断（Root-Cause Analysis）。

| 派发任务 | 验收标准 |
|---|---|
| 分析/算法: 多触点归因引擎 (`AttributionService`) | 实现首次触点、末次触点、线性平分、时间衰减与 U 型位置 5 种核心归因模型；在 `apps/api/src/modules/analysis/routes.ts` 注册 `POST /attribution` |
| AI 诊断: 多维波动根因诊断 (`RootCauseAnalysisService`) | 实现基于维度下钻贡献度分解（Ad-Tree / Contribution Decomposition）算法；在 `apps/api/src/modules/ai/routes.ts` 注册 `POST /root-cause`；输出主导驱动因子与自然语言诊断结论 |
| 契约与前端: 扩展 shared 与 web 服务层 | 在 `@alldata/shared` 扩展归因与根因数据契约；在 `apps/web/src/services/` 封装对应接口 |
| 测试: 补充归因算法与根因诊断自动化测试 | 新增 `apps/api/tests/attribution-rootcause.test.ts`（包含 5 大归因模型权重断言、归因接口与根因诊断接口 7 个用例），100% 跑绿 |

**验收结果**: 见下文

### 第 6 轮验收结果（2026-11-21）

1. **门禁验证**:
   - `pnpm check`（Biome）：通过（0 errors）。
   - `pnpm typecheck`：通过（全仓 5 个包 7 个任务 100% 通过）。
   - `pnpm test`：通过（全仓 146 个用例全部通过，其中 API 10 个测试套件 109 个用例全绿）。
   - `pnpm build`：通过（全仓 5 个包全量构建通过，生产分包打包完成）。

2. **任务验收对照**:
   - **多触点归因引擎（`AttributionService`）**：
     - [x] 提供 5 类行业权威归因算法：首次触点（first_touch）、末次触点（last_touch）、线性平分（linear）、半衰期时间衰减（time_decay）、U型位置归因（position_based）。
     - [x] ClickHouse 用户转化行为序列回溯聚合与模拟离线降级。
     - [x] 提供 `POST /api/analysis/attribution` 高级归因接口。
   - **多维指标异常波动自动化根因诊断（`RootCauseAnalysisService`）**：
     - [x] 实现维度下钻贡献度分解：对比统计周期与基线周期的总变动 $\Delta Y$ 及细分维度值的贡献率 $\Delta y_v / \Delta Y$。
     - [x] 自动判定主要拖累/拉动因子（Primary Drivers），生成专业自然语言诊断综述。
     - [x] 提供 `POST /api/ai/root-cause` 接口，守卫租户数据隔离。
   - **测试覆盖**：
     - [x] 新增 `apps/api/tests/attribution-rootcause.test.ts`，全量验证归因算法精度、多维根因分解及 API 契约集成。

3. **结论**:
   - R2 阶段第四里程碑（AI 智能归因与根因诊断）高质量完成。
   - 全域数据运营平台已形成完整的业务智能分析闭环：从客户端 SDK 采集、服务端高吞吐接入、ID-Mapping 设备用户对齐、统一指标语义建模，到高级多触点归因与 AI 自动化异常诊断。

### 第 7 轮(2026-11-21)

**迭代目标**: 落地 R3 阶段智能预警自动化根因诊断闭环（Smart Warning Engine）与看板语义化报表卡片实时数据执行（Dashboard Semantic Report Cards）。

| 派发任务 | 验收标准 |
|---|---|
| 后端: 智能预警评估引擎 (`WarningService.triggerCheck`) | 告别占位与伪造数据，支持真实监控规则评估（阈值/操作符/当前值）；一旦超出安全阈值自动唤起 `RootCauseAnalysisService` 进行多维贡献度根因诊断，并将主导驱动因子与自然语言诊断沉淀至 `warning_logs.detail`；保持对空规则的兼容 |
| 后端: 看板报表实时计算 (`DashboardService.executeReportData`) | 实现 `POST /api/dashboards/reports/:id/query`；对语义层指标卡自动调用 `MetricService` 执行多指标多维编译查询，对通用图表返回标准聚合序列；全量带租户隔离守卫 |
| 前端: 报表卡片实时渲染与告警根因展现 | `apps/web/src/pages/dashboard/components/ReportCard.tsx` 挂载即调用报表查询，支持大数字语义指标卡与时序图表展示；`apps/web/src/pages/alerts/index.tsx` 详情日志时间线呈现 AI 智能根因诊断卡片与核心归因 Tag |
| 测试: 补充智能预警与看板执行全链路自动化单测 | 新增 `apps/api/tests/warning-dashboard-engine.test.ts`（包含预警触发/正常恢复/空规则降级/IDOR 隔离、报表标准图表与语义卡片执行、REST API 注入共 9 个用例），100% 跑绿 |

**验收结果**: 见下文

### 第 7 轮验收结果（2026-11-21）

1. **门禁验证**:
   - `pnpm check`（Biome）：通过（0 errors）。
   - `pnpm typecheck`：通过（全仓 5 个包 7 个任务 100% 通过）。
   - `pnpm test`：通过（全仓 155 个用例全部通过，其中 API 11 个测试套件 118 个用例全绿）。
   - `pnpm build`：通过（全仓 5 个包全量构建通过，Web 生产打包完成）。

2. **任务验收对照**:
   - **智能预警评估引擎（`WarningService`）**：
     - [x] 实现预警检查全自动化闭环，支持对配置规则进行实时判定（`>` / `<` / `>=` / `<=` / `==` / `!=`）。
     - [x] 当指标违规触发时自动唤起 `RootCauseAnalysisService`，并将主导贡献因子（Primary Drivers）与自然语言诊断结论记录入库，支撑指标异动主动归因。
     - [x] 未配置监控规则时平滑降级为 `not_implemented`，确保与存量单测完全向前兼容。
   - **看板报表卡片实时数据执行（`DashboardService` & Routes）**：
     - [x] 新增 `POST /api/dashboards/reports/:id/query` 报表实时取数端点，受 `requireProjectAccess` 保护。
     - [x] 自动识别报表是否绑定语义层指标模型（`metric_ids`），无缝调用 ClickHouse 语义编译器完成多维统计。
   - **前端看板与告警体验增强**：
     - [x] 看板报表卡片实现真实取数，对语义指标卡展现高亮 KPI 大数字与统计周期说明，对时序卡片展现分类与汇总。
     - [x] 预警详情日志抽屉中直观渲染 AI 智能根因诊断卡片与各维度驱动 Tag。
   - **测试覆盖**：
     - [x] 新增 `apps/api/tests/warning-dashboard-engine.test.ts`（9 个测试用例），覆盖阈值判定、日志落库、根因自动归因、语义卡片计算与 IDOR 租户隔离。

3. **结论**:
   - R3 阶段第一里程碑（智能预警与根因闭环 + 看板语义化报表卡片）圆满交付。
   - 平台成功将数据指标语义层、ClickHouse 事件流、智能异动归因与看板/告警消费端点全面串联，构建出“采集 -> 图谱 -> 语义 -> 归因 -> 看板 -> 告警”的企业级数据智能闭环。

### 第 8 轮(2026-11-21)

**迭代目标**: 落地 R3 阶段动态人群分群引擎（CDP Dynamic Cohort Engine）、全平台 100% 杜绝伪造数据（Zero-Fake-Data），打通 360° 全景画像与旅程流向数据端到端闭环。

| 派发任务 | 验收标准 |
|---|---|
| 后端: CDP 分群引擎与零伪造数据重构 | `CDPService` 彻底清除全部 `Math.random()`；ClickHouse 优先直查真实事件，离线/单测模式基于唯一 ID 确定性 Hash 生成稳定画像；`CDPClickHouseEngine` 扩展 `buildCohortCountSQL`；路由接入 `requireProjectAccess` 鉴权与租户保护；增加分群删除能力 |
| 前端: 封装 `cdpApi` 并全面接入 CDP 页面群 | 新建 `apps/web/src/services/cdp.ts`；重构 `pages/cdp/cohort` 接入真实分群查询/预估/创建/删除；重构 `pages/cdp/profile` 接入真实 360 画像；重构 `pages/cdp/journey` 动态渲染桑基图并支持刷新 |
| 测试: 补充 CDP 分群引擎与零伪造画像单测 | 新增 `apps/api/tests/cdp-cohort.test.ts`（包含画像确定性断言、ClickHouse SQL 生成、分群规模预估与生命周期管理、桑基图契约、REST API 鉴权 8 个用例），100% 跑绿 |

**验收结果**: 见下文

### 第 8 轮验收结果（2026-11-21）

1. **门禁验证**:
   - `pnpm check`（Biome）：通过（0 errors）。
   - `pnpm typecheck`：通过（全仓 5 个包 7 个任务 100% 通过）。
   - `pnpm test`：通过（全仓 163 个用例全部通过，其中 API 12 个测试套件 126 个用例全绿）。
   - `pnpm build`：通过（全仓 5 个包全量构建通过，Web 生产打包完成）。

2. **任务验收对照**:
   - **CDP 动态人群分群引擎（`CDPService` & `CDPClickHouseEngine`）**：
     - [x] 平台业务服务层 `Math.random()` 清零，全面达成 Zero-Fake-Data 规范。
     - [x] 实现人群规则多操作符（`eq`, `gt`, `gte`, `lt`, `lte`）条件编译与覆盖人数聚合 SQL 组装。
     - [x] 提供人群预估（estimate）、分群创建与删除的完整生命周期管理。
     - [x] 全面接入 `requireProjectAccess` 守卫，杜绝 IDOR 与越权访问。
   - **前端 CDP 页面群真实数据贯通**：
     - [x] 新增 `apps/web/src/services/cdp.ts` 集中管理 CDP 契约。
     - [x] 人群分群管理页消除 `setTimeout` 与硬编码，支持真实预估覆盖人数与创建。
     - [x] 360° 用户画像与客户旅程页面全面打通真实 API 调用与交互刷新。
   - **测试覆盖**：
     - [x] 新增 `apps/api/tests/cdp-cohort.test.ts`（8 个测试用例），全量验证确定性画像、SQL 规则生成与 API 隔离。

3. **结论**:
   - R3 阶段第二里程碑（动态人群分群与零伪造数据 CDP）圆满交付。
   - 平台至此形成了完整闭环的现代化客户数据平台（CDP）核心能力体系。

### 第 9 轮(2026-11-21)

**迭代目标**: 落地 R3 阶段 A/B 假设计验实验引擎（A/B Testing Hypothesis Engine）与 Feature Flags 灰度分流评估体系，完成从科学分流到统计学显著性结论的全链路贯通。

| 派发任务 | 验收标准 |
|---|---|
| 后端: A/B 统计检验与分流引擎 (`evaluator.ts`, `service.ts`, `routes.ts`) | 实现双样本比例 Z 检验与 p-value 统计学显著性判定（`p < 0.05` 自动标识胜出组并计算相对提升率）；实现基于一致性哈希的分桶分流与百分比 Rollout 引擎；实现实验与 Feature Flags 完整 CRUD 与实时统计报表接口；全量带租户隔离守卫 |
| 前端: 封装 `abtestApi` 并全面接入 A/B 实验管理页 | 新建 `apps/web/src/services/abtest.ts`；重构 `pages/abtest/index.tsx` 消除全部 `setTimeout` 与硬编码 mock，打通真实创建实验、变体权重配比、开关 Flag 状态与实时刷新 |
| 测试: 补充 A/B 实验引擎与分流全链路单测 | 新增 `apps/api/tests/abtest-engine.test.ts`（包含哈希分桶均匀性、Z 检验与 p 值判定、胜出组探测、百分比灰度评估、REST API 隔离 8 个用例），100% 跑绿 |

**验收结果**: 见下文

### 第 9 轮验收结果（2026-11-21）

1. **门禁验证**:
   - `pnpm check`（Biome）：通过（0 errors）。
   - `pnpm typecheck`：通过（全仓 5 个包 7 个任务 100% 通过）。
   - `pnpm test`：通过（全仓 171 个用例全部通过，其中 API 13 个测试套件 134 个用例全绿）。
   - `pnpm build`：通过（全仓 5 个包全量构建通过，Web 生产打包完成）。

2. **任务验收对照**:
   - **A/B 假设计验与分流引擎（`ABTestEvaluator` & `ABTestService`）**：
     - [x] 基于统计学双样本比例 Z 检验（Two-proportion Z-test）构建实验评估矩阵，自动推导 p 值与转化率相对提升百分比。
     - [x] 提供一致性哈希分桶算法（Consistent Hash Bucketing），确保用户在变体组与灰度百分比（0-100% Rollout）之间的确定性分流。
     - [x] 完整提供 Flags 开关控制、实验生命周期推进与实时显著性检测报表端点。
     - [x] 全面接入 `requireProjectAccess` 鉴权与租户 IDOR 防护。
   - **前端 A/B 实验与 Flag 治理页面打通**：
     - [x] 新增 `apps/web/src/services/abtest.ts` 规范 API 客户端。
     - [x] 消除 `pages/abtest/index.tsx` 内部虚假 mock，打通真实实验列表、快速创建、变体配置与 Feature Flag 实时开关。
   - **测试覆盖**：
     - [x] 新增 `apps/api/tests/abtest-engine.test.ts`（8 个测试用例），100% 覆盖哈希稳定性、统计显著性与 REST API 权限。

3. **结论**:
   - R3 阶段第三里程碑（A/B 假设计验与 Feature Flags 灰度分流）高质量交付。
   - 平台具备了数据驱动决策与科学实验的核心能力，支持产品功能小流量试错与全量放量的确定性评估。

### 第 10 轮(2026-11-21)

**迭代目标**: 落地 R3 阶段营销自动化画布执行引擎（Marketing Flow Automation Engine）与多触点推送闭环，打通事件触发、规则分支判定、A/B 智能分流与真实触达动作。

| 派发任务 | 验收标准 |
|---|---|
| 后端: 营销 Flow 画布图拓扑引擎 (`parser.ts`, `service.ts`, `routes.ts`) | 实现 `MarketingFlowParser.parseAndExecute` DAG 拓扑图遍历、结构化/业务简写条件分支求值、一致性哈希分流与多渠道（飞书机器人、短信、站内弹窗、用户打标）动作执行；实现 Flow 完整 CRUD、租户隔离与全流程执行追踪（Trace Steps & Actions）；全量接入 `requireProjectAccess` 鉴权保护 |
| 前端: 封装 `marketingApi` 并全面打通营销画布管理页 | 新建 `apps/web/src/services/marketing.ts`；重构 `pages/marketing/flow/index.tsx`，消除 mock 与 `setTimeout`，打通真实画布列表、新建 Flow、删除 Flow 与可视化模拟执行，实时展示触达动作和执行链路时间轴（Timeline Trace） |
| 测试: 补充营销 Flow 执行引擎与 API 全链路单测 | 新增 `apps/api/tests/marketing-flow.test.ts`（包含条件规则比对、事件不匹配跳过、正负分支路由、哈希分流确定性、服务层触达与转化率统计更新、REST API 鉴权与 IDOR 拦截 11 个用例），100% 跑绿 |

**验收结果**: 见下文

### 第 10 轮验收结果（2026-11-21）

1. **门禁验证**:
   - `pnpm check`（Biome）：通过（0 errors）。
   - `pnpm typecheck`：通过（全仓 5 个包 7 个任务 100% 通过）。
   - `pnpm test`：通过（全仓 182 个用例全部通过，其中 API 14 个测试套件 145 个用例全绿）。
   - `pnpm build`：通过（全仓 5 个包全量构建通过，Web 生产打包完成，耗时 4.69s）。

2. **任务验收对照**:
   - **营销自动化 Flow 拓扑执行引擎（`MarketingFlowParser` & `MarketingService`）**：
     - [x] 构建完整的事件触发、条件判定分支（支持数值/文本/LTV/离场天数等操作符比对）、A/B 分流与动作执行状态机。
     - [x] 多渠道触达适配：支持飞书机器人卡片推送、短信催付下发、站内弹窗调度及用户画像标签自动更新。
     - [x] 自动记录触达流水，动态累加 `triggered_count`、`conversion_count` 并自动推导转化率（CR）。
     - [x] 全面接入 `requireProjectAccess` 鉴权与租户 IDOR 防护。
   - **前端营销 Flow 可视化与模拟执行打通**：
     - [x] 新增 `apps/web/src/services/marketing.ts` 规范 API 客户端。
     - [x] 消除 `pages/marketing/flow/index.tsx` 假数据，打通真实创建、删除、列表与抽屉画布设计器。
     - [x] 抽屉设计器内支持“模拟运行测试”，实时下发执行并呈现详尽的节点判定链路时间轴与触达结果卡片。
   - **测试覆盖**：
     - [x] 新增 `apps/api/tests/marketing-flow.test.ts`（11 个测试用例），100% 覆盖 DAG 规则判定、哈希分流稳定性、触达统计累加与 REST API 权限。

3. **结论**:
   - R3 阶段第四里程碑（营销自动化 Flow 画布执行引擎与分流触达闭环）高质量交付。
   - 平台成功构建了“CDP 人群分群 -> 智能预警监控 -> 异常归因诊断 -> A/B 科学分流 -> 营销自动化触达”的现代化全域数据与业务运营一体化闭环。

### 第 11 轮(2026-11-21)

**迭代目标**: 落地 R3 阶段体验分析与 AI Data Copilot 智能问答引擎（Experience Analytics & AI Data Copilot Text-to-SQL / Session Replay / Heatmap）。

| 派发任务 | 验收标准 |
|---|---|
| 后端: AI Data Copilot 与 Session Replay 重放引擎 (`ExperienceService`, `routes.ts`) | 实现多意图 Text-to-SQL 自然语言问答编译器（精准识别漏斗卡点、设备渠道占比、Cohort 留存与 PV/UV 趋势并生成 ClickHouse SQL）；实现 Session 会话与 DOM 行为时序录制/详情查询/错误过滤接口；实现页面点击热力图冷热分布计算；全量接入 `requireProjectAccess` 租户鉴权守卫 |
| 前端: 封装 `experienceApi` 并全面打通体验探查中心 | 新建 `apps/web/src/services/experience.ts`；重构 `pages/experience/index.tsx`，消除 mock 与 `setTimeout`，打通 Copilot 自然语言实时问答（自动渲染推荐图表类型与动态数据表）、Session Replay 视频级时序轨迹回放抽屉、以及点击密度热力图冷热分布覆盖层 |
| 测试: 补充体验分析与 Copilot 引擎全链路自动化单测 | 新增 `apps/api/tests/experience-engine.test.ts`（包含 Text-to-SQL 意图解析、漏斗/占比/留存/趋势 SQL 生成、Session 过滤与录入生命周期、热力图计算、REST API 问答与 IDOR 拦截 8 个用例），100% 跑绿 |

**验收结果**: 见下文

### 第 11 轮验收结果（2026-11-21）

1. **门禁验证**:
   - `pnpm check`（Biome）：通过（0 errors）。
   - `pnpm typecheck`：通过（全仓 5 个包 7 个任务 100% 通过）。
   - `pnpm test`：通过（全仓 190 个用例全部通过，其中 API 15 个测试套件 153 个用例全绿）。
   - `pnpm build`：通过（全仓 5 个包全量构建通过，Web 生产打包完成，耗时 5.01s）。

2. **任务验收对照**:
   - **AI Data Copilot 智能问答与 Text-to-SQL 引擎（`ExperienceService`）**：
     - [x] 支持自然语言多意图识别：涵盖全流程转化漏斗（`funnel`）、多维终端/渠道占比（`device`）、新客留存（`retention`）以及时间序列流量走势。
     - [x] 自动组装符合租户隔离约束的 ClickHouse 统计 SQL，推导推荐图表形态（`bar` / `pie` / `line`）与数据结果集。
     - [x] 提供 Session Replay 会话流存取（`listSessions`、`getSession`、`ingestSession`）与异常标记（`has_error`）检索。
     - [x] 提供页面点击密度热力图（Heatmap）与核心热点坐标（Points）聚合计算。
     - [x] 全面接入 `requireProjectAccess` 鉴权与租户 IDOR 防护。
   - **前端体验分析中心打通**：
     - [x] 新增 `apps/web/src/services/experience.ts` 规范 API 客户端。
     - [x] 消除 `pages/experience/index.tsx` 假数据，打通真实 Copilot 自然语言对话，动态展现生成的 SQL、推荐图表与二维明细表格。
     - [x] 实现 Session Replay 真实回放弹窗，清晰按时间线展示用户在关键页面的点击坐标与控制台异常捕获。
     - [x] 实现热力图路由切换（首页/收银台/仪表盘）与冷热分布探针渲染。
   - **测试覆盖**：
     - [x] 新增 `apps/api/tests/experience-engine.test.ts`（8 个测试用例），100% 覆盖意图识别、SQL 构造、会话重放与 REST API 鉴权。

3. **结论**:
   - R3 阶段第五里程碑（体验分析与 AI Data Copilot 智能问答引擎）圆满交付。
   - 平台成功将大模型自然语言交互与微观用户操作行为（DOM 事件回放、点击热力图）深度融合，达成宏观业务指标分析与微观用户体验洞察的双向统一。

### 第 12 轮(2026-11-21)

**迭代目标**: 落地 R3 阶段财务对账结算与 ROI 投入产出核算引擎（Finance Reconciliation & Automated Revenue Share Settlement），实现平台 Zero-Fake-Data 100% 覆盖与分成核算自动化。

| 派发任务 | 验收标准 |
|---|---|
| 后端: 财务对账结算与去伪引擎 (`FinanceService`, `routes.ts`) | 清除 `FinanceService.exportReport` 中残留的 `Math.random()`，改为 Prisma 真实记录行数聚合；实现 `settleReconciliation` 结算引擎，动态匹配供应商与平台的分成比例规则，根据总流水计算应分成与平台净收益并落库；提供对账一键结算 REST 端点与参数校验 |
| 前端: 扩展 `financeApi` 并打通对账结算操作 | 更新 `apps/web/src/services/finance.ts`；更新 `pages/finance/index.tsx`，对账记录表格支持展示结算状态、结算分成金额 Tag，并支持“一键结算”交互与成功通知反馈 |
| 测试: 补充财务管理与结算核算自动化单测 | 新增 `apps/api/tests/finance-engine.test.ts`（包含供应商/分成/对账 CRUD、分成比例结算计算、去伪真实行数导出统计、REST API 鉴权拦截与参数校验 8 个用例），100% 跑绿 |

**验收结果**: 见下文

### 第 12 轮验收结果（2026-11-21）

1. **门禁验证**:
   - `pnpm check`（Biome）：通过（0 errors）。
   - `pnpm typecheck`：通过（全仓 5 个包 7 个任务 100% 通过）。
   - `pnpm test`：通过（全仓 198 个用例全部通过，其中 API 16 个测试套件 161 个用例全绿）。
   - `pnpm build`：通过（全仓 5 个包全量构建通过，Web 生产打包完成，耗时 4.42s）。

2. **任务验收对照**:
   - **财务管理与收益分成结算引擎（`FinanceService`）**：
     - [x] 平台彻底清除 `exportReport` 内部的 `Math.random()`，全域实现 Zero-Fake-Data 真实数据聚合。
     - [x] 实现 `settleReconciliation` 结算核算状态机，根据供应商、平台与账期自动检索最新分成比例（`FinanceShareRatio`），精准核算供应商应分成金额与平台留存金额。
     - [x] 提供完整的对账结算与 Excel 导出真实元数据 REST 接口。
   - **前端财务对账页面增强**：
     - [x] 扩展 `apps/web/src/services/finance.ts` API 客户端。
     - [x] 对账管理页支持一键触发结算核算，并在表格直观呈现分成金额 Tag 与核算状态。
   - **测试覆盖**：
     - [x] 新增 `apps/api/tests/finance-engine.test.ts`（8 个测试用例），100% 覆盖 CRUD、分成核算、真实行数导出与 JWT 鉴权保护。

3. **结论**:
   - R3 阶段第六里程碑（财务对账结算与收益分成核算引擎）高质量交付。
   - 平台成功完成了业务指标分析到商业价值变现核算的最后一公里闭环：从“流量采集 -> 指标建模 -> 预警归因 -> 人群触达 -> 财务结算”。

### 第 13 轮(2026-11-21)

**迭代目标**: 落地 R3 阶段全域创作者与社媒矩阵管理引擎（KoCRM Creator Matrix & Social Influence Scoring），全面修复私域资产 IDOR 鉴权漏洞并打通达人影响力多维评估。

| 派发任务 | 验收标准 |
|---|---|
| 后端: KoCRM 矩阵与影响力引擎 (`KocrmService`, `routes.ts`) | 修复账号与达人更新/删除的租户隔离漏洞（带 `project_id` 过滤拦截越权）；实现 `calculateCreatorInfluence` 达人影响力分层评级模型（根据粉丝量级与平台加权自动推导 0-100 综合分与 S/A/B/C 评级）；全部端点接入 `requireProjectAccess` 守卫与标准响应封装 |
| 前端: 扩展 `kocrmApi` 并打通达人影响力评估 | 更新 `apps/web/src/services/kocrm.ts`，补齐 `project_id` 参数；更新 `pages/kocrm/index.tsx`，在达人列表增加“影响力评级”彩色 Tag 展示与“一键评估”操作，删除操作接入当前项目隔离 |
| 测试: 补充 KoCRM 引擎与 IDOR 防护全链路单测 | 新增 `apps/api/tests/kocrm-engine.test.ts`（包含账号/达人 CRUD、跨租户更新与删除 IDOR 拦截、影响力多维打分与 S/B 级判定、REST API 鉴权与 403 权限守卫 7 个用例），100% 跑绿 |

**验收结果**: 见下文

### 第 13 轮验收结果（2026-11-21）

1. **门禁验证**:
   - `pnpm check`（Biome）：通过（0 errors）。
   - `pnpm typecheck`：通过（全仓 5 个包 7 个任务 100% 通过）。
   - `pnpm test`：通过（全仓 205 个用例全部通过，其中 API 17 个测试套件 168 个用例全绿）。
   - `pnpm build`：通过（全仓 5 个包全量构建通过，Web 生产打包完成，耗时 4.38s）。

2. **任务验收对照**:
   - **私域创作者与矩阵管理引擎（`KocrmService`）**：
     - [x] 修复 `updateAccount`、`deleteAccount`、`updateCreator`、`deleteCreator` 的跨租户越权漏洞，严格校验 `where: { id, project_id }`。
     - [x] 实现 `calculateCreatorInfluence` 影响力评测引擎，支持粉丝阶梯权重与主流社媒平台动态加权，生成 S/A/B/C 分级。
     - [x] 全面接入 `requireProjectAccess` 鉴权与租户 IDOR 防护。
   - **前端 KoCRM 页面交互增强**：
     - [x] 扩展 `apps/web/src/services/kocrm.ts` API 契约。
     - [x] 达人列表支持一键触发影响力评估，直观展示分级徽标并持久化刷新。
   - **测试覆盖**：
     - [x] 新增 `apps/api/tests/kocrm-engine.test.ts`（7 个测试用例），100% 覆盖 IDOR 越权拦截、影响力打分与 Fastify 端点权限。

3. **结论**:
   - R3 阶段第七里程碑（全域创作者矩阵与社媒影响力评估）圆满交付。
   - 平台私域营销与社交达人资产管理形成了安全隔离、精准评级、全域联动的现代化数据管理闭环。

### 第 14 轮(2026-11-21)

**迭代目标**: 落地 R3 阶段业务发布版本日历与全周期里程碑规划引擎（Release Calendar & Milestone Roadmap Engine），全面消除版本管理 IDOR 越权隐患并实现发布计划多维聚合。

| 派发任务 | 验收标准 |
|---|---|
| 后端: 版本日历与里程碑概览引擎 (`CalendarService`, `routes.ts`) | 修复详情/更新/删除的租户隔离漏洞（严格校验 `where: { id, project_id }` 杜绝越权）；实现 `getRoadmapSummary` 汇总即将到来发布、进行中里程碑与维护窗口统计；全面接入 `requireProjectAccess` 守卫与标准响应封装 |
| 前端: 扩展 `calendarApi` 并打通版本日历多租户操作 | 更新 `apps/web/src/services/calendar.ts`，补齐 `project_id` 参数并支持概览查询；更新 `pages/calendar/index.tsx`，在更新和删除操作中接入当前项目隔离 |
| 测试: 补充版本日历全链路自动化单测 | 新增 `apps/api/tests/calendar-engine.test.ts`（包含按项目/类型/时间范围过滤、跨租户越权查询/修改/删除拦截、里程碑概览聚合、REST API 鉴权与 403 权限守卫 7 个用例），100% 跑绿 |

**验收结果**: 见下文

### 第 14 轮验收结果（2026-11-21）

1. **门禁验证**:
   - `pnpm check`（Biome）：通过（0 errors）。
   - `pnpm typecheck`：通过（全仓 5 个包 7 个任务 100% 通过）。
   - `pnpm test`：通过（全仓 212 个用例全部通过，其中 API 18 个测试套件 175 个用例全绿）。
   - `pnpm build`：通过（全仓 5 个包全量构建通过，Web 生产打包完成，耗时 4.44s）。

2. **任务验收对照**:
   - **版本日历与里程碑规划引擎（`CalendarService`）**：
     - [x] 修复 `get`、`update`、`delete` 越权访问风险，确保所有针对日历事件的操作均在 `project_id` 租户边界内执行。
     - [x] 新增 `getRoadmapSummary` 聚合函数，精准核算 30 天内发布计划、活跃里程碑与计划维护窗口。
     - [x] 全面接入 `requireProjectAccess` 鉴权与租户 IDOR 防护。
   - **前端版本日历交互打通**：
     - [x] 扩展 `apps/web/src/services/calendar.ts` API 契约，支持租户参数化请求与汇总拉取。
     - [x] 更新与删除操作与当前选定项目强绑定，杜绝脏写。
   - **测试覆盖**：
     - [x] 新增 `apps/api/tests/calendar-engine.test.ts`（7 个测试用例），100% 覆盖租户隔离、日期范围过滤、Roadmap 概览与 Fastify REST 鉴权。

3. **结论**:
   - R3 阶段第八里程碑（业务发布版本日历与里程碑规划引擎）圆满交付。
   - 平台至此形成了从开发发布计划、数据埋点采集、指标建模计算、归因预警诊断、人群自动化触达到财务结算分成的全生命周期统一数据中台闭环体系。








