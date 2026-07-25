package service

import (
	"time"

	"github.com/alldata/api-go/internal/model/entity"
)

// NoticeService 站内信业务层
type NoticeService struct{}

func NewNoticeService() *NoticeService {
	return &NoticeService{}
}

var mockNotices = []entity.Notice{
	{ID: 1, UserID: 1, Title: "系统升级通知", Content: "系统将于今晚 22:00 进行升级维护", Type: "system", IsRead: false, CreatedAt: time.Now()},
	{ID: 2, UserID: 1, Title: "预警触发", Content: "DAU 指标连续 3 天下降超过 10%", Type: "alert", IsRead: false, CreatedAt: time.Now()},
	{ID: 3, UserID: 1, Title: "欢迎使用", Content: "欢迎使用 AllData 数据分析平台", Type: "info", IsRead: true, CreatedAt: time.Now()},
}

func (s *NoticeService) List(userID int, isRead *bool) []entity.Notice {
	var result []entity.Notice
	for _, n := range mockNotices {
		if n.UserID == userID {
			if isRead == nil || n.IsRead == *isRead {
				result = append(result, n)
			}
		}
	}
	return result
}

func (s *NoticeService) MarkRead(ids []int) int {
	count := 0
	for i, n := range mockNotices {
		for _, id := range ids {
			if n.ID == id {
				mockNotices[i].IsRead = true
				count++
			}
		}
	}
	return count
}

func (s *NoticeService) MarkAllRead(userID int) int {
	count := 0
	for i, n := range mockNotices {
		if n.UserID == userID && !n.IsRead {
			mockNotices[i].IsRead = true
			count++
		}
	}
	return count
}

func (s *NoticeService) UnreadCount(userID int) int {
	count := 0
	for _, n := range mockNotices {
		if n.UserID == userID && !n.IsRead {
			count++
		}
	}
	return count
}
