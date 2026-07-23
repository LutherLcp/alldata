# AllData 全域数据运营平台 — 产品设计文档

> **文档版本**：v2.0  
> **最后更新**：2026-07-21  
> **定位**：面向互联网企业的一站式数据运营分析平台

---

## 1. 产品定位与愿景

### 1.1 产品定位

AllData 是一个**全域数据运营平台**，为运营、产品、市场、数据团队提供从数据采集、分析、洞察到行动的完整闭环能力。

### 1.2 核心价值主张

| 价值维度 | 描述 |
|---------|------|
| **一站式分析** | 6大分析模型覆盖全场景数据洞察需求 |
| **实时看板** | 拖拽式看板构建，支持多端展示和外链嵌入 |
| **埋点治理** | Story→事件→属性全链路管理，保障数据质量 |
| **用户洞察** | 用户画像、行为序列、标签体系深度理解用户 |
| **智能预警** | 自动监控关键指标异常，多渠道即时通知 |
| **数据资产** | 统一管理数据表、数据集、属性，构建数据资产目录 |

### 1.3 目标用户

| 角色 | 使用场景 |
|------|---------|
| 数据分析师 | 自助分析、SQL 查询、看板构建 |
| 产品经理 | 漏斗分析、留存分析、版本日历 |
| 运营人员 | 事件分析、用户分组、推送订阅 |
| 技术开发 | 埋点管理、数据核查、数据表管理 |
| 管理层 | 数据看板、指标概览、预警通知 |
| 市场投放 | KoCRM 投放管理、ROI 分析 |
| 财务人员 | 对账管理、成本分析、报表导出 |

---

## 2. 系统架构

### 2.1 整体架构

```
┌──────────────────────────────────────────────────────────────────┐
│                      客户端层（Multi-Platform）                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ PC Web   │  │ Mobile H5│  │ 外链嵌入  │  │ 第三方 iframe   │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└──────────────────────────┬───────────────────────────────────────┘
                           │ HTTPS / WebSocket
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                      应用服务层（API Gateway）                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              Fastify HTTP Server (:4000)                   │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌───────┐ │  │
│  │  │ Auth │ │ CORS │ │ Rate │ │ Log  │ │ i18n │ │Swagger│ │  │
│  │  │Guard │ │      │ │Limit │ │      │ │      │ │  UI   │ │  │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └───────┘ │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    业务模块层（18 Modules）                  │  │
│  │  auth · project · dashboard · report · analysis · sql      │  │
│  │  event · tag · metric · data_asset · warning · user        │  │
│  │  notice · push · subscription · download · finance · kocrm │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────┬──────────────┬──────────────┬──────────────┬──────────┘
          │              │              │              │
          ▼              ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐
    │PostgreSQL│  │ClickHouse│  │  Redis   │  │    MinIO     │
    │  元数据   │  │  OLAP    │  │Cache/Queue│  │  文件存储    │
    │   :5432  │  │  :8123   │  │  :6379   │  │  :9000      │
    └──────────┘  └──────────┘  └──────────┘  └──────────────┘
```

### 2.2 技术栈总览

#### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | ^18.3 | UI 框架（Concurrent Mode） |
| TypeScript | ^5.5 | 类型安全 |
| Vite | ^5.3 | 构建工具（SWC 编译加速） |
| Ant Design | ^5.18 | UI 组件库 |
| Zustand | ^4.5 | 全局状态管理 |
| TanStack Query | ^5.40 | 服务端状态管理 |
| React Router | ^6.24 | 路由系统 |
| i18next | ^23.11 | 国际化（8语言） |
| ECharts + AntV G2 | ^5.x | 图表可视化 |
| React Grid Layout | ^1.4 | 看板拖拽布局 |
| Zod | ^3.23 | 前端参数验证 |

#### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Fastify | ^4.28 | HTTP 框架（高性能） |
| Prisma | ^5.16 | ORM + 数据库迁移 |
| PostgreSQL | 16 | 主数据库（元数据/业务数据） |
| ClickHouse | 24.x | OLAP 分析数据库 |
| Redis | 7.x | 缓存 / Session / 队列 |
| BullMQ | ^5.9 | 异步任务队列 |
| MinIO | Latest | S3 兼容对象存储 |
| Zod | ^3.23 | 后端参数验证（前后端共享） |
| Pino | ^9.1 | 结构化日志 |

#### 工程化

