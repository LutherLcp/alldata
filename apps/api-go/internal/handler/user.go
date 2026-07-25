package handler

import (
	"strconv"
	"time"

	"github.com/alldata/api-go/pkg/response"
	"github.com/gin-gonic/gin"
)

// mockUsers 模拟用户数据
var mockUsers = []map[string]interface{}{
	{"id": 1, "username": "admin", "email": "admin@alldata.com", "role": "admin", "status": 1, "created_at": "2024-01-01"},
	{"id": 2, "username": "zhangsan", "email": "zhangsan@alldata.com", "role": "editor", "status": 1, "created_at": "2024-01-02"},
	{"id": 3, "username": "lisi", "email": "lisi@alldata.com", "role": "viewer", "status": 1, "created_at": "2024-01-03"},
	{"id": 4, "username": "wangwu", "email": "wangwu@alldata.com", "role": "viewer", "status": 2, "created_at": "2024-01-04"},
}

// ListUsers 用户列表
func ListUsers(c *gin.Context) {
	keyword := c.Query("keyword")
	statusStr := c.Query("status")
	page := 1
	pageSize := 20

	if p := c.Query("page"); p != "" {
		if v, err := strconv.Atoi(p); err == nil {
			page = v
		}
	}
	if ps := c.Query("page_size"); ps != "" {
		if v, err := strconv.Atoi(ps); err == nil {
			pageSize = v
		}
	}

	var filtered []map[string]interface{}
	for _, u := range mockUsers {
		if keyword != "" {
			username := u["username"].(string)
			email := u["email"].(string)
			if !containsStr(username, keyword) && !containsStr(email, keyword) {
				continue
			}
		}
		if statusStr != "" {
			if s, err := strconv.Atoi(statusStr); err == nil {
				if u["status"].(int) != s {
					continue
				}
			}
		}
		filtered = append(filtered, u)
	}

	total := len(filtered)
	start := (page - 1) * pageSize
	end := start + pageSize
	if start > total {
		start = total
	}
	if end > total {
		end = total
	}

	response.Paginate(c, filtered[start:end], int64(total), page, pageSize)
}

// GetUser 用户详情
func GetUser(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的用户 ID")
		return
	}
	for _, u := range mockUsers {
		if u["id"].(int) == id {
			response.Success(c, u)
			return
		}
	}
	response.NotFound(c, "用户不存在")
}

// GetUserTimeline 用户行为时间线
func GetUserTimeline(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的用户 ID")
		return
	}

	timeline := []map[string]interface{}{
		{"id": 1, "user_id": id, "action": "login", "detail": "用户登录", "ip": "192.168.1.1", "created_at": time.Now().Add(-24 * time.Hour).Format(time.RFC3339)},
		{"id": 2, "user_id": id, "action": "view_dashboard", "detail": "查看核心指标看板", "ip": "192.168.1.1", "created_at": time.Now().Add(-12 * time.Hour).Format(time.RFC3339)},
		{"id": 3, "user_id": id, "action": "export_report", "detail": "导出分析报告", "ip": "192.168.1.1", "created_at": time.Now().Add(-6 * time.Hour).Format(time.RFC3339)},
	}
	response.Success(c, timeline)
}

// UpdateUserStatus 更新用户状态
func UpdateUserStatus(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的用户 ID")
		return
	}
	var req struct {
		Status int `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}
	if req.Status != 1 && req.Status != 2 {
		response.BadRequest(c, "status 必须为 1 或 2")
		return
	}
	for i, u := range mockUsers {
		if u["id"].(int) == id {
			mockUsers[i]["status"] = req.Status
			response.Success(c, gin.H{"data": mockUsers[i], "message": "更新成功"})
			return
		}
	}
	response.NotFound(c, "用户不存在")
}

func containsStr(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsSubstring(s, substr))
}

func containsSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
