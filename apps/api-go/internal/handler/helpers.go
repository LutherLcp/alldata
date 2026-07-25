package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

// getProjectID 从 header 或 query 参数中获取 project_id
func getProjectID(c *gin.Context) int {
	// 优先从 header 获取
	if pid := c.GetHeader("Project-Id"); pid != "" {
		id, err := strconv.Atoi(pid)
		if err == nil {
			return id
		}
	}
	// 从 query 参数获取
	if pid := c.Query("project_id"); pid != "" {
		id, err := strconv.Atoi(pid)
		if err == nil {
			return id
		}
	}
	return 1 // 默认项目
}
