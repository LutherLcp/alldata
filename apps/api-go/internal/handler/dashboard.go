package handler

import (
	"strconv"

	"github.com/alldata/api-go/internal/model/entity"
	"github.com/alldata/api-go/internal/service"
	"github.com/alldata/api-go/pkg/response"
	"github.com/gin-gonic/gin"
)

var dashboardSvc = service.NewDashboardService()

// ListDashboards 看板列表
func ListDashboards(c *gin.Context) {
	projectID := getProjectID(c)
	list := dashboardSvc.List(projectID)
	if list == nil {
		list = []entity.Dashboard{}
	}
	response.Success(c, list)
}

// GetDashboard 看板详情
func GetDashboard(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的看板 ID")
		return
	}
	dashboard := dashboardSvc.Get(id)
	if dashboard == nil {
		response.NotFound(c, "看板不存在")
		return
	}
	response.Success(c, dashboard)
}

// CreateDashboard 创建看板
func CreateDashboard(c *gin.Context) {
	var req struct {
		ProjectID   int    `json:"project_id" binding:"required"`
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
		Type        string `json:"type"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}
	dashboard := &entity.Dashboard{
		ProjectID:   req.ProjectID,
		Name:        req.Name,
		Description: req.Description,
		Type:        req.Type,
		Status:      1,
		CreatedBy:   c.GetInt("user_id"),
	}
	result := dashboardSvc.Create(dashboard)
	response.Created(c, result)
}

// UpdateDashboard 更新看板
func UpdateDashboard(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的看板 ID")
		return
	}
	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}
	result := dashboardSvc.Update(id, updates)
	if result == nil {
		response.NotFound(c, "看板不存在")
		return
	}
	response.Success(c, result)
}

// DeleteDashboard 删除看板
func DeleteDashboard(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的看板 ID")
		return
	}
	if !dashboardSvc.Delete(id) {
		response.NotFound(c, "看板不存在")
		return
	}
	response.Success(c, gin.H{"message": "删除成功"})
}
