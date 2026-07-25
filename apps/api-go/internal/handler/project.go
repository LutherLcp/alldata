package handler

import (
	"strconv"

	"github.com/alldata/api-go/pkg/response"
	"github.com/gin-gonic/gin"
)

type Project struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Status      int    `json:"status"`
	CreatedAt   string `json:"created_at"`
}

func ListProjects(c *gin.Context) {
	// Mock data
	projects := []Project{
		{ID: 1, Name: "示例项目", Description: "这是一个示例项目", Status: 1, CreatedAt: "2024-01-01"},
		{ID: 2, Name: "测试项目", Description: "这是一个测试项目", Status: 1, CreatedAt: "2024-01-02"},
	}
	response.Success(c, projects)
}

func GetProject(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response.BadRequest(c, "无效的项目 ID")
		return
	}

	project := Project{
		ID:          id,
		Name:        "示例项目",
		Description: "这是一个示例项目",
		Status:      1,
		CreatedAt:   "2024-01-01",
	}
	response.Success(c, project)
}

type Dashboard struct {
	ID          int    `json:"id"`
	ProjectID   int    `json:"project_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Type        string `json:"type"`
	Status      int    `json:"status"`
	CreatedAt   string `json:"created_at"`
}

func ListDashboards(c *gin.Context) {
	projectID := c.GetHeader("Project-Id")
	if projectID == "" {
		projectID = "1"
	}

	dashboards := []Dashboard{
		{ID: 1, ProjectID: 1, Name: "核心指标看板", Description: "展示核心业务指标", Type: "dashboard", Status: 1, CreatedAt: "2024-01-01"},
		{ID: 2, ProjectID: 1, Name: "用户分析看板", Description: "用户行为分析", Type: "dashboard", Status: 1, CreatedAt: "2024-01-02"},
	}
	response.Success(c, dashboards)
}

func GetDashboard(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response.BadRequest(c, "无效的看板 ID")
		return
	}

	dashboard := Dashboard{
		ID:          id,
		ProjectID:   1,
		Name:        "核心指标看板",
		Description: "展示核心业务指标",
		Type:        "dashboard",
		Status:      1,
		CreatedAt:   "2024-01-01",
	}
	response.Success(c, dashboard)
}
