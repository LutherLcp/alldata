package handler

import (
	"fmt"
	"net/http"
	"time"

	"github.com/alldata/api-go/pkg/response"
	"github.com/gin-gonic/gin"
)

type ExportTaskResponse struct {
	ID        int       `json:"id"`
	TaskName  string    `json:"task_name"`
	TaskType  string    `json:"task_type"`
	Status    int       `json:"status"` // 1=排队 2=进行中 3=完成 4=失败
	Progress  int       `json:"progress"`
	FileURL   string    `json:"file_url,omitempty"`
	FileSize  int64     `json:"file_size,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

// ListExportTasks 获取导出任务列表
func ListExportTasks(c *gin.Context) {
	tasks := []ExportTaskResponse{
		{
			ID:        101,
			TaskName:  "用户行为序列明细导出_20260801",
			TaskType:  "analysis",
			Status:    3,
			Progress:  100,
			FileURL:   "/exports/user_timeline_20260801.csv",
			FileSize:  1548576,
			CreatedAt: time.Now().Add(-2 * time.Hour),
		},
		{
			ID:        102,
			TaskName:  "7月关键指标全量数据表导出",
			TaskType:  "datatable",
			Status:    2,
			Progress:  65,
			CreatedAt: time.Now().Add(-10 * time.Minute),
		},
	}

	response.Success(c, tasks)
}

// FastStreamExport 提供高性能 CSV 流式导出接口
func FastStreamExport(c *gin.Context) {
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=export_%d.csv", time.Now().Unix()))

	c.Writer.WriteHeader(http.StatusOK)
	c.Writer.WriteString("user_id,event_name,timestamp,page_url,device\n")

	for i := 1; i <= 50; i++ {
		line := fmt.Sprintf("user_%d,page_view,%s,/home,desktop\n", 10000+i, time.Now().Format("2006-01-02 15:04:05"))
		c.Writer.WriteString(line)
	}

	c.Writer.Flush()
}
