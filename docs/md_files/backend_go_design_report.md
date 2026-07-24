# 大数据分析平台 — 后端架构设计报告（Go）

> 文档版本：v1.0 · 生成时间：2026-07-24  
> 技术栈：Go · Gin · GORM · Redis · Kafka · ClickHouse · MySQL · gRPC

> **说明**：本报告基于前端请求结构、API 路径规律、业务模块分布反推后端设计，可作为 Go 后端从零搭建或重构的参考蓝图。

---

## 一、整体架构设计

### 1.1 架构风格

采用 **分层架构 + 领域驱动设计（DDD-lite）** 风格：

```
┌─────────────────────────────────────────────────┐
│              API Gateway / Nginx                │
│         (SSL终止 / 限流 / 路由分发)               │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│           Application Layer (Go / Gin)          │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │  HTTP    │ │  WebSocket│ │   gRPC Server    │ │
│  │  Router  │ │  Server  │ │  (内部服务调用)   │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│           Domain Services Layer                 │
│  Auth│Dashboard│Analysis│Tag│Finance│kocrm│...  │
└─────────────────────────────────────────────────┘
                        ↓
┌────────────┬───────────┬──────────┬─────────────┐
│   MySQL    │ClickHouse │  Redis   │  Kafka MQ   │
│ (业务数据) │(分析数据)  │  (缓存)  │  (异步任务) │
└────────────┴───────────┴──────────┴─────────────┘
```

### 1.2 技术选型

| 类别 | 技术 | 说明 |
|------|------|------|
| Web 框架 | Gin | 高性能 HTTP 框架 |
| ORM | GORM v2 | MySQL 对象映射 |
| 数据库 | MySQL 8.x | 业务数据存储 |
| 分析引擎 | ClickHouse | 海量行为事件分析 |
| 缓存 | Redis 7.x | 查询缓存/会话/分布式锁 |
| 消息队列 | Kafka | 异步任务/埋点数据消费 |
| 内部 RPC | gRPC + Protobuf | 微服务间通信 |
| 配置管理 | Viper | 多环境配置 |
| 日志 | Zap | 结构化高性能日志 |
| 链路追踪 | OpenTelemetry + Jaeger | 分布式追踪 |
| 错误监控 | Sentry Go SDK | 异常上报 |
| 任务调度 | go-cron / xxl-job-executor | 定时任务 |
| 认证 | JWT + SSO | 双模式鉴权 |
| API 文档 | Swagger / swaggo | 自动生成文档 |

---

## 二、项目目录结构

```
backend/
├── cmd/
│   └── server/
│       └── main.go              # 程序入口
├── config/
│   ├── config.go                # 配置结构体
│   └── env/
│       ├── config.dev.yaml
│       ├── config.pre.yaml
│       └── config.prd.yaml
├── internal/
│   ├── middleware/              # Gin 中间件
│   │   ├── auth.go              # JWT 鉴权
│   │   ├── project.go           # 项目权限校验
│   │   ├── cors.go              # 跨域
│   │   ├── ratelimit.go         # 接口限流
│   │   ├── trace.go             # 链路追踪注入
│   │   ├── i18n.go              # 国际化 Header 解析
│   │   └── recovery.go          # Panic 恢复
│   ├── router/
│   │   ├── router.go            # 路由注册入口
│   │   ├── api.go               # /api 路由组
│   │   └── v1/                  # 版本化路由
│   ├── domain/                  # 业务领域层
│   │   ├── auth/                # 鉴权领域
│   │   ├── dashboard/           # 看板领域
│   │   ├── analysis/            # 分析领域
│   │   ├── event/               # 事件埋点领域
│   │   ├── tag/                 # 标签领域
│   │   ├── user/                # 用户领域
│   │   ├── report/              # 报表领域
│   │   ├── indicator/           # 指标领域
│   │   ├── finance/             # 财务领域
│   │   ├── warning/             # 预警领域
│   │   ├── task/                # 任务调度领域
│   │   ├── notice/              # 站内信领域
│   │   └── kocrm/               # 投放/营销领域
│   ├── handler/                 # HTTP Handler（Controller）
│   │   ├── dashboard.go
│   │   ├── analysis.go
│   │   ├── event.go
│   │   └── ...
│   ├── service/                 # 业务逻辑层
│   │   ├── dashboard_service.go
│   │   ├── analysis_service.go
│   │   └── ...
│   ├── repository/              # 数据访问层
│   │   ├── mysql/
│   │   ├── clickhouse/
│   │   └── redis/
│   └── model/                   # 数据模型
│       ├── entity/              # 数据库实体
│       ├── dto/                 # 数据传输对象
│       └── vo/                  # 视图对象
├── pkg/                         # 公共工具包
│   ├── response/                # 统一响应封装
│   ├── errors/                  # 错误码定义
│   ├── pagination/              # 分页工具
│   ├── cache/                   # Redis 缓存封装
│   ├── lock/                    # 分布式锁
│   ├── jwt/                     # JWT 工具
│   ├── email/                   # 邮件发送
│   ├── export/                  # Excel 导出
│   └── validator/               # 参数校验
├── infra/                       # 基础设施层
│   ├── database/
│   │   ├── mysql.go
│   │   └── clickhouse.go
│   ├── redis/
│   │   └── redis.go
│   └── kafka/
│       ├── producer.go
│       └── consumer.go
├── proto/                       # Protobuf 定义（gRPC）
│   ├── auth.proto
│   └── analysis.proto
├── scripts/
│   ├── migration/               # 数据库迁移脚本
│   └── seed/                    # 初始数据
├── test/
│   ├── integration/
│   └── unit/
├── go.mod
├── go.sum
└── Makefile
```

