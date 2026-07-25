package handler

import (
	"strconv"
	"time"

	"github.com/alldata/api-go/pkg/response"
	"github.com/gin-gonic/gin"
)

// ─── 模拟数据 ──────────────────────────────

var mockTables = []map[string]interface{}{
	{"id": 1, "project_id": 1, "name": "user_events", "type": "fact", "description": "用户事件表", "source": "kafka", "created_by": 1, "created_at": "2024-01-01"},
	{"id": 2, "project_id": 1, "name": "user_profiles", "type": "dimension", "description": "用户画像维度表", "source": "mysql", "created_by": 1, "created_at": "2024-01-02"},
}

var mockDatasets = []map[string]interface{}{
	{"id": 1, "project_id": 1, "name": "日活数据集", "type": "daily", "description": "每日活跃用户数据", "table_id": 1, "created_by": 1, "created_at": "2024-01-01"},
	{"id": 2, "project_id": 1, "name": "转化漏斗数据", "type": "funnel", "description": "转化漏斗分析数据", "table_id": 1, "created_by": 1, "created_at": "2024-01-02"},
}

var mockAttributes = []map[string]interface{}{
	{"id": 1, "project_id": 1, "name": "user_id", "data_type": "number", "category_id": 1, "description": "用户ID", "created_by": 1, "created_at": "2024-01-01"},
	{"id": 2, "project_id": 1, "name": "event_name", "data_type": "string", "category_id": 1, "description": "事件名称", "created_by": 1, "created_at": "2024-01-01"},
	{"id": 3, "project_id": 1, "name": "event_time", "data_type": "datetime", "category_id": 1, "description": "事件时间", "created_by": 1, "created_at": "2024-01-01"},
}

var mockCategories = []map[string]interface{}{
	{"id": 1, "project_id": 1, "name": "事件属性", "type": "event", "created_at": "2024-01-01"},
	{"id": 2, "project_id": 1, "name": "用户属性", "type": "user", "created_at": "2024-01-01"},
	{"id": 3, "project_id": 1, "name": "页面属性", "type": "page", "created_at": "2024-01-01"},
}

// ─── 数据表 Handler ─────────────────────────

func ListTables(c *gin.Context) {
	projectID := getProjectID(c)
	tableType := c.Query("type")
	var result []map[string]interface{}
	for _, t := range mockTables {
		if t["project_id"].(int) != projectID {
			continue
		}
		if tableType != "" && t["type"].(string) != tableType {
			continue
		}
		result = append(result, t)
	}
	if result == nil {
		result = []map[string]interface{}{}
	}
	response.Success(c, result)
}

func GetTable(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的数据表 ID")
		return
	}
	for _, t := range mockTables {
		if t["id"].(int) == id {
			response.Success(c, t)
			return
		}
	}
	response.NotFound(c, "数据表不存在")
}

func CreateTable(c *gin.Context) {
	var req struct {
		ProjectID   int    `json:"project_id" binding:"required"`
		Name        string `json:"name" binding:"required"`
		Type        string `json:"type" binding:"required"`
		Description string `json:"description"`
		Source      string `json:"source"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}
	table := map[string]interface{}{
		"id":         len(mockTables) + 1,
		"project_id": req.ProjectID,
		"name":       req.Name,
		"type":       req.Type,
		"description": req.Description,
		"source":     req.Source,
		"created_by": c.GetInt("user_id"),
		"created_at": time.Now().Format("2006-01-02"),
	}
	mockTables = append(mockTables, table)
	response.Created(c, table)
}

func UpdateTable(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的数据表 ID")
		return
	}
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}
	for i, t := range mockTables {
		if t["id"].(int) == id {
			for k, v := range req {
				mockTables[i][k] = v
			}
			response.Success(c, gin.H{"data": mockTables[i], "message": "更新成功"})
			return
		}
	}
	response.NotFound(c, "数据表不存在")
}

func DeleteTable(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的数据表 ID")
		return
	}
	for i, t := range mockTables {
		if t["id"].(int) == id {
			mockTables = append(mockTables[:i], mockTables[i+1:]...)
			response.Success(c, gin.H{"message": "删除成功"})
			return
		}
	}
	response.NotFound(c, "数据表不存在")
}

// ─── 数据集 Handler ─────────────────────────

func ListDatasets(c *gin.Context) {
	projectID := getProjectID(c)
	dsType := c.Query("type")
	var result []map[string]interface{}
	for _, d := range mockDatasets {
		if d["project_id"].(int) != projectID {
			continue
		}
		if dsType != "" && d["type"].(string) != dsType {
			continue
		}
		result = append(result, d)
	}
	if result == nil {
		result = []map[string]interface{}{}
	}
	response.Success(c, result)
}

func GetDataset(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的数据集 ID")
		return
	}
	for _, d := range mockDatasets {
		if d["id"].(int) == id {
			response.Success(c, d)
			return
		}
	}
	response.NotFound(c, "数据集不存在")
}

func CreateDataset(c *gin.Context) {
	var req struct {
		ProjectID   int    `json:"project_id" binding:"required"`
		Name        string `json:"name" binding:"required"`
		Type        string `json:"type" binding:"required"`
		Description string `json:"description"`
		TableID     int    `json:"table_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}
	ds := map[string]interface{}{
		"id":          len(mockDatasets) + 1,
		"project_id":  req.ProjectID,
		"name":        req.Name,
		"type":        req.Type,
		"description": req.Description,
		"table_id":    req.TableID,
		"created_by":  c.GetInt("user_id"),
		"created_at":  time.Now().Format("2006-01-02"),
	}
	mockDatasets = append(mockDatasets, ds)
	response.Created(c, ds)
}

func UpdateDataset(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的数据集 ID")
		return
	}
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}
	for i, d := range mockDatasets {
		if d["id"].(int) == id {
			for k, v := range req {
				mockDatasets[i][k] = v
			}
			response.Success(c, gin.H{"data": mockDatasets[i], "message": "更新成功"})
			return
		}
	}
	response.NotFound(c, "数据集不存在")
}

