package service

import (
	"time"

	"github.com/alldata/api-go/internal/model/entity"
)

// DashboardService 看板业务层
type DashboardService struct{}

func NewDashboardService() *DashboardService {
	return &DashboardService{}
}

// mockDashboards 模拟看板数据
var mockDashboards = []entity.Dashboard{
	{ID: 1, ProjectID: 1, Name: "核心指标看板", Description: "展示核心业务指标", Type: "dashboard", Status: 1, CreatedAt: time.Now()},
	{ID: 2, ProjectID: 1, Name: "用户分析看板", Description: "用户行为分析看板", Type: "dashboard", Status: 1, CreatedAt: time.Now()},
	{ID: 3, ProjectID: 1, Name: "财务概览", Description: "财务数据汇总看板", Type: "report", Status: 1, CreatedAt: time.Now()},
}

func (s *DashboardService) List(projectID int) []entity.Dashboard {
	var result []entity.Dashboard
	for _, d := range mockDashboards {
		if d.ProjectID == projectID {
			result = append(result, d)
		}
	}
	return result
}

func (s *DashboardService) Get(id int) *entity.Dashboard {
	for _, d := range mockDashboards {
		if d.ID == id {
			return &d
		}
	}
	return nil
}

func (s *DashboardService) Create(dashboard *entity.Dashboard) *entity.Dashboard {
	dashboard.ID = len(mockDashboards) + 1
	dashboard.CreatedAt = time.Now()
	dashboard.UpdatedAt = time.Now()
	mockDashboards = append(mockDashboards, *dashboard)
	return dashboard
}

func (s *DashboardService) Update(id int, updates map[string]interface{}) *entity.Dashboard {
	for i, d := range mockDashboards {
		if d.ID == id {
			if name, ok := updates["name"].(string); ok {
				mockDashboards[i].Name = name
			}
			if desc, ok := updates["description"].(string); ok {
				mockDashboards[i].Description = desc
			}
			mockDashboards[i].UpdatedAt = time.Now()
			return &mockDashboards[i]
		}
	}
	return nil
}

func (s *DashboardService) Delete(id int) bool {
	for i, d := range mockDashboards {
		if d.ID == id {
			mockDashboards = append(mockDashboards[:i], mockDashboards[i+1:]...)
			return true
		}
	}
	return false
}