---

## 三、核心模块设计

### 3.1 统一响应结构

与前端约定的响应格式（前端通过 `res?.data?.data` 两层取值）：

```go
// pkg/response/response.go

package response

import (
    "github.com/gin-gonic/gin"
    "net/http"
)

// 标准响应体
type Response struct {
    Code    int         `json:"code"`
    Message string      `json:"message"`
    Data    interface{} `json:"data"`
}

// 分页数据
type PaginationData struct {
    List     interface{} `json:"list"`
    PageInfo PageInfo    `json:"page_info"`
}

type PageInfo struct {
    CurrentPage int `json:"current_page"`
    PageSize    int `json:"page_size"`
    TotalPage   int `json:"total_page"`
    Total       int `json:"total"`
}

func Success(c *gin.Context, data interface{}) {
    c.JSON(http.StatusOK, Response{
        Code:    200,
        Message: "success",
        Data:    data,
    })
}

func SuccessList(c *gin.Context, list interface{}, pageInfo PageInfo) {
    c.JSON(http.StatusOK, Response{
        Code:    200,
        Message: "success",
        Data: PaginationData{
            List:     list,
            PageInfo: pageInfo,
        },
    })
}

func Fail(c *gin.Context, code int, msg string) {
    c.JSON(http.StatusOK, Response{
        Code:    code,
        Message: msg,
    })
}

// 数据权限不足（前端 code=20201 弹权限申请）
func NoDataAuth(c *gin.Context, policyKeys []string) {
    c.JSON(http.StatusOK, Response{
        Code:    20201,
        Message: "data permission denied",
        Data:    map[string]interface{}{"list": policyKeys},
    })
}
```

### 3.2 错误码体系

```go
// pkg/errors/code.go

const (
    // 通用
    CodeSuccess           = 200
    CodeParamError        = 400
    CodeUnauthorized      = 401
    CodeForbidden         = 403
    CodeNotFound          = 404
    CodeServerError       = 500

    // 业务错误码（10xxx）
    CodeTokenExpired      = 10001
    CodeTokenInvalid      = 10002
    CodeTokenMissing      = 10003
    CodeSessionExpired    = 10004

    // 数据权限（20xxx）
    CodeDataPermDenied    = 20201

    // 业务逻辑（30xxx）
    CodeDashboardNotFound = 30001
    CodeReportNotFound    = 30002
    CodeEventNotFound     = 30003
)
```

### 3.3 中间件设计

#### JWT 鉴权中间件

```go
// internal/middleware/auth.go

func JWTAuth() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := extractToken(c)
        if token == "" {
            response.Fail(c, errors.CodeUnauthorized, "missing token")
            c.Abort()
            return
        }

        claims, err := jwt.ParseToken(token)
        if err != nil {
            // 区分 token 过期 vs 无效
            if errors.IsTokenExpired(err) {
                response.Fail(c, errors.CodeTokenExpired, "token expired")
            } else {
                response.Fail(c, errors.CodeTokenInvalid, "invalid token")
            }
            c.Abort()
            return
        }

        // 注入用户信息到上下文
        c.Set("user_id", claims.UserID)
        c.Set("user_info", claims)
        c.Next()
    }
}

func extractToken(c *gin.Context) string {
    // 优先 Authorization Header
    if auth := c.GetHeader("Authorization"); auth != "" {
        if strings.HasPrefix(auth, "Bearer ") {
            return strings.TrimPrefix(auth, "Bearer ")
        }
    }
    // 兼容外链场景 external_link_token
    return c.GetHeader("external_link_token")
}
```

#### 项目权限中间件

