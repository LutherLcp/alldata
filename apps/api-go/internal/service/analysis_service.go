package service

import (
	"time"

	"github.com/alldata/api-go/internal/model/entity"
)

// AnalysisService 分析查询业务层
type AnalysisService struct{}

func NewAnalysisService() *AnalysisService {
	return &AnalysisService{}
}

// mockQueries 模拟分析查询数据
var mockQueries = []entity.AnalysisQuery{
	{ID: 1, ProjectID: 1, Name: "日活趋势分析", QueryType: "trend", Config: `{"metric":"dau","interval":"day"}`, Status: 1, CreatedAt: time.Now()},
	{ID: 2, ProjectID: 1, Name: "转化漏斗", QueryType: "funnel", Config: `{"steps":["visit","register","purchase"]}`, Status: 1, CreatedAt: time.Now()},
	{ID: 3, ProjectID: 1, Name: "用户留存", QueryType: "retention", Config: `{"period":"7d"}`, Status: 1, CreatedAt: time.Now()},
}

func (s *AnalysisService) List(projectID int, queryType string) []entity.AnalysisQuery {
	var result []entity.AnalysisQuery
	for _, q := range mockQueries {
		if q.ProjectID == projectID {
			if queryType == "" || q.QueryType == queryType {
				result = append(result, q)
			}
		}
	}
	return result
}

func (s *AnalysisService) Get(id int) *entity.AnalysisQuery {
	for _, q := range mockQueries {
		if q.ID == id {
			return &q
		}
	}
	return nil
}

func (s *AnalysisService) Create(query *entity.AnalysisQuery) *entity.AnalysisQuery {
	query.ID = len(mockQueries) + 1
	query.CreatedAt = time.Now()
	query.UpdatedAt = time.Now()
	mockQueries = append(mockQueries, *query)
	return query
}

func (s *AnalysisService) Update(id int, updates map[string]interface{}) *entity.AnalysisQuery {
	for i, q := range mockQueries {
		if q.ID == id {
			if name, ok := updates["name"].(string); ok {
				mockQueries[i].Name = name
			}
			if config, ok := updates["config"].(string); ok {
				mockQueries[i].Config = config
			}
			mockQueries[i].UpdatedAt = time.Now()
			return &mockQueries[i]
		}
	}
	return nil
}

func (s *AnalysisService) Delete(id int) bool {
	for i, q := range mockQueries {
		if q.ID == id {
			mockQueries = append(mockQueries[:i], mockQueries[i+1:]...)
			return true
		}
	}
	return false
}

// ExecuteQuery 模拟执行分析查询，返回模拟结果
func (s *AnalysisService) ExecuteQuery(id int) map[string]interface{} {
	query := s.Get(id)
	if query == nil {
		return nil
	}

	// 根据查询类型返回不同的模拟数据
	switch query.QueryType {
	case "trend":
		return map[string]interface{}{
			"type":   "trend",
			"labels": []string{"周一", "周二", "周三", "周四", "周五", "周六", "周日"},
			"values": []int{1200, 1350, 1180, 1420, 1560, 980, 870},
		}
	case "funnel":
		return map[string]interface{}{
			"type": "funnel",
			"steps": []map[string]interface{}{
				{"name": "访问", "count": 10000, "rate": 1.0},
				{"name": "注册", "count": 3500, "rate": 0.35},
				{"name": "购买", "count": 1200, "rate": 0.12},
			},
		}
	case "retention":
		return map[string]interface{}{
			"type": "retention",
			"rates": []float64{1.0, 0.65, 0.48, 0.38, 0.32, 0.28, 0.25},
			"days":  []int{0, 1, 2, 3, 4, 5, 6},
		}
	default:
		return map[string]interface{}{
			"type":   "distribution",
			"groups": []string{"0-18", "18-25", "25-35", "35-50", "50+"},
			"counts": []int{150, 420, 680, 350, 120},
		}
	}
}
