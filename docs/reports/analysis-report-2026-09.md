# AllData 现状分析报告

> **报告日期**:2026-09-13
> **分析基线**:commit `b678575`(2026-08-02)+ 工作区 170 个未提交文件
> **分析范围**:产品定位、代码资产、架构、质量、安全、文档与流程

---

## 1. 项目概况

AllData 定位为**全域数据运营平台**(一站式行为分析、看板、用户洞察、埋点治理、智能预警),对标神策/GrowingIO 类产品,采用 pnpm + Turborepo 管理的全栈 TypeScript Monorepo。

### 1.1 客观数据

| 维度 | 数据 |
|------|------|
| 开发周期 | 2026-07-21 初始化 → 2026-08-02 V15.0,**12 天 28 个 commit**,此后 6 周无提交 |
| 前端 `apps/web` | React 18 + Vite 5 + Antd 5,约 12,400 行 / 69 个文件 / 25 个页面模块 |
| 后端 `apps/api` | Fastify 4 + Prisma 5,约 8,500 行 / 100 个文件 / **33 个业务模块** |
| Go 后端 `apps/api-go` | Gin + GORM 骨架,约 2,600 行 / 26 个文件 |
| 数据模型 | PostgreSQL 35 个模型(684 行 Prisma Schema)+ ClickHouse 4 个物化视图 |
| 测试资产 | 全仓仅 **6 个测试文件**(api 1 / web 1 / harness 4) |
| 未提交改动 | 170 个文件,+7,811 / -4,272 行(Biome 格式化迁移 + 缓存/限流/AI 性能加固) |
| CI | 存在 `.github/workflows/ci.yml` |

### 1.2 开发模式判断

从提交节奏(12 天 V1→V15)、根目录的 `gemini_brain_*.zip`、`brain/`、`.qoder/`、`docs-combined(1).txt` 等痕迹判断,本项目为**高强度 AI 辅助开发**产物。这解释了两个核心现象:

1. **广度异常**:25 个前端页面模块、33 个后端模块,远超人类团队 12 天的产出上限;
2. **深度不足**:33 个后端模块平均每模块约 260 行,多数为"骨架级"实现;6 个测试文件对比迭代计划书中"单测 80% / API 90%"的目标,覆盖率目标基本未落地。

---

## 2. 产品层分析

### 2.1 产品边界漂移(核心问题)

`docs/product-design.md`(v2.0)定义的定位是"数据分析运营平台",但 V11~V15 已实际叠加了**财务对账、KoCRM、多触点归因 MTA/MMM、数据血缘、GDPR 隐私中心、动态 SDK 编译器、应用市场**。产品从"分析平台"漂移成了"什么都有的套件"。

**风险**:每个垂直模块(finance/kocrm/mta/marketplace)都是独立业务域,维护成本线性增长;而作为平台核心价值的**采集→分析→分群→行动闭环**反而是最薄的环节(采集侧无生产级 SDK,无 ID-Mapping)。

### 2.2 模块成熟度评估(抽样判断)

| 层级 | 模块 | 成熟度判断 |
|------|------|-----------|
| 核心 | 看板/报表/6 类分析/埋点管理/标签/指标 | 有真实实现与测试记录(V2~V3 有验收),**相对最扎实** |
| 核心 | 预警/订阅/推送/下载/站内信 | V4 验收过,基础可用 |
| 垂直 | 财务/KoCRM | 有 CRUD 与页面,骨架级(V5 验收为"骨架") |
| 垂直 | MTA/MMM/数据血缘/脱敏/GDPR/市场/SDK 编译器 | V13~V15 两天内完成,**大概率是演示级** |
| 智能 | AI(insight/anomaly/prompt-engine) | 有 mock 降级机制(V7.2),真实 LLM 接入状态未知 |
| 采集 | SDK/数据管道 | ClickHouse+Kafka 消费骨架存在,**无生产级采集 SDK,无 ID-Mapping** |

