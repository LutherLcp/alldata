# AllData — 全域数据运营平台

> 一站式数据分析、看板管理、用户洞察、埋点治理、智能预警平台

## 🏗️ 项目架构

```
alldata/
├── apps/
│   ├── web/          # 前端应用 (React 18 + Vite + antd)
│   ├── api/          # 后端服务 (Fastify + Prisma)
│   └── harness/      # 开发测试 Harness (Mock + Seed + Tests)
├── packages/
│   └── shared/       # 公共类型/Schema/常量/工具
├── docker/           # Docker 配置
├── docs/             # 项目文档
└── docker-compose.yml
```

## 🚀 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 启动基础设施（PostgreSQL + Redis + MinIO）
docker compose up -d

# 3. 数据库迁移
pnpm db:push

# 4. 启动开发
pnpm dev

# 5. 生成种子数据
pnpm --filter @alldata/harness seed

# 6. 运行测试
pnpm test
```

## 📦 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React | ^18.3 |
| 构建工具 | Vite | ^5.3 |
| UI 组件 | Ant Design | ^5.18 |
| 状态管理 | Zustand | ^4.5 |
| 数据请求 | TanStack Query | ^5.40 |
| 后端框架 | Fastify | ^4.28 |
| ORM | Prisma | ^5.16 |
| 数据库 | PostgreSQL | 16 |
| 缓存/队列 | Redis + BullMQ | 7.x |
| 对象存储 | MinIO | Latest |
| 参数验证 | Zod | ^3.23 |
| 测试 | Vitest + MSW | ^1.6 |
| 包管理 | pnpm + Turborepo | ^9.6 |
| 语言 | TypeScript | ^5.5 |

## 📋 核心功能

- **数据看板** — 多报表拖拽布局、全局筛选、外链嵌入
- **行为分析** — 事件/留存/漏斗/分布/间隔/SQL 6大分析模型
- **埋点管理** — Story→事件→属性全链路管理 + 数据核查
- **用户分析** — 用户搜索、行为序列、属性画像
- **标签管理** — SQL/条件/指标/ID/首末次 5种标签类型
- **指标管理** — 指标定义、预览、关联看板
- **预警管理** — 监控规则、自动检查、多渠道通知
- **数据资产** — 数据表/数据集/属性管理
- **管理中心** — 推送/订阅/下载/枚举/配置

## 🧪 开发测试 Harness

Harness 提供独立的开发测试环境：

```bash
# 启动 Mock Server
pnpm --filter @alldata/harness mock

# 生成种子数据（JSON 文件）
pnpm --filter @alldata/harness seed:json

# 运行 API 测试
pnpm --filter @alldata/harness test

# 运行集成测试
pnpm --filter @alldata/harness test:integration
```

## 📝 License

Private — Internal Use Only
