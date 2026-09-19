# AllData — 全域数据运营平台

> 一站式用户行为分析、看板管理、用户洞察、埋点治理与智能预警平台（私有化部署）

## 项目状态

| 项 | 说明 |
|---|---|
| 当前版本 | V15（动态 SDK 编译工厂 + 应用市场生态） |
| 阶段 | **原型完备、生产化进行中**——详见 [现状分析报告](docs/reports/analysis-report-2026-09.md) |
| 迭代计划 | [2026-2027 路线图](docs/reports/roadmap-2026-2027.md)（唯一现行计划） |

> ⚠️ **重要**：`archive/joydata-reference/` 下的文档属于另一个项目（React 16 / MySQL），技术前提与本项目不同，请勿作为本项目文档使用。详见该目录的 README。

## 架构

```
apps/
├── web/       前端 — React 18 + Vite 5 + Ant Design 5 + Zustand + TanStack Query
├── api/       业务后端 — Fastify 4 + Prisma 5（权威实现，33 个业务模块）
├── api-go/    采集侧 Go 服务（骨架，定位见架构设计报告决策 T-1）
└── harness/   开发测试环境 — MSW Mock Server + 种子数据 + 测试

packages/
└── shared/    前后端共享的类型 / Zod Schema / 常量 / 工具

docs/          产品设计与三份核心报告
archive/       历史计划与外部项目参考材料
```

**存储分层**

| 组件 | 用途 |
|---|---|
| PostgreSQL 16 | 业务元数据（35 个 Prisma 模型） |
| ClickHouse 24 | 行为数据 OLAP（含 4 个预聚合物化视图） |
| Redis 7 | 两级缓存 + BullMQ 队列 + 限流 |
| MinIO | 对象存储（上传 / 导出文件） |

## 快速开始

### 1. 环境要求

- **Node.js >= 20**（项目 `engines` 要求；低于 20 会导致部分工具异常）
- pnpm 9.6+、Docker

### 2. 安装与启动

```bash
# 安装依赖
pnpm install

# 配置环境变量（compose 中的密钥为必填，缺失会直接报错）
cp .env.example .env
# 按需修改 .env 中的密钥（JWT_SECRET / POSTGRES_PASSWORD / MINIO_ROOT_PASSWORD 等）

# 启动基础设施（PostgreSQL + Redis + MinIO + ClickHouse）
pnpm docker:up

# 生成 Prisma Client 并同步表结构
pnpm db:generate
pnpm db:push

# 启动开发（web + api）
pnpm dev
```

- 前端 http://localhost:3000
- 后端 http://localhost:4000（Swagger 文档在 `/docs`）
- 健康检查 `GET /api/health`、就绪检查 `GET /api/ready`

### 3. 常用命令

```bash
pnpm lint          # Biome 检查全部包
pnpm typecheck     # 全包类型检查
pnpm format        # 格式化
pnpm test          # 全包测试
pnpm build         # 全包构建
pnpm check         # Biome 检查（错误即失败）

# Harness（脱离后端的前端开发与测试）
pnpm --filter @alldata/harness mock          # 启动 Mock Server
pnpm --filter @alldata/harness seed:json     # 生成种子数据
```

## 功能模块

**分析内核**：数据看板（拖拽布局、全局筛选、外链嵌入）、行为分析（事件/留存/漏斗/分布/间隔/SQL 六类）、埋点治理（Story→事件→属性）、用户分析、标签体系（5 种类型）、指标管理、预警与订阅

**平台能力**：数据资产（数据表/数据集/属性）、管理中心（推送/订阅/下载/枚举/版本日历）、审计日志、多租户与 RBAC

**扩展模块**（规划为可插拔插件，见路线图 R4）：财务对账、KoCRM、多触点归因 MTA/MMM、数据血缘、隐私与脱敏、应用市场

## 开发约定

| 项 | 约定 |
|---|---|
| 代码规范 | Biome（lint + format），提交前经 lint-staged 自动检查 |
| 提交信息 | Conventional Commits（commitlint 强制） |
| 类型契约 | 前后端统一使用 `@alldata/shared` 的 Zod Schema |
| 测试工具 | Vitest + MSW；E2E 使用 Playwright（待 R1 补齐） |

## 文档索引

- [产品设计](docs/product-design.md)
- [现状分析报告](docs/reports/analysis-report-2026-09.md) — 问题清单与优先级
- [架构设计报告](docs/reports/architecture-design-2026-09.md) — 目标架构与关键决策
- [长期迭代计划](docs/reports/roadmap-2026-2027.md) — 六个 Release 的路线图

## License

Private — Internal Use Only
