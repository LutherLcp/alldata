package handler

import (
	"strconv"
	"time"

	"github.com/alldata/api-go/internal/model/entity"
	"github.com/alldata/api-go/pkg/response"
	"github.com/gin-gonic/gin"
)

// mockCalendarEvents 模拟版本日历数据
var mockCalendarEvents = []entity.CalendarEvent{
	{ID: 1, ProjectID: 1, Title: "V2.0 发布", StartDate: "2024-03-01", EndDate: "2024-03-01", Type: "release", Description: "V2.0 版本发布", CreatedBy: 1, CreatedAt: time.Now()},
	{ID: 2, ProjectID: 1, Title: "Sprint 5", StartDate: "2024-02-15", EndDate: "2024-02-28", Type: "sprint", Description: "第五个迭代周期", CreatedBy: 1, CreatedAt: time.Now()},
	{ID: 3, ProjectID: 1, Title: "里程碑: 用户模块完成", StartDate: "2024-02-20", Type: "milestone", Description: "用户模块开发完成", CreatedBy: 1, CreatedAt: time.Now()},
}

// ListCalendarEvents 日历事件列表
func ListCalendarEvents(c *gin.Context) {
	projectID := getProjectID(c)
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	eventType := c.Query("type")

	var result []entity.CalendarEvent
	for _, e := range mockCalendarEvents {
		if e.ProjectID != projectID {
			continue
		}
		if eventType != "" && e.Type != eventType {
			continue
		}
		if startDate != "" && e.StartDate < startDate {
			continue
		}
		if endDate != "" && e.StartDate > endDate {
			continue
		}
		result = append(result, e)
	}
	if result == nil {
		result = []entity.CalendarEvent{}
	}
	response.Success(c, result)
}

// GetCalendarEvent 日历事件详情
func GetCalendarEvent(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的事件 ID")
		return
	}
	for _, e := range mockCalendarEvents {
		if e.ID == id {
			response.Success(c, e)
			return
		}
	}
	response.NotFound(c, "版本日历不存在")
}

// CreateCalendarEvent 创建日历事件
func CreateCalendarEvent(c *gin.Context) {
	var req struct {
		ProjectID   int    `json:"project_id" binding:"required"`
		Title       string `json:"title" binding:"required"`
		StartDate   string `json:"start_date" binding:"required"`
		EndDate     string `json:"end_date"`
		Type        string `json:"type" binding:"required"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}
	event := entity.CalendarEvent{
		ProjectID:   req.ProjectID,
		Title:       req.Title,
		StartDate:   req.StartDate,
		EndDate:     req.EndDate,
		Type:        req.Type,
		Description: req.Description,
		CreatedBy:   c.GetInt("user_id"),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	event.ID = len(mockCalendarEvents) + 1
	mockCalendarEvents = append(mockCalendarEvents, event)
	response.Created(c, event)
}

// UpdateCalendarEvent 更新日历事件
func UpdateCalendarEvent(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的事件 ID")
		return
	}
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}
	for i, e := range mockCalendarEvents {
		if e.ID == id {
			if title, ok := req["title"].(string); ok {
				mockCalendarEvents[i].Title = title
			}
			if startDate, ok := req["start_date"].(string); ok {
				mockCalendarEvents[i].StartDate = startDate
			}
			if endDate, ok := req["end_date"].(string); ok {
				mockCalendarEvents[i].EndDate = endDate
			}
			if desc, ok := req["description"].(string); ok {
				mockCalendarEvents[i].Description = desc
			}
			mockCalendarEvents[i].UpdatedAt = time.Now()
			response.Success(c, gin.H{"data": mockCalendarEvents[i], "message": "更新成功"})
			return
		}
	}
	response.NotFound(c, "版本日历不存在")
}

// DeleteCalendarEvent 删除日历事件
func DeleteCalendarEvent(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的事件 ID")
		return
	}
	for i, e := range mockCalendarEvents {
		if e.ID == id {
			mockCalendarEvents = append(mockCalendarEvents[:i], mockCalendarEvents[i+1:]...)
			response.Success(c, gin.H{"message": "删除成功"})
			return
		}
	}
	response.NotFound(c, "版本日历不存在")
}