```go
// internal/middleware/project.go

func ProjectAuth() gin.HandlerFunc {
    return func(c *gin.Context) {
        projectID := c.GetHeader("PROJECT-ID")
        if projectID == "" {
            projectID = c.Query("project_id")
        }
        userID := c.GetString("user_id")

        // 检查用户是否有该项目权限
        hasAuth, err := projectService.CheckUserProjectAuth(c, userID, projectID)
        if err != nil || !hasAuth {
            response.Fail(c, errors.CodeForbidden, "no project permission")
            c.Abort()
            return
        }

        c.Set("project_id", projectID)
        c.Next()
    }
}
```

#### 链路追踪中间件

```go
// internal/middleware/trace.go

func Tracing() gin.HandlerFunc {
    return func(c *gin.Context) {
        traceID := c.GetHeader("trace-id")
        if traceID == "" {
            traceID = uuid.New().String()
        }
        // 注入到上下文，供 Logger/DB 查询时使用
        ctx := context.WithValue(c.Request.Context(), "trace_id", traceID)
        c.Request = c.Request.WithContext(ctx)
        c.Header("X-Trace-ID", traceID)
        c.Next()
    }
}
```

---

## 四、领域模块设计

### 4.1 鉴权模块（Auth Domain）

```
接口列表：
POST /api/v1/login          ← 账号密码/Lark OAuth 登录
GET  /api/users             ← 获取用户列表
GET  /api/project/v1/list   ← 获取用户有权限的项目列表
GET  /api/projects          ← 项目管理列表
POST /api/project           ← 创建项目
PUT  /api/project           ← 更新项目
DELETE /api/project         ← 删除项目
```

```go
// internal/model/entity/user.go

type User struct {
    ID           int64     `gorm:"primaryKey"`
    Username     string    `gorm:"uniqueIndex;size:100"`
    Email        string    `gorm:"uniqueIndex;size:200"`
    PasswordHash string    `gorm:"size:255"`
    DisplayName  string    `gorm:"size:100"`
    Avatar       string    `gorm:"size:500"`
    Status       int8      `gorm:"default:1"` // 1-启用 2-禁用
    LarkOpenID   string    `gorm:"size:100"`
    CreatedAt    time.Time
    UpdatedAt    time.Time
}

type Project struct {
    ID          int64     `gorm:"primaryKey"`
    Code        string    `gorm:"uniqueIndex;size:50"`
    Name        string    `gorm:"size:100"`
    Description string    `gorm:"size:500"`
    Status      int8      `gorm:"default:1"`
    CreatedAt   time.Time
}

type UserProject struct {
    UserID    int64 `gorm:"primaryKey"`
    ProjectID int64 `gorm:"primaryKey"`
    Role      int8  // 1-超管 2-管理员 3-普通用户
}
```

**登录流程**：
```
1. 账密登录：验证密码 → 生成 JWT（含 user_id/project_ids）→ 返回 token
2. Lark 登录：OAuth code → 换取 Lark 用户信息 → 查询或创建用户 → 生成 JWT
3. SSO Cookie：通过 SSO 平台验证 sso_token → 解析用户信息 → 生成本地 JWT
```

### 4.2 数据看板模块（Dashboard Domain）

```
接口列表：
GET/POST/PUT/DELETE /api/dashboard          ← 看板 CRUD
GET     /api/dashboards                     ← 看板列表
POST    /api/dashboard/copy                 ← 复制看板
GET     /api/dashboard/folder/tree          ← 目录树
POST    /api/dashboard/folder               ← 新建目录
GET     /api/dashboard/common-filters       ← 全局筛选器配置
POST    /api/dashboard/soft-link/v1/add     ← 创建外链
GET     /api/dashboard/v1/ai-summary        ← AI 智能摘要
POST    /api/dashboard/v1/save-conclusion   ← 保存看板结论
```

```go
// internal/model/entity/dashboard.go

type Dashboard struct {
    ID          int64          `gorm:"primaryKey"`
    ProjectID   int64          `gorm:"index"`
    FolderID    int64          `gorm:"index"`
    Name        string         `gorm:"size:200"`
    Description string         `gorm:"size:1000"`
    Layout      datatypes.JSON // 拖拽布局配置（react-grid-layout JSON）
    Filters     datatypes.JSON // 全局筛选器配置
    Type        int8           // 1-普通 2-移动端
    IsPublic    bool
    CreatorID   int64
    CreatedAt   time.Time
    UpdatedAt   time.Time
    DeletedAt   gorm.DeletedAt `gorm:"index"` // 软删除
}

type DashboardFolder struct {
    ID        int64          `gorm:"primaryKey"`
    ProjectID int64          `gorm:"index"`
    ParentID  int64          `gorm:"index"`
    Name      string         `gorm:"size:100"`
    Type      int8           // 1-个人 2-公开
    SortOrder int
    CreatorID int64
    CreatedAt time.Time
}

// 外链 Token
type SoftLink struct {
    ID          int64     `gorm:"primaryKey"`
    DashboardID int64     `gorm:"index"`
    Token       string    `gorm:"uniqueIndex;size:100"`
    ExpireAt    time.Time
    IsActive    bool
    CreatorID   int64
    CreatedAt   time.Time
}
```

