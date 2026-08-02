package main

import (
	"log"
	"os"

	"github.com/alldata/api-go/internal/config"
	"github.com/alldata/api-go/internal/handler"
	"github.com/alldata/api-go/internal/middleware"
	"github.com/alldata/api-go/pkg/logger"
	"github.com/alldata/api-go/pkg/response"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// 加载环境变量
	_ = godotenv.Load()

	// 初始化配置
	cfg := config.Load()

	// 初始化日志
	logger.Init(cfg.LogLevel)

	// 创建 Gin 引擎
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.CORS())
	r.Use(middleware.RequestID())
	r.Use(middleware.TraceID())

	// 健康检查
	r.GET("/api/v1/health", func(c *gin.Context) {
		response.Success(c, gin.H{"status": "ok", "version": "7.0.0"})
	})

	// ─── 公开路由 (包含超高并发 100,000 QPS 埋点接收入口) ──
	public := r.Group("/api/v1")
	{
		public.POST("/login", handler.Login)
		public.POST("/refresh-token", handler.RefreshToken)
		public.POST("/track/batch", handler.TrackBatchIngest)
	}

	// ─── 受保护路由 ───────────────────────────
	protected := r.Group("/api/v1")
	protected.Use(middleware.JWTAuth(cfg.JWTSecret))
	{
		// 认证
		protected.GET("/user-info", handler.GetUserInfo)
		protected.POST("/logout", handler.Logout)

		// 项目
		protected.GET("/projects", handler.ListProjects)
		protected.GET("/projects/:id", handler.GetProject)

		// 看板
		protected.GET("/dashboards", handler.ListDashboards)
		protected.GET("/dashboards/:id", handler.GetDashboard)
		protected.POST("/dashboards", handler.CreateDashboard)
		protected.PUT("/dashboards/:id", handler.UpdateDashboard)
		protected.DELETE("/dashboards/:id", handler.DeleteDashboard)

		// 分析
		protected.GET("/analysis", handler.ListAnalysisQueries)
		protected.GET("/analysis/:id", handler.GetAnalysisQuery)
		protected.POST("/analysis", handler.CreateAnalysisQuery)
		protected.PUT("/analysis/:id", handler.UpdateAnalysisQuery)
		protected.DELETE("/analysis/:id", handler.DeleteAnalysisQuery)
		protected.POST("/analysis/:id/execute", handler.ExecuteAnalysis)

		// 通知
		protected.GET("/notices", handler.ListNotices)
		protected.GET("/notices/unread-count", handler.UnreadCount)
		protected.POST("/notices/read", handler.MarkNoticesRead)
		protected.POST("/notices/read-all", handler.MarkAllNoticesRead)

		// 标签
		protected.GET("/tags", handler.ListTags)
		protected.POST("/tags", handler.CreateTag)
		protected.PUT("/tags/:id", handler.UpdateTag)
		protected.DELETE("/tags/:id", handler.DeleteTag)

		// 用户
		protected.GET("/users", handler.ListUsers)
		protected.GET("/users/:id", handler.GetUser)
		protected.GET("/users/:id/timeline", handler.GetUserTimeline)
		protected.PUT("/users/:id/status", handler.UpdateUserStatus)

		// 版本日历
		protected.GET("/calendar", handler.ListCalendarEvents)
		protected.GET("/calendar/:id", handler.GetCalendarEvent)
		protected.POST("/calendar", handler.CreateCalendarEvent)
		protected.PUT("/calendar/:id", handler.UpdateCalendarEvent)
		protected.DELETE("/calendar/:id", handler.DeleteCalendarEvent)

		// 数据资产 — 数据表
		protected.GET("/assets/tables", handler.ListTables)
		protected.GET("/assets/tables/:id", handler.GetTable)
		protected.POST("/assets/tables", handler.CreateTable)
		protected.PUT("/assets/tables/:id", handler.UpdateTable)
		protected.DELETE("/assets/tables/:id", handler.DeleteTable)

		// 数据资产 — 数据集
		protected.GET("/assets/datasets", handler.ListDatasets)
		protected.GET("/assets/datasets/:id", handler.GetDataset)
		protected.POST("/assets/datasets", handler.CreateDataset)
		protected.PUT("/assets/datasets/:id", handler.UpdateDataset)
		protected.DELETE("/assets/datasets/:id", handler.DeleteDataset)

		// 数据资产 — 属性
		protected.GET("/assets/attributes", handler.ListAttributes)
		protected.POST("/assets/attributes", handler.CreateAttribute)
		protected.PUT("/assets/attributes/:id", handler.UpdateAttribute)
		protected.DELETE("/assets/attributes/:id", handler.DeleteAttribute)

		// 数据资产 — 分类
		protected.GET("/assets/categories", handler.ListCategories)
		protected.POST("/assets/categories", handler.CreateCategory)
		protected.DELETE("/assets/categories/:id", handler.DeleteCategory)

		// AI 智能服务
		protected.POST("/ai/chat", handler.AIChat)
		protected.POST("/ai/complete", handler.AIComplete)
		protected.POST("/ai/models", handler.AIModels)
		protected.GET("/ai/config", handler.AIConfig)
		protected.POST("/ai/insight", handler.AIInsight)
		protected.POST("/ai/anomaly/detect", handler.AIAnomalyDetect)
		protected.POST("/ai/anomaly/interpret", handler.AIAnomalyInterpret)

		// 导出与异步中心
		protected.GET("/exports", handler.ListExportTasks)
		protected.GET("/export/fast-stream", handler.FastStreamExport)
	}

	// 启动服务器
	port := cfg.Port
	if port == "" {
		port = "4001"
	}

	log.Printf("🚀 Go API Server starting on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Server failed: %v", err)
		os.Exit(1)
	}
}
