package handler

import (
	"time"

	"github.com/alldata/api-go/pkg/response"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var jwtSecret = []byte("alldata-jwt-secret-key-2024")

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token        string     `json:"token"`
	RefreshToken string     `json:"refresh_token"`
	UserInfo     *UserInfo  `json:"user_info"`
}

type UserInfo struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Role     string `json:"role"`
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}

	// Mock user validation (replace with DB query)
	if req.Username != "admin" || req.Password != "admin123" {
		response.Unauthorized(c, "用户名或密码错误")
		return
	}

	user := &UserInfo{
		ID:       1,
		Username: req.Username,
		Email:    "admin@alldata.com",
		Role:     "admin",
	}

	token, err := generateToken(user)
	if err != nil {
		response.InternalError(c, "生成 token 失败")
		return
	}

	refreshToken, err := generateRefreshToken(user)
	if err != nil {
		response.InternalError(c, "生成 refresh token 失败")
		return
	}

	response.Success(c, LoginResponse{
		Token:        token,
		RefreshToken: refreshToken,
		UserInfo:     user,
	})
}

func RefreshToken(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "缺少 refresh_token")
		return
	}

	claims := &jwt.MapClaims{}
	token, err := jwt.ParseWithClaims(req.RefreshToken, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})

	if err != nil || !token.Valid {
		response.Unauthorized(c, "Refresh token 无效或已过期")
		return
	}

	response.Success(c, gin.H{"token": req.RefreshToken})
}

func Logout(c *gin.Context) {
	response.Success(c, gin.H{"message": "登出成功"})
}

func GetUserInfo(c *gin.Context) {
	userID := c.GetInt("user_id")
	username := c.GetString("username")

	response.Success(c, &UserInfo{
		ID:       userID,
		Username: username,
		Email:    "admin@alldata.com",
		Role:     "admin",
	})
}

func generateToken(user *UserInfo) (string, error) {
	claims := jwt.MapClaims{
		"user_id":  user.ID,
		"username": user.Username,
		"email":    user.Email,
		"exp":      time.Now().Add(2 * time.Hour).Unix(),
		"iat":      time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

func generateRefreshToken(user *UserInfo) (string, error) {
	claims := jwt.MapClaims{
		"user_id":  user.ID,
		"username": user.Username,
		"exp":      time.Now().Add(7 * 24 * time.Hour).Unix(),
		"iat":      time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

func hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

func checkPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
