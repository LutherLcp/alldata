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
