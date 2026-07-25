package service

import (
	"time"

	"github.com/alldata/api-go/internal/model/entity"
)

// TagService 标签业务层
type TagService struct{}

func NewTagService() *TagService {
	return &TagService{}
}

var mockTags = []entity.Tag{
	{ID: 1, ProjectID: 1, Name: "核心功能", Color: "#1890ff", Type: "custom", CreatedAt: time.Now()},
	{ID: 2, ProjectID: 1, Name: "高优先级", Color: "#f5222d", Type: "custom", CreatedAt: time.Now()},
	{ID: 3, ProjectID: 1, Name: "系统标签", Color: "#52c41a", Type: "system", CreatedAt: time.Now()},
}

func (s *TagService) List(projectID int, tagType string) []entity.Tag {
	var result []entity.Tag
	for _, t := range mockTags {
		if t.ProjectID == projectID {
			if tagType == "" || t.Type == tagType {
				result = append(result, t)
			}
		}
	}
	return result
}

func (s *TagService) Create(tag *entity.Tag) *entity.Tag {
	tag.ID = len(mockTags) + 1
	tag.CreatedAt = time.Now()
	mockTags = append(mockTags, *tag)
	return tag
}

func (s *TagService) Update(id int, updates map[string]interface{}) *entity.Tag {
	for i, t := range mockTags {
		if t.ID == id {
			if name, ok := updates["name"].(string); ok {
				mockTags[i].Name = name
			}
			if color, ok := updates["color"].(string); ok {
				mockTags[i].Color = color
			}
			return &mockTags[i]
		}
	}
	return nil
}

func (s *TagService) Delete(id int) bool {
	for i, t := range mockTags {
		if t.ID == id {
			mockTags = append(mockTags[:i], mockTags[i+1:]...)
			return true
		}
	}
	return false
}