| 技术 | 版本 | 用途 |
|------|------|------|
| pnpm | ^9.6 | 包管理器 |
| Turborepo | ^2.0 | Monorepo 构建编排 |
| Vitest | ^1.6 | 单元/集成测试 |
| MSW | ^2.3 | API Mock（开发/测试） |
| Playwright | ^1.44 | E2E 测试 |
| Docker Compose | 3.8 | 本地开发环境 |
| ESLint + Prettier | Latest | 代码规范 |
| Husky + lint-staged | Latest | Git Hooks |

### 2.3 Monorepo 结构

```
alldata/                          # Monorepo 根目录
├── apps/
│   ├── web/                      # 前端应用
│   │   ├── src/
│   │   │   ├── components/       # 公共组件（Layout/Chart/Table/...）
│   │   │   ├── pages/            # 业务页面（按模块划分）
│   │   │   ├── stores/           # Zustand 状态管理
│   │   │   ├── services-new/     # API 服务层
│   │   │   ├── hooks/            # 自定义 Hooks
│   │   │   ├── utils/            # 工具函数
│   │   │   ├── routes/           # 路由配置
│   │   │   ├── lang/             # 国际化资源（8语言）
│   │   │   ├── const/            # 常量枚举
│   │   │   ├── types/            # 类型定义
│   │   │   └── styles/           # 全局样式
│   │   └── tests/                # 前端测试
│   │
│   ├── api/                      # 后端服务
│   │   ├── src/
│   │   │   ├── modules/          # 业务模块（18个）
│   │   │   │   ├── auth/         # 认证模块
│   │   │   │   ├── project/      # 项目管理
│   │   │   │   ├── dashboard/    # 看板管理
│   │   │   │   ├── report/       # 报表管理
│   │   │   │   ├── event/        # 埋点管理
│   │   │   │   ├── tag/          # 标签管理
│   │   │   │   ├── indicator/    # 指标管理
│   │   │   │   ├── user/         # 用户查询
│   │   │   │   ├── alert/        # 预警管理
│   │   │   │   ├── finance/      # 财务模块
│   │   │   │   ├── kocrm/        # KoCRM
│   │   │   │   └── ...           # 更多模块
│   │   │   ├── middleware/       # 中间件
│   │   │   ├── plugins/          # Fastify 插件
│   │   │   ├── config/           # 配置管理
│   │   │   ├── common/           # 公共组件
│   │   │   └── utils/            # 工具函数
│   │   ├── prisma/               # Prisma Schema + 迁移
│   │   └── tests/                # 后端测试
│   │
│   └── harness/                  # 开发测试 Harness
│       ├── src/
│       │   ├── mock-server/      # MSW Mock 服务器
│       │   │   ├── handlers.ts   # 全量 API Mock Handler
│       │   │   ├── server.ts     # Node 端 Mock Server
│       │   │   └── browser.ts    # 浏览器端 Mock Worker
│       │   ├── seed/             # 种子数据
│       │   │   ├── factories.ts  # 数据工厂（@faker-js/faker）
│       │   │   └── seed.ts       # 种子数据生成入口
│       │   ├── fixtures/         # 导出的 JSON fixture 文件
│       │   └── tests/            # 测试用例
│       │       ├── api/          # API 单元测试
│       │       └── integration/  # 集成测试（端到端流程）
│       └── vitest.config.ts
│
├── packages/
│   └── shared/                   # 公共共享包
│       └── src/
│           ├── types/            # 全域类型定义（30+ 接口类型）
│           ├── schemas/          # Zod 验证 Schema（前后端共享）
│           ├── constants/        # 常量枚举（API 路由/错误码/分析类型）
│           ├── utils/            # 通用工具函数
│           └── validators/       # 自定义验证器
│
├── docker/                       # Docker 配置
│   ├── postgres/                 # PostgreSQL 初始化
│   └── clickhouse/               # ClickHouse 配置
├── docs/                         # 项目文档
│   ├── product-design.md         # 本文档
│   └── iteration-plan.md         # 迭代计划书
├── docker-compose.yml            # 完整环境
├── docker-compose.test.yml       # 测试环境
├── turbo.json                    # Turborepo 配置
├── pnpm-workspace.yaml           # 工作区配置
└── tsconfig.base.json            # 基础 TS 配置
```

---

## 3. 功能模块设计

### 3.1 数据看板（Dashboard）

**核心能力**：多报表拖拽布局的数据可视化看板