### 4.3 行为分析模块（Analysis Domain）

**分析引擎**基于 ClickHouse，所有分析 SQL 动态构建：

```go
// internal/domain/analysis/query_builder.go

type AnalysisQuery struct {
    ProjectID   string
    TableName   string         // 事件表名
    Events      []EventItem    // 指标事件列表
    Filters     []FilterItem   // 用户/事件过滤条件
    Groups      []GroupItem    // 分组维度
    DateRange   DateRange      // 时间范围
    Granularity string         // 时间粒度: day/week/month
    ByUser      bool           // 按用户去重
}

// 事件分析 SQL 构建
func (b *QueryBuilder) BuildEventAnalysisSQL(q *AnalysisQuery) (string, []interface{}) {
    // SELECT
    //   toDate(event_time) AS date,
    //   {groupBy},
    //   {aggregation}(user_id) AS value
    // FROM {table}
    // WHERE event_name IN (?) 
    //   AND event_time BETWEEN ? AND ?
    //   AND {filters}
    // GROUP BY date, {groupBy}
    // ORDER BY date
}
```

#### 分析类型接口设计

```
POST /api/v1/analysis/event        ← 事件分析查询
POST /api/v1/analysis/retention    ← 留存分析
POST /api/v1/analysis/funnel       ← 漏斗分析
POST /api/v1/analysis/scatter      ← 分布分析
POST /api/v1/analysis/interval     ← 间隔分析
POST /api/v1/analysis/sql          ← 自定义 SQL 查询
POST /api/v1/analysis/user-list    ← 分析钻取用户列表
```

#### 留存分析数据模型

```go
// internal/model/dto/retention.go

type RetentionQueryParams struct {
    ProjectID      string       `json:"project_id"`
    StartEvent     EventConfig  `json:"start_event"`     // 起始事件
    ReturnEvent    EventConfig  `json:"return_event"`     // 回访事件
    DateRange      DateRange    `json:"date_range"`
    RetentionDays  []int        `json:"retention_days"`   // [1,3,7,14,30]
    GroupBy        []GroupItem  `json:"group_by"`
    Filters        []FilterItem `json:"filters"`
}

// 留存矩阵响应
type RetentionMatrix struct {
    Dates  []string          `json:"dates"`   // X轴日期
    Rows   []RetentionRow    `json:"rows"`
}

type RetentionRow struct {
    Date       string    `json:"date"`
    InitCount  int64     `json:"init_count"` // 起始用户数
    Rates      []float64 `json:"rates"`      // 各天留存率
}
```

#### 漏斗分析数据模型

```go
type FunnelQueryParams struct {
    ProjectID   string        `json:"project_id"`
    Steps       []FunnelStep  `json:"steps"`        // 漏斗步骤（有序）
    WindowDays  int           `json:"window_days"`  // 转化时间窗口（天）
    DateRange   DateRange     `json:"date_range"`
    GroupBy     []GroupItem   `json:"group_by"`
    Filters     []FilterItem  `json:"filters"`
}

type FunnelStep struct {
    EventName  string       `json:"event_name"`
    Conditions []FilterItem `json:"conditions"` // 步骤内过滤
}

type FunnelResult struct {
    Steps []FunnelStepResult `json:"steps"`
}

type FunnelStepResult struct {
    Name       string  `json:"name"`
    Count      int64   `json:"count"`
    Rate       float64 `json:"rate"`        // 相对上一步转化率
    TotalRate  float64 `json:"total_rate"`  // 相对第一步转化率
    AvgTime    float64 `json:"avg_time"`    // 平均转化时长（秒）
}
```

### 4.4 事件元数据管理（Event Domain）

```
GET  /api/category/list              ← 板块列表
GET  /api/category/tree              ← 板块树
POST /api/event/v1/create            ← 创建事件
PUT  /api/event/v1/update            ← 更新事件
GET  /api/event/v1/list              ← 事件列表
GET  /api/attribute/v1/entity-ids    ← 实体类型列表
POST /api/story/v1/create            ← 创建埋点 Story
GET  /api/story/v1/list              ← Story 列表
POST /api/story/v1/verify-code       ← 验证埋点代码
```

