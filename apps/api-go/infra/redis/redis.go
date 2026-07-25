package redis

import (
	"context"
	"sync"

	"github.com/alldata/api-go/internal/config"
	"github.com/redis/go-redis/v9"
)

var (
	rdb  *redis.Client
	once sync.Once
)

// Init 初始化 Redis 连接（单例）
func Init(cfg *config.Config) *redis.Client {
	once.Do(func() {
		rdb = redis.NewClient(&redis.Options{
			Addr:     cfg.RedisAddr,
			Password: "", // no password set
			DB:       0,  // use default DB
		})
	})
	return rdb
}

// GetRedis 获取 Redis 客户端实例
func GetRedis() *redis.Client {
	if rdb == nil {
		panic("Redis 未初始化，请先调用 Init()")
	}
	return rdb
}

// Close 关闭 Redis 连接
func Close() error {
	if rdb != nil {
		return rdb.Close()
	}
	return nil
}

// Ping 测试连接
func Ping() error {
	return GetRedis().Ping(context.Background()).Err()
}
