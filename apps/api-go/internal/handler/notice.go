package handler

import (
	"github.com/alldata/api-go/internal/service"
	"github.com/alldata/api-go/pkg/response"
	"github.com/gin-gonic/gin"
)

var noticeSvc = service.NewNoticeService()

// ListNotices 通知列表
func ListNotices(c *gin.Context) {
	userID := c.GetInt("user_id")
	var isRead *bool
	if r := c.Query("is_read"); r != "" {
		val := r == "true"
		isRead = &val
	}
	list := noticeSvc.List(userID, isRead)
	response.Success(c, list)
}

// UnreadCount 未读通知数量
func UnreadCount(c *gin.Context) {
	userID := c.GetInt("user_id")
	count := noticeSvc.UnreadCount(userID)
	response.Success(c, gin.H{"count": count})
}

// MarkNoticesRead 标记通知为已读
func MarkNoticesRead(c *gin.Context) {
	var req struct {
		IDs []int `json:"ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}
	count := noticeSvc.MarkRead(req.IDs)
	response.Success(c, gin.H{"count": count})
}

// MarkAllNoticesRead 标记所有通知为已读
func MarkAllNoticesRead(c *gin.Context) {
	userID := c.GetInt("user_id")
	count := noticeSvc.MarkAllRead(userID)
	response.Success(c, gin.H{"count": count})
}