func DeleteDataset(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的数据集 ID")
		return
	}
	for i, d := range mockDatasets {
		if d["id"].(int) == id {
			mockDatasets = append(mockDatasets[:i], mockDatasets[i+1:]...)
			response.Success(c, gin.H{"message": "删除成功"})
			return
		}
	}
	response.NotFound(c, "数据集不存在")
}

// ─── 属性 Handler ───────────────────────────

func ListAttributes(c *gin.Context) {
	projectID := getProjectID(c)
	categoryIDStr := c.Query("category_id")
	var result []map[string]interface{}
	for _, a := range mockAttributes {
		if a["project_id"].(int) != projectID {
			continue
		}
		if categoryIDStr != "" {
			if catID, err := strconv.Atoi(categoryIDStr); err == nil {
				if a["category_id"].(int) != catID {
					continue
				}
			}
		}
		result = append(result, a)
	}
	if result == nil {
		result = []map[string]interface{}{}
	}
	response.Success(c, result)
}

func CreateAttribute(c *gin.Context) {
	var req struct {
		ProjectID   int    `json:"project_id" binding:"required"`
		Name        string `json:"name" binding:"required"`
		DataType    string `json:"data_type" binding:"required"`
		CategoryID  int    `json:"category_id"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}
	attr := map[string]interface{}{
		"id":          len(mockAttributes) + 1,
		"project_id":  req.ProjectID,
		"name":        req.Name,
		"data_type":   req.DataType,
		"category_id": req.CategoryID,
		"description": req.Description,
		"created_by":  c.GetInt("user_id"),
		"created_at":  time.Now().Format("2006-01-02"),
	}
	mockAttributes = append(mockAttributes, attr)
	response.Created(c, attr)
}

func UpdateAttribute(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的属性 ID")
		return
	}
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}
	for i, a := range mockAttributes {
		if a["id"].(int) == id {
			for k, v := range req {
				mockAttributes[i][k] = v
			}
			response.Success(c, gin.H{"data": mockAttributes[i], "message": "更新成功"})
			return
		}
	}
	response.NotFound(c, "属性不存在")
}

func DeleteAttribute(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的属性 ID")
		return
	}
	for i, a := range mockAttributes {
		if a["id"].(int) == id {
			mockAttributes = append(mockAttributes[:i], mockAttributes[i+1:]...)
			response.Success(c, gin.H{"message": "删除成功"})
			return
		}
	}
	response.NotFound(c, "属性不存在")
}

// ─── 分类 Handler ───────────────────────────

func ListCategories(c *gin.Context) {
	projectID := getProjectID(c)
	catType := c.Query("type")
	var result []map[string]interface{}
	for _, cat := range mockCategories {
		if cat["project_id"].(int) != projectID {
			continue
		}
		if catType != "" && cat["type"].(string) != catType {
			continue
		}
		result = append(result, cat)
	}
	if result == nil {
		result = []map[string]interface{}{}
	}
	response.Success(c, result)
}

func CreateCategory(c *gin.Context) {
	var req struct {
		ProjectID int    `json:"project_id" binding:"required"`
		Name      string `json:"name" binding:"required"`
		Type      string `json:"type" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}
	cat := map[string]interface{}{
		"id":         len(mockCategories) + 1,
		"project_id": req.ProjectID,
		"name":       req.Name,
		"type":       req.Type,
		"created_at": time.Now().Format("2006-01-02"),
	}
	mockCategories = append(mockCategories, cat)
	response.Created(c, cat)
}

func DeleteCategory(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的分类 ID")
		return
	}
	for i, cat := range mockCategories {
		if cat["id"].(int) == id {
			mockCategories = append(mockCategories[:i], mockCategories[i+1:]...)
			response.Success(c, gin.H{"message": "删除成功"})
			return
		}
	}
	response.NotFound(c, "分类不存在")
}
