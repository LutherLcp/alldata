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