```go
// 事件元数据
type EventMeta struct {
    ID          int64          `gorm:"primaryKey"`
    ProjectID   int64          `gorm:"index"`
    CategoryID  int64
    EventName   string         `gorm:"index;size:200"`
    DisplayName string         `gorm:"size:200"`
    Description string         `gorm:"size:1000"`
    Status      int8           // 1-正常 2-废弃
    EntityType  string         `gorm:"size:50"`  // user/device/...
    Properties  datatypes.JSON // 事件属性列表
    CreatorID   int64
    CreatedAt   time.Time
    UpdatedAt   time.Time
}

// 属性定义
type EventProperty struct {
    ID          int64  `gorm:"primaryKey"`
    EventID     int64  `gorm:"index"`
    PropName    string `gorm:"size:100"`
    DisplayName string `gorm:"size:100"`
    DataType    string `gorm:"size:20"`  // string/int/float/bool/date/list
    IsRequired  bool
    Description string `gorm:"size:500"`
}
```

### 4.5 标签管理模块（Tag Domain）

```
POST /api/tag/v1/create           ← 创建标签
GET  /api/tag/v1/list             ← 标签列表
POST /api/tag/v1/compute          ← 触发标签计算
GET  /api/tag/v1/user-list        ← 标签用户列表
POST /api/crowd-pack/v1/create    ← 创建人群包
```

```go
type Tag struct {
    ID          int64          `gorm:"primaryKey"`
    ProjectID   int64          `gorm:"index"`
    Name        string         `gorm:"size:100"`
    Description string         `gorm:"size:500"`
    TagType     int8           // 1-规则标签 2-算法标签 3-上传标签
    Rules       datatypes.JSON // 标签计算规则 DSL
    UserCount   int64          // 当前命中用户数
    Status      int8           // 1-草稿 2-计算中 3-生效 4-失败
    LastComputeAt time.Time
    CreatorID   int64
    CreatedAt   time.Time
}
```

### 4.6 财务模块（Finance Domain）

```
POST /api/finance/customer/list             ← 供应商列表
POST /api/finance/share-ratio/list          ← 分成比例列表
POST /api/finance/share-ratio/create        ← 创建分成比例
POST /api/finance/reconciliation/list       ← 对账单列表
POST /api/finance/flow-reconciliation/edit  ← 编辑流水对账
GET  /api/finance/accounts-receivable/list  ← 应收账款列表
POST /api/finance/cost-data/upload          ← 上传成本数据
```

```go
// 分成比例（前端 RatioType: 1=平均 2=阶梯）
type ShareRatio struct {
    ID          int64          `gorm:"primaryKey"`
    SupplierID  int64          `gorm:"index"`
    Game        string         `gorm:"size:100"`
    Platform    string         `gorm:"size:50"`
    RatioType   int8           // 1-平均分成 2-阶梯分成
    Ratio       float64        // 平均分成比例
    Rates       datatypes.JSON // 阶梯分成比例列表
    Thresholds  datatypes.JSON // 阶梯阈值列表
    StartDate   time.Time
    EndDate     time.Time
    Status      int8           // 1-生效中 2-已过期
    CreatedAt   time.Time
}

// 流水对账
type FlowReconciliation struct {
    ID                int64          `gorm:"primaryKey"`
    SupplierID        int64          `gorm:"index"`
    SupplierName      string         `gorm:"size:100"`
    Game              string         `gorm:"size:100"`
    Platform          string         `gorm:"size:50"`
    MonthStat         string         `gorm:"size:10"` // YYYY-MM
    Stream            float64        // 流水
    OriginalAmount    float64        // 原始金额
    OriginalCurrency  string         `gorm:"size:10"`
    Currency          string         `gorm:"size:10"`
    StreamRate        float64        // 当期汇率
    EntryExchangeRate float64        // 入账汇率
    TaxRate           float64        // 税率
    TaxAmount         float64        // 税额
    InvoiceAmount     float64        // 开票金额
    InvoiceTime       *time.Time
    ReturnAmount      float64        // 回款金额
    ReturnTime        *time.Time
    OverdueDays       int
    Remarks           string         `gorm:"size:500"`
    IsInvoice         bool
    Status            int8
    ShareRatioInfo    datatypes.JSON
    CreatedAt         time.Time
    UpdatedAt         time.Time
}
```

### 4.7 站内信模块（Notice Domain）

```
GET    /api/notice/v1/list     ← 消息列表
POST   /api/notice/v1/add      ← 新增消息
PUT    /api/notice/v1/edit     ← 编辑消息
POST   /api/notice/v1/send     ← 发送消息
POST   /api/notice/v1/read     ← 标记已读
POST   /api/notice/v1/read-all ← 全部已读
GET    /api/notice/v1/stat     ← 未读消息数
DELETE /api/notice/v1/del      ← 删除消息
```

```go
type Notice struct {
    ID          int64          `gorm:"primaryKey"`
    ProjectID   int64          `gorm:"index"`
    Title       string         `gorm:"size:200"`
    Content     string         `gorm:"type:text"`
    Type        int8           // 1-系统通知 2-业务通知
    SendStatus  int8           // 1-草稿 2-已发送 3-已取消
    SenderID    int64
    SendAt      *time.Time
    ExpireAt    *time.Time
    TargetUsers datatypes.JSON // 目标用户列表 (空=全员)
    CreatedAt   time.Time
}

type NoticeReadLog struct {
    ID       int64     `gorm:"primaryKey"`
    NoticeID int64     `gorm:"index"`
    UserID   int64     `gorm:"index"`
    ReadAt   time.Time
}
```