| 功能 | 描述 | 优先级 |
|------|------|-------|
| 文件夹管理 | 树形文件夹结构，支持个人/公共分组 | P0 |
| 看板 CRUD | 创建/编辑/删除/复制/归档看板 | P0 |
| 拖拽布局 | react-grid-layout 多报表自由布局 | P0 |
| 全局筛选器 | 多字段联动筛选，看板级公共/私有 | P0 |
| 编辑/预览模式 | 模式切换，编辑模式可调整报表 | P0 |
| 报表类型 | 图表/数据表/指标卡/SQL/AI/文本 | P0 |
| 移动端适配 | 响应式布局，移动端图表全屏 | P1 |
| 外链嵌入 | 软链接生成，第三方 iframe 嵌入 | P1 |
| 看板分享 | 按用户/团队分享看板权限 | P1 |
| 看板截图 | html2canvas 截图导出 | P2 |
| AI 摘要 | 基于 LLM 的看板数据摘要 | P2 |
| 看板结论 | 运营结论编辑和历史记录 | P2 |

**数据流**：

```
用户操作 → 配置报表参数 → API 查询 → 图表渲染
            ↓
        全局筛选器 → 联动更新所有报表
            ↓
        布局变更 → 自动保存 layout JSON
```

### 3.2 行为分析（Analysis）

**核心能力**：6大分析模型覆盖全场景数据洞察

| 分析类型 | 功能 | 图表类型 |
|---------|------|---------|
| 事件分析 | 指标+分组+筛选+时间粒度 | 折线/柱状/面积/饼 |
| 留存分析 | 初始事件+回访事件+留存窗口 | 热力矩阵/折线 |
| 漏斗分析 | 多步骤转化漏斗 | 漏斗图/柱状 |
| 分布分析 | 用户属性分布 | 散点/柱状 |
| 间隔分析 | 事件间隔时间分布 | 柱状 |
| SQL 分析 | 自定义 SQL + CodeMirror | 表格/图表 |

**查询流程**：

```
配置指标/分组/筛选/时间
  ↓
checkAnalysisObject() 参数校验
  ↓
useRequestQueue 管理并发查询
  ↓
POST /api/query → 后端 QueryBuilder → ClickHouse SQL
  ↓
结果缓存（Redis, TTL 5min）→ 图表渲染
```

### 3.3 埋点管理（Event Tracking）

**核心能力**：Story→事件→属性全链路埋点治理

```
Story（需求文档）
  ├── 创建 Story → 关联需求文档链接
  ├── 添加事件定义 → 配置事件属性
  ├── 提交审批 → 审批流程
  ├── 审批通过 → 开发实施
  └── 数据验收 → 数据核查
      ├── 事件日志查询
      └── 问题事件列表
```

### 3.4 用户分析（User）

| 功能 | 描述 |
|------|------|
| 用户搜索 | 按 ID/属性搜索用户 |
| 用户列表 | 分页列表，支持筛选 |
| 用户详情 | 用户属性画像 |
| 行为序列 | 用户行为时间线 |

### 3.5 标签管理（Tag）

**5种标签类型**：

| 类型 | 描述 | 实现方式 |
|------|------|---------|
| SQL 标签 | 自定义 SQL 定义用户群 | ClickHouse 查询 |
| 条件标签 | 可视化条件筛选 | 条件编译为 SQL |
| 指标标签 | 基于指标阈值分群 | 指标计算 + 分组 |
| ID 标签 | 上传用户 ID 列表 | 文件解析 |
| 首末次标签 | 首次/末次行为时间 | 聚合查询 |

**标签计算**：创建/刷新标签 → BullMQ 队列 → 异步计算 → 更新覆盖人数

### 3.6 指标管理（Metric）

- 指标定义（简单指标/组合指标）
- 指标预览（编译为分析查询）
- 指标关联看板/报表

### 3.7 预警管理（Warning）

```
预警规则配置
  ├── 监控指标 + 触发条件 + 检查周期
  ├── 通知渠道配置（站内信/邮件/飞书/Webhook）
  └── 自动 Cron 检查 → 触发通知 → 预警日志
```

### 3.8 数据资产（Data Asset）

| 模块 | 功能 |
|------|------|
| 数据表管理 | 数据表列表/详情/字段管理 |
| 数据集管理 | SQL/关联/条件三种类型数据集 |
| 属性管理 | 属性定义/i18n/枚举映射 |
| 分类管理 | 树形分类目录 |
| 文件上传 | CSV/Excel → ClickHouse 建表 |

