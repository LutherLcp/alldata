package handler

import (
	"strconv"

	"github.com/alldata/api-go/internal/model/entity"
	"github.com/alldata/api-go/internal/service"
	"github.com/alldata/api-go/pkg/response"
	"github.com/gin-gonic/gin"
)

var tagSvc = service.NewTagService()

// ListTags 标签列表
func ListTags(c *gin.Context) {
	projectID := getProjectID(c)
	tagType := c.Query("type")
	list := tagSvc.List(projectID, tagType)
	if list == nil {
		list = []entity.Tag{}
	}
	response.Success(c, list)
}

// CreateTag 创建标签
func CreateTag(c *gin.Context) {
	var req struct {
		ProjectID int    `json:"project_id" binding:"required"`
		Name      string `json:"name" binding:"required"`
		Color     string `json:"color"`
		Type      string `json:"type"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}
	tag := &entity.Tag{
		ProjectID: req.ProjectID,
		Name:      req.Name,
		Color:     req.Color,
		Type:      req.Type,
	}
	result := tagSvc.Create(tag)
	response.Created(c, result)
}

// UpdateTag 更新标签
func UpdateTag(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的标签 ID")
		return
	}
	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}
	result := tagSvc.Update(id, updates)
	if result == nil {
		response.NotFound(c, "标签不存在")
		return
	}
	response.Success(c, result)
}

// DeleteTag 删除标签
func DeleteTag(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的标签 ID")
		return
	}
	if !tagSvc.Delete(id) {
		response.NotFound(c, "标签不存在")
		return
	}
	response.Success(c, gin.H{"message": "删除成功"})
}