### 2.3 结论

产品的**"分析内核"价值主张成立且已有基础**;垂直模块应收敛为可插拔扩展;最大短板在**数据入口(SDK 采集)与身份打通(ID-Mapping)**——没有这两者,整个平台就是"无源之水",所有分析都只能靠种子数据演示。

---

## 3. 技术层分析

### 3.1 架构现状

```
Web (React18/Vite5/Antd5)
   │ axios + TanStack Query + Zustand
   ▼
API (Fastify4 + Prisma5)  ──── 33 modules, JWT/RBAC雏形/审计插件/限流/Swagger
   │
   ├── PostgreSQL 16   元数据/业务数据(35 模型)
   ├── ClickHouse 24   OLAP(4 个物化视图预聚合)
   ├── Redis 7         L1/L2 两级缓存 + BullMQ 队列 + 限流
   ├── MinIO           对象存储(上传/导出文件)
   └── Kafka consumer  事件管道(骨架)
        ▲
api-go (Gin+GORM)  骨架,未承担流量
```

架构选型本身**合理且现代**:OLTP/OLAP 分离、两级缓存、物化视图、异步导出队列都是数据分析平台的正确姿势。问题不在选型,在于**深度与一致性**。

### 3.2 关键技术债清单(按严重度排序)

#### 🔴 P0 — 安全(阻塞任何生产部署)

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| S1 | CORS 对任意 Origin 放行且 `credentials: true` | `apps/api/src/main.ts` cors 注册处 | 任意网站可携带凭证调用 API,等同 CSRF 全面失守 |
| S2 | JWT/MinIO/数据库默认密钥明文写入 `docker-compose.yml` 并入库(`.env` 本身已被 .gitignore 正确排除) | `docker-compose.yml` | 密钥泄露;生产若沿用默认值则等同裸奔 |
| S3 | SQL 分析模块的注入防护依赖白名单声明(product-design 声称),未见独立审计测试 | `modules/analysis` | 自助 SQL 是数据分析平台最高危攻击面 |

#### 🟠 P1 — 方向性决策悬而未决

| # | 问题 | 说明 |
|---|------|------|
| D1 | **双后端战略未决** | `api-go` 只有分层骨架(26 文件/2.6k 行);`docs/md_files/backend_go_design_report.md` 是基于 **MySQL** 的另一个项目设计稿,与现库(PostgreSQL)不对齐。继续写会双倍维护,放弃则已有投入归零 |
| D2 | **采集链路缺失** | SDK 编译器(V15)是"编译器"而非可用 SDK;Kafka consumer 是骨架;无 ID-Mapping、无用户画像宽表,CDP 缺核心 |
| D3 | **100k QPS 口号与单机现实脱节** | 09b094b 声称"10 万 QPS 架构重构",但部署形态是单机 docker-compose(API/DB 全在单容器网络),无压测报告佐证 |

#### 🟡 P2 — 一致性与工程质量

| # | 问题 | 证据 |
|---|------|------|
| Q1 | **测试文件被 .gitignore 误排除** | `.gitignore` 中的 `*.test.ts` 规则导致 7 个测试文件中 **6 个从未入库**(仅 `utils.test.tsx` 因扩展名幸免)。23 个 harness 测试与 API 集成测试只存在于本地,全新 clone 后测试资产近乎为零,CI 的 unit-tests 作业实际空跑。已在 R0 修复 |
| Q2 | 170 文件未提交(+7.8k 行) | Biome 格式化 + SCAN 流式清理等真实加固,停滞 6 周有丢失风险 |
| Q3 | 前端目录命名债 | 当前 API 层目录叫 `services-new/`(暗示曾经的 services 迁移未收尾) |
| Q4 | 零引用依赖 | `@ant-design/charts`、`@antv/g2` 在源码中 0 引用(需依赖审计确认更多) |
| Q5 | 双份配置并存 | eslint `.js`/`.mjs` 两份、commitlint 两份——Biome 迁移未收尾 |
| Q6 | 文档失真 | README 停在 V5 功能;`docs/md_files/` 两份设计报告是 React 16/Redux/MySQL 旧项目的文档,误导性强 |

