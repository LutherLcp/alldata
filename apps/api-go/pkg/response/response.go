package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Response 统一响应格式
type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
}

// Success 成功响应
func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Code:    200,
		Message: "success",
		Data:    data,
	})
}

// Created 创建成功
func Created(c *gin.Context, data interface{}) {
	c.JSON(http.StatusCreated, Response{
		Code:    201,
		Message: "created",
		Data:    data,
	})
}

// Error 错误响应
func Error(c *gin.Context, code int, message string) {
	c.JSON(code, Response{
		Code:    code,
		Message: message,
		Data:    nil,
	})
}

// BadRequest 400 错误
func BadRequest(c *gin.Context, message string) {
	Error(c, 400, message)
}

// Unauthorized 401 错误
func Unauthorized(c *gin.Context, message string) {
	Error(c, 401, message)
}

// Forbidden 403 错误
func Forbidden(c *gin.Context, message string) {
	Error(c, 403, message)
}

// NotFound 404 错误
func NotFound(c *gin.Context, message string) {
	Error(c, 404, message)
}

// InternalError 500 错误
func InternalError(c *gin.Context, message string) {
	Error(c, 500, message)
}

// Paginated 分页响应
type PaginatedData struct {
	List     interface{} `json:"list"`
	PageInfo PageInfo    `json:"page_info"`
}

type PageInfo struct {
	CurrentPage int   `json:"current_page"`
	PageSize    int   `json:"page_size"`
	TotalPage   int   `json:"total_page"`
	Total       int64 `json:"total"`
}

func Paginate(c *gin.Context, list interface{}, total int64, page, pageSize int) {
	totalPage := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPage++
	}
	c.JSON(http.StatusOK, Response{
		Code:    200,
		Message: "success",
		Data: PaginatedData{
			List: list,
			PageInfo: PageInfo{
				CurrentPage: page,
				PageSize:    pageSize,
				TotalPage:   totalPage,
				Total:       total,
			},
		},
	})
}