### 3.9 管理中心（Management）

| 子模块 | 功能 |
|--------|------|
| 看板管理 | 所有看板权限管理 |
| 报表管理 | 报表列表 |
| 推送管理 | 飞书群/Webhook 推送配置 |
| 订阅管理 | 定时报表/看板邮件发送 |
| 下载管理 | 异步导出文件管理 |
| 枚举管理 | 系统枚举值管理 |
| 配置管理 | 系统配置 |
| 版本日历 | 版本信息标注 |

### 3.10 财务模块（Finance）

应收账款、流水对账、分成比例、成本管理、年度目标等财务分析功能。

### 3.11 KoCRM

社媒投放管理（账户/媒体/素材/ROI）+ 营销管理（KOC/创作者/One Link/批量邮件）。

---

## 4. API 设计规范

### 4.1 统一响应格式

```json
// 成功
{ "code": 200, "message": "success", "data": { ... } }

// 分页
{ "code": 200, "message": "success", "data": {
    "list": [...],
    "page_info": { "current_page": 1, "page_size": 20, "total_page": 5, "total": 100 }
}}

// 错误
{ "code": 400, "message": "参数错误", "data": null }
```

### 4.2 错误码体系

| 错误码 | 含义 | 前端处理 |
|-------|------|---------|
| 200 | 成功 | 正常处理 |
| 400 | 参数错误 | 弹出错误提示 |
| 401 | 未认证 | 跳转登录页 |
| 403 | 无权限 | 跳转无权限页 |
| 10001 | Token 过期 | 刷新 Token 或跳转登录 |
| 20201 | 数据权限不足 | 弹出权限申请弹窗 |
| 429 | 请求频率限制 | 弹出提示 |
| 500 | 服务器错误 | 弹出错误提示 |

### 4.3 请求头规范

| Header | 说明 | 示例 |
|--------|------|------|
| Authorization | JWT Token | `Bearer xxx` |
| PROJECT-ID | 当前项目 ID | `1` |
| trace-id | 请求追踪 ID（UUID） | `uuid-v4` |
| language | 当前语言 | `zh` |
| X-UA | 设备信息 | `pc/mobile` |

### 4.4 API 路由总览（400+ 接口）

完整路由定义见 `@alldata/shared` 的 `API_ROUTES` 常量。

---

## 5. 数据模型设计

### 5.1 PostgreSQL 核心表（元数据）

| 域 | 表 | 说明 |
|---|---|---|
| 用户 | users, projects, roles, user_project_roles | 用户/项目/角色/关联 |
| 看板 | dashboard_folders, dashboards, reports, dashboard_soft_links | 看板/报表/软链 |
| 埋点 | stories, events, event_properties | Story/事件/属性 |
| 标签 | user_tags, user_tag_histories | 标签/刷新历史 |
| 指标 | metrics | 指标定义 |
| 资产 | categories, entity_types, datatables, datasets, attributes | 分类/实体/数据表/数据集/属性 |
| 预警 | warnings, warning_logs | 预警规则/日志 |
| 管理 | subscriptions, push_configs, enum_definitions, version_calendars | 订阅/推送/枚举/日历 |
| 通知 | notices, notice_reads, download_tasks | 站内信/下载任务 |
| 财务 | finance_suppliers, finance_share_ratios, finance_reconciliations | 供应商/分成/对账 |

### 5.2 ClickHouse 分析表（OLAP）

| 表 | 引擎 | 用途 |
|---|---|---|
| events | MergeTree | 事件数据主表 |
| user_profiles | ReplacingMergeTree | 用户属性快照 |
| mv_dau | SummingMergeTree（物化视图） | 日活/指标预聚合 |
| sql_query_history | MergeTree | SQL 查询历史 |

### 5.3 Redis Key 设计

| Key 模式 | 用途 | TTL |
|---------|------|-----|
| `session:{user_id}` | 用户会话 | 7d |
| `auth_tree:{project_id}:{user_id}` | 权限树缓存 | 1h |
| `analysis_cache:{hash}` | 分析查询缓存 | 5min |
| `query_cancel:{trace_id}` | 查询取消信号 | 1h |
| `notice_unread:{user_id}` | 未读通知计数 | ∞ |
| `rate_limit:{user_id}:{api}` | 限流计数 | 1min |

