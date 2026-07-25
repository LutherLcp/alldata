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

	// 初始化数据库
	// db := database.Init(cfg)

	// 创建 Gin 引擎
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.CORS())
	r.Use(middleware.RequestID())
	r.Use(middleware.TraceID())

	// 健康检查
	r.GET("/api/v1/health", func(c *gin.Context) {
		response.Success(c, gin.H{"status": "ok", "version": "1.0.0"})
	})

	// 公开路由
	public := r.Group("/api/v1")
	{
		public.POST("/login", handler.Login)
		public.POST("/refresh-token", handler.RefreshToken)
	}

	// 受保护路由
	protected := r.Group("/api/v1")
	protected.Use(middleware.JWTAuth(cfg.JWTSecret))
	{
		protected.GET("/user-info", handler.GetUserInfo)
		protected.POST("/logout", handler.Logout)

		// 项目
		protected.GET("/projects", handler.ListProjects)
		protected.GET("/projects/:id", handler.GetProject)

		// 看板
		protected.GET("/dashboards", handler.ListDashboards)
		protected.GET("/dashboards/:id", handler.GetDashboard)
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