### 4.8 任务调度模块（Task Domain）

```
GET    /api/task/v1/list    ← 任务列表
POST   /api/task/v1/create  ← 创建定时任务
PUT    /api/task/v1/update  ← 更新任务
DELETE /api/task/v1/delete  ← 删除任务
POST   /api/task/v1/run     ← 手动触发任务
```

```go
type ScheduledTask struct {
    ID          int64     `gorm:"primaryKey"`
    ProjectID   int64     `gorm:"index"`
    Name        string    `gorm:"size:100"`
    TaskType    string    `gorm:"size:50"` // email/export/compute
    CronExpr    string    `gorm:"size:100"`
    Config      datatypes.JSON // 任务参数
    Status      int8      // 1-启用 2-停用
    LastRunAt   *time.Time
    NextRunAt   *time.Time
    CreatorID   int64
    CreatedAt   time.Time
}
```

---

## 五、数据库设计

### 5.1 MySQL 核心表设计原则

```sql
-- 通用规范
-- 1. 所有表必须有 id(bigint, auto_increment), created_at, updated_at
-- 2. 业务软删除使用 deleted_at（GORM 自动处理）
-- 3. project_id 为多租户隔离键，所有业务表必须有
-- 4. 使用 JSON 类型存储动态配置（MySQL 8.0+）
-- 5. 字符集统一 utf8mb4，排序规则 utf8mb4_unicode_ci

-- 示例：Dashboard 表
CREATE TABLE `dashboards` (
    `id`          BIGINT NOT NULL AUTO_INCREMENT,
    `project_id`  BIGINT NOT NULL,
    `folder_id`   BIGINT DEFAULT 0,
    `name`        VARCHAR(200) NOT NULL,
    `description` VARCHAR(1000) DEFAULT '',
    `layout`      JSON,                    -- 拖拽布局配置
    `filters`     JSON,                    -- 全局筛选器
    `type`        TINYINT DEFAULT 1,       -- 1普通 2移动端
    `is_public`   TINYINT(1) DEFAULT 0,
    `creator_id`  BIGINT NOT NULL,
    `created_at`  DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at`  DATETIME DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_project_id` (`project_id`),
    KEY `idx_folder_id` (`folder_id`),
    KEY `idx_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 5.2 ClickHouse 事件表设计

```sql
-- 用户行为事件主表
CREATE TABLE events (
    project_id   String,
    event_name   String,
    user_id      String,
    device_id    String,
    event_time   DateTime,
    event_date   Date MATERIALIZED toDate(event_time),
    country      String,
    province     String,
    city         String,
    os           String,
    os_version   String,
    app_version  String,
    properties   String,   -- JSON 序列化的事件属性
    _partition   UInt32 MATERIALIZED toYYYYMM(event_time)
)
ENGINE = MergeTree()
PARTITION BY _partition
ORDER BY (project_id, event_name, event_date, user_id)
TTL event_date + INTERVAL 2 YEAR;

-- 用户属性表（宽表）
CREATE TABLE user_properties (
    project_id    String,
    user_id       String,
    first_seen    DateTime,
    last_seen     DateTime,
    country       String,
    -- 动态属性使用 Map 类型
    string_props  Map(String, String),
    int_props     Map(String, Int64),
    float_props   Map(String, Float64),
    date_props    Map(String, Date),
    sign          Int8 DEFAULT 1
)
ENGINE = CollapsingMergeTree(sign)
ORDER BY (project_id, user_id);
```

### 5.3 Redis 缓存策略

| 缓存 Key 模式 | TTL | 说明 |
|-------------|-----|------|
| `user:info:{user_id}` | 30min | 用户信息缓存 |
| `project:auth:{user_id}` | 15min | 用户项目权限 |
| `analysis:result:{hash}` | 5min | 分析查询结果缓存 |
| `dashboard:{id}` | 10min | 看板详情缓存 |
| `notice:unread:{user_id}` | 实时更新 | 未读消息数 |
| `tag:compute:lock:{tag_id}` | 执行时长 | 标签计算分布式锁 |
| `rate:limit:{user_id}:{api}` | 1min | 接口限流计数 |

