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

3. **结论**:
   - 第 1 轮计划目标已全部完成，全仓基线稳固，代码已具备提交条件。
   - 下一轮可推进任务：B3（提取 `buildApp()` 集成测试工厂）及 F2（路由代码分割与产物体积进一步优化）。