---

## 6. 前端架构设计

### 6.1 状态管理体系

```
Zustand Stores（全新架构，无 Redux 依赖）
├── useAuthStore        — 认证状态（token/userInfo/isAuthenticated）
├── useGlobalStore      — 全局状态（project/color/lang/entityTypes）
├── useDashboardStore   — 看板状态（editMode/filters/fullscreen）
├── useFilterStore      — 筛选器状态
├── useTagStore         — 标签列表/筛选
├── useEventStore       — 事件状态
├── useSqlStore         — SQL 分析状态
└── useCacheStore       — 选中缓存/授权项目
```

### 6.2 路由系统

```
React Router v6 + createBrowserRouter
├── /login                → 登录页（PublicRoute）
├── /                     → ProtectedRoute + DashboardLayout
│   ├── /dashboard        → 数据看板
│   ├── /analysis/*       → 行为分析（6种分析类型）
│   ├── /tracking/*       → 埋点管理（Story/Event）
│   ├── /users/*          → 用户分析
│   ├── /tags/*           → 标签管理
│   ├── /metrics/*        → 指标管理
│   ├── /assets/*         → 数据资产
│   ├── /alerts/*         → 预警管理
│   ├── /settings/*       → 管理中心
│   ├── /finance/*        → 财务模块
│   ├── /kocrm/*          → KoCRM
│   └── /calendar         → 版本日历
└── /*                    → 404
```

### 6.3 API 请求架构

```
axios 单例 → 请求拦截器 → 响应拦截器
              ↓                ↓
         注入 Headers      错误处理
         (token/project/   (401→登录
          trace/lang)       20201→权限申请
                            toast 提示)
```

---

## 7. 安全设计

| 安全措施 | 实现 |
|---------|------|
| 身份认证 | JWT + Redis Session（支持主动失效） |
| 数据隔离 | 项目级数据隔离（强制 project_id 过滤） |
| 权限控制 | RBAC 权限树 + 数据权限（code 20201） |
| SQL 注入 | SQL 解析白名单 + 参数化查询 |
| 请求限流 | Redis 滑动窗口（分析查询 20次/分钟） |
| XSS 防护 | Helmet + CSP 策略 |
| CORS | 精确 Origin 配置 |
| 文件安全 | 上传类型白名单 + 大小限制 |

---

## 8. 性能设计

| 优化项 | 策略 |
|-------|------|
| 查询缓存 | Redis 查询结果缓存（TTL 5min） |
| 代码分割 | Vite 按模块动态导入 |
| 图表懒加载 | 看板报表可见区域加载 |
| 查询取消 | AbortController + ClickHouse KILL QUERY |
| 并发控制 | useRequestQueue 管理多查询并发 |
| 构建优化 | SWC 编译 + manualChunks 分包 |
| 大数值 | parseJsonWithBigNumberSupport 防精度丢失 |

---

## 9. 国际化

支持 8 种语言：简体中文、英文、繁体中文、韩语、日语、越南语、印尼语、泰语。

语言切换流程：修改 localStorage `lang` → i18next.changeLanguage() → 页面刷新

---

## 10. 开发测试 Harness

### 10.1 架构

```
apps/harness/
├── mock-server/        # MSW Mock 服务
│   ├── handlers.ts     # 全量 API 拦截（50+ handlers）
│   ├── server.ts       # Node 端（CI/测试）
│   └── browser.ts      # 浏览器端（前端开发）
├── seed/               # 数据工厂
│   ├── factories.ts    # 15+ 数据工厂函数
│   └── seed.ts         # CLI 生成入口
├── fixtures/           # 导出的 JSON 数据
└── tests/              # 测试用例
    ├── api/            # API 单元测试
    └── integration/    # 流程集成测试
```

### 10.2 使用场景

| 场景 | 命令 | 说明 |
|------|------|------|
| 前端脱离后端开发 | 在 web 中引入 browser.ts | MSW 拦截请求返回 Mock 数据 |
| API 接口测试 | `pnpm --filter harness test` | 验证 Mock Handler 覆盖率 |
| 集成流程测试 | `pnpm --filter harness test:integration` | 端到端流程验证 |
| 种子数据生成 | `pnpm --filter harness seed:json` | 导出 fixture JSON 文件 |
| CI 环境 | MSW Node Server | 无依赖的 Mock 环境 |
