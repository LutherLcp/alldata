package handler

import (
	"strconv"

	"github.com/alldata/api-go/internal/model/entity"
	"github.com/alldata/api-go/internal/service"
	"github.com/alldata/api-go/pkg/response"
	"github.com/gin-gonic/gin"
)

var analysisSvc = service.NewAnalysisService()

// ListAnalysisQueries 分析查询列表
func ListAnalysisQueries(c *gin.Context) {
	projectID := getProjectID(c)
	queryType := c.Query("type")
	list := analysisSvc.List(projectID, queryType)
	if list == nil {
		list = []entity.AnalysisQuery{}
	}
	response.Success(c, list)
}

// GetAnalysisQuery 分析查询详情
func GetAnalysisQuery(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的查询 ID")
		return
	}
	query := analysisSvc.Get(id)
	if query == nil {
		response.NotFound(c, "分析查询不存在")
		return
	}
	response.Success(c, query)
}

// CreateAnalysisQuery 创建分析查询
func CreateAnalysisQuery(c *gin.Context) {
	var req struct {
		ProjectID int    `json:"project_id" binding:"required"`
		Name      string `json:"name" binding:"required"`
		QueryType string `json:"query_type" binding:"required"`
		Config    string `json:"config"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}
	query := &entity.AnalysisQuery{
		ProjectID: req.ProjectID,
		Name:      req.Name,
		QueryType: req.QueryType,
		Config:    req.Config,
		Status:    1,
		CreatedBy: c.GetInt("user_id"),
	}
	result := analysisSvc.Create(query)
	response.Created(c, result)
}

// UpdateAnalysisQuery 更新分析查询
func UpdateAnalysisQuery(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的查询 ID")
		return
	}
	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}
	result := analysisSvc.Update(id, updates)
	if result == nil {
		response.NotFound(c, "分析查询不存在")
		return
	}
	response.Success(c, result)
}

// DeleteAnalysisQuery 删除分析查询
func DeleteAnalysisQuery(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的查询 ID")
		return
	}
	if !analysisSvc.Delete(id) {
		response.NotFound(c, "分析查询不存在")
		return
	}
	response.Success(c, gin.H{"message": "删除成功"})
}

// ExecuteAnalysis 执行分析查询
func ExecuteAnalysis(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的查询 ID")
		return
	}
	result := analysisSvc.ExecuteQuery(id)
	if result == nil {
		response.NotFound(c, "分析查询不存在")
		return
	}
	response.Success(c, result)
}