#### ⚪ P3 — 仓库卫生

根目录混杂 AI 产物与临时文件:`dashboard_page.png`、`login_page.png`、`docs-combined(1).txt`(三者均已入库)、`docs-pack.zip`、`gemini_brain_*.zip`、`brain/`、`.qoder/`。(`.env` 已被 .gitignore 正确排除,此前判断有误,已修正。)

#### 🔵 P0 — 工具链与环境(2026-09-13 R0 执行时新发现)

| # | 问题 | 影响 | 状态 |
|---|------|------|------|
| E1 | **CI 从未运行过** | `ci.yml` 触发分支写为 `main`/`develop`,仓库实际只有 `master`;健康检查路径也写错为 `/api/v1/health`(实际 `/api/health`),引用了不存在的 `test:integration` 脚本与 Playwright 配置 | 已修复 |
| E2 | **所有包的 lint 都是空跑** | `biome.json` 的 `files.include` 以仓库根为锚点,在子包目录执行 `biome lint ./src` 匹配 0 文件并静默退出 0,门禁形同虚设 | 已修复 |
| E3 | **Biome 迁移只做了一半** | 仅 `api`/`web` 迁移,`harness`/`shared` 仍依赖 eslint + prettier,导致两套 lint 系统并存 | 已修复 |
| E4 | **api 测试套件针对废弃契约** | `tests/` 按 `/api/v1/*` 前缀与不存在的 `buildApp()` 工厂编写,且 `setup.ts` 强制全局连接数据库(P1001),注定无法通过 | 已隔离并重建基线 |
| E5 | **默认 Node 版本低于要求** | 系统 shell 默认 `/usr/local/bin/node` 为 v18.15.0,低于 `engines` 要求的 ≥20,导致 biome 等工具按 Rosetta(x64)解析二进制而报 `Cannot find module '@biomejs/cli-darwin-x64/biome'` | 已加 `.nvmrc` |

### 3.3 值得保留的资产

- **存储分层设计**(PG 元数据 + CH OLAP + Redis 缓存队列 + MinIO 文件)方向正确;
- **两级缓存 + SCAN 流式清理 + 物化视图**等性能基础(未提交部分含实质改进);
- **Harness 测试体系**(mock-server + seed + 集成测试)思路领先于多数同类项目;
- **Monorepo + 共享包**(@alldata/shared 类型/Zod Schema 前后端共享)落地完整;
- Fastify 插件化后端(审计、JWT 双通道、Swagger、限流)骨架完整。

---

## 4. 综合评估

| 维度 | 评分(1-5) | 说明 |
|------|:---:|------|
| 产品完整度(演示) | 4 | 模块覆盖面广,演示链路完整 |
| 产品完整度(生产可用) | 2 | 核心链路可用,采集/身份/安全未闭环 |
| 架构合理性 | 4 | 选型正确,分层清晰 |
| 实现深度 | 2 | 模块广而薄,垂直模块演示级 |
| 工程质量(测试/CI) | 2 | 有框架有 CI,但覆盖极低 |
| 安全 | 1 | CORS/密钥两处硬伤 |
| 文档与可维护性 | 2 | 关键文档过时或张冠李戴 |
| **总体** | **~2.5 / 5** | **"优秀的原型 + 未生产化"** |

**一句话结论**:AllData 已经用极低成本验证了"数据分析平台"的产品形态(广度),接下来的主战场是把**核心闭环(采集→身份→分析→分群→触达)做深、把安全与质量地基打牢、把垂直模块变成可选插件**——即从"演示级平台"升级为"生产级平台"。