```go
// pkg/cache/cache.go — Redis 缓存封装示例

type Cache interface {
    Get(ctx context.Context, key string) (string, error)
    Set(ctx context.Context, key string, val interface{}, ttl time.Duration) error
    Del(ctx context.Context, keys ...string) error
    Lock(ctx context.Context, key string, ttl time.Duration) (bool, error)
    Unlock(ctx context.Context, key string) error
}

// 分析结果缓存 key 生成（基于查询参数 hash）
func AnalysisCacheKey(queryParams interface{}) string {
    b, _ := json.Marshal(queryParams)
    h := md5.Sum(b)
    return fmt.Sprintf("analysis:result:%x", h)
}
```

---

## 六、API 设计规范

### 6.1 路由版本化

```
/api/v1/...   ← 当前主版本
/api/v2/...   ← 迭代新接口（与 v1 并行）
```

### 6.2 通用请求规范

```
Headers（必须）：
  Authorization: Bearer {jwt_token}
  PROJECT-ID: {project_id}
  trace-id: {uuid}              ← 前端自动生成
  X-UA: {browser/device info}
  language: zh-CN / en-US / ...
  href: {前端当前页面 URL}       ← 用于日志分析

特殊 Headers：
  config: {"forbiddenToast":true}    ← 禁止自动成功提示
  config: {"forbiddenErrorMsg":true} ← 禁止自动错误提示
  config: {"forbiddenCancelMsg":true} ← 禁止取消请求提示
```

### 6.3 分页规范

```go
// 统一分页请求参数
type PaginationParams struct {
    Page int `json:"page" form:"page" binding:"min=1"`
    Size int `json:"size" form:"size" binding:"min=1,max=500"`
}

// 响应固定格式：
// {
//   "code": 200,
//   "message": "success",
//   "data": {
//     "list": [...],
//     "page_info": {
//       "current_page": 1,
//       "page_size": 20,
//       "total_page": 5,
//       "total": 100
//     }
//   }
// }
```

### 6.4 Handler 层模板

```go
// internal/handler/dashboard.go

type DashboardHandler struct {
    svc service.DashboardService
}

// 创建看板
// POST /api/dashboard
func (h *DashboardHandler) CreateDashboard(c *gin.Context) {
    var req dto.CreateDashboardRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        response.Fail(c, errors.CodeParamError, err.Error())
        return
    }

    projectID := c.GetString("project_id")
    creatorID := c.GetInt64("user_id")

    dashboard, err := h.svc.CreateDashboard(c.Request.Context(), &service.CreateDashboardParams{
        ProjectID: projectID,
        CreatorID: creatorID,
        Name:      req.Name,
        Layout:    req.Layout,
    })
    if err != nil {
        response.Fail(c, errors.CodeServerError, err.Error())
        return
    }

    response.Success(c, dashboard)
}

// 看板列表
// GET /api/dashboards
func (h *DashboardHandler) ListDashboards(c *gin.Context) {
    var req dto.ListDashboardRequest
    if err := c.ShouldBindQuery(&req); err != nil {
        response.Fail(c, errors.CodeParamError, err.Error())
        return
    }

    projectID := c.GetString("project_id")
    result, err := h.svc.ListDashboards(c.Request.Context(), projectID, req)
    if err != nil {
        response.Fail(c, errors.CodeServerError, err.Error())
        return
    }

    response.SuccessList(c, result.List, result.PageInfo)
}
```

---

## 七、WebSocket 设计

前端 `src/components/Websocket/` 组件表明后端需要支持 WebSocket，用于以下场景：

```go
// internal/handler/ws.go

// WebSocket 连接管理
type WSHub struct {
    clients    map[string]*WSClient  // client_id → client
    broadcast  chan WSMessage
    register   chan *WSClient
    unregister chan *WSClient
    mu         sync.RWMutex
}

type WSMessage struct {
    Type    string      `json:"type"`   // notify/analysis_result/tag_compute
    Payload interface{} `json:"payload"`
}

// 使用场景：
// 1. 实时分析结果推送（耗时查询异步返回）
// 2. 标签计算进度推送
// 3. 站内消息实时通知
// 4. Dashboard 多人协作编辑状态同步
```

---

## 八、异步任务与消息队列

```go
// infra/kafka/consumer.go — 事件埋点数据消费

type EventConsumer struct {
    reader  *kafka.Reader
    ch      chan *EventRecord
    batcher *EventBatcher  // 批量写入 ClickHouse
}

// 写入策略：
// 1. 批量写入：每 1000 条 或 每 5 秒 批量写入 ClickHouse
// 2. 失败重试：指数退避，最多重试 3 次
// 3. 死信队列：超过重试次数写入 dead-letter-topic

// 订阅推送（邮件）
type EmailTaskConsumer struct {
    // 消费 subscription_email topic
    // 1. 获取订阅配置
    // 2. 执行分析查询
    // 3. 生成报告（HTML/Excel）
    // 4. 调用邮件服务发送
}
```

---

## 九、性能优化设计

### 9.1 分析查询优化

