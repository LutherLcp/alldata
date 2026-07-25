package config

import "os"

type Config struct {
	Port      string
	JWTSecret string
	DBHost    string
	DBPort    string
	DBUser    string
	DBPass    string
	DBName    string
	RedisAddr string
	LogLevel  string
}

func Load() *Config {
	return &Config{
		Port:      getEnv("GO_PORT", "4001"),
		JWTSecret: getEnv("JWT_SECRET", "alldata-jwt-secret-key-2024"),
		DBHost:    getEnv("DB_HOST", "localhost"),
		DBPort:    getEnv("DB_PORT", "5432"),
		DBUser:    getEnv("DB_USER", "alldata"),
		DBPass:    getEnv("DB_PASS", "alldata123"),
		DBName:    getEnv("DB_NAME", "alldata"),
		RedisAddr: getEnv("REDIS_ADDR", "localhost:6379"),
		LogLevel:  getEnv("LOG_LEVEL", "info"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