```go
// 1. 查询结果 Redis 缓存（5min TTL）
// 2. ClickHouse 查询并发控制（令牌桶限流）
// 3. 大数据量查询使用流式响应（SSE）
// 4. 复杂分析支持后台异步执行 + WebSocket 推送结果

type AnalysisService struct {
    querySemaphore chan struct{} // 控制并发查询数量（默认20）
    resultCache    cache.Cache
}

func (s *AnalysisService) Query(ctx context.Context, params *QueryParams) (*QueryResult, error) {
    // 1. 生成缓存 key，检查缓存
    cacheKey := cache.AnalysisCacheKey(params)
    if cached, err := s.resultCache.Get(ctx, cacheKey); err == nil {
        return deserializeResult(cached), nil
    }

    // 2. 并发控制
    select {
    case s.querySemaphore <- struct{}{}:
        defer func() { <-s.querySemaphore }()
    case <-ctx.Done():
        return nil, ctx.Err()
    }

    // 3. 执行查询
    result, err := s.executeQuery(ctx, params)
    if err != nil {
        return nil, err
    }

    // 4. 写缓存
    s.resultCache.Set(ctx, cacheKey, result, 5*time.Minute)
    return result, nil
}
```

### 9.2 大数值处理

前端需要处理 JS 无法精确表示的 int64，后端需要注意：

```go
// 对于 user_id 等大整数字段，响应时转为 string 类型
type UserVO struct {
    ID       string `json:"id"`        // int64 → string
    UserID   string `json:"user_id"`   // 防止 JS 精度丢失
    Name     string `json:"name"`
}
```

---

## 十、部署架构

```
                    ┌────────────────────────────────────────┐
                    │              用户浏览器                  │
                    └────────────────────────────────────────┘
                                        ↓ HTTPS
                    ┌────────────────────────────────────────┐
                    │         Nginx (反向代理 + CDN)           │
                    │    静态资源 → CDN / API → 后端集群       │
                    └────────────────────────────────────────┘
                          ↓                     ↓
              ┌───────────────────┐   ┌──────────────────────┐
              │   Go API Server   │   │   Go API Server      │
              │   (Pod 1)         │   │   (Pod 2)            │
              └───────────────────┘   └──────────────────────┘
                    ↓           ↓           ↓
    ┌───────────────┐  ┌─────────────┐  ┌──────────────┐
    │   MySQL       │  │ ClickHouse  │  │   Redis      │
    │  (主从复制)   │  │ (分析集群)  │  │  (哨兵模式)  │
    └───────────────┘  └─────────────┘  └──────────────┘
                              ↑
                    ┌──────────────────┐
                    │  Kafka Cluster   │
                    │ (埋点数据消费)   │
                    └──────────────────┘

容器化：Docker + Kubernetes
CI/CD：GitLab CI → Docker Build → Helm Deploy
监控：Prometheus + Grafana
日志：ELK Stack
```

---

## 十一、安全设计

| 安全措施 | 实现方式 |
|---------|---------|
| 鉴权 | JWT RS256 签名，access_token(2h) + refresh_token(7d) |
| HTTPS | Nginx TLS 终止，强制 HTTPS |
| SQL 注入 | GORM 参数化查询；ClickHouse 动态 SQL 白名单校验 |
| XSS | 富文本字段入库前 sanitize |
| 限流 | 接口级 Redis 令牌桶限流 |
| 数据权限 | 项目级多租户隔离，接口级 `data_policy` 权限校验 |
| 敏感数据 | 用户手机/邮件脱敏展示（中间位替换 *） |
| 操作审计 | 所有 CUD 操作记录 audit_log 表（操作人/时间/变更内容） |
| CORS | Nginx 配置允许域名白名单 |
| 密码加密 | bcrypt hash，禁止明文存储 |

---

## 十二、开发规范

### Makefile 命令

```makefile
.PHONY: run build test lint migrate

run:        # 本地开发运行
    go run cmd/server/main.go -env dev

build:      # 编译
    CGO_ENABLED=0 go build -o bin/server cmd/server/main.go

test:       # 单元测试
    go test ./... -cover

lint:       # 代码检查
    golangci-lint run ./...

migrate:    # 数据库迁移
    go run scripts/migration/main.go

swagger:    # 生成 API 文档
    swag init -g cmd/server/main.go -o docs/swagger
```

### 接口测试规范

- 所有 Handler 必须有对应的集成测试
- 使用 `httptest.NewRecorder` + `gin.TestMode`
- Mock 外部依赖（DB/Redis/Kafka）

---

> **报告说明**：本后端设计报告基于前端代码中的 API 路径枚举、数据类型定义（`typing.ts`）、请求参数结构等信息反推构建，覆盖了所有已识别的业务模块，可作为 Go 后端服务设计的完整参考蓝图。
