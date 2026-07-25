package database

import (
	"fmt"
	"sync"

	"github.com/alldata/api-go/internal/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var (
	db   *gorm.DB
	once sync.Once
)

// Init 初始化数据库连接（单例）
func Init(cfg *config.Config) *gorm.DB {
	once.Do(func() {
		dsn := fmt.Sprintf(
			"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Shanghai",
			cfg.DBHost, cfg.DBUser, cfg.DBPass, cfg.DBName, cfg.DBPort,
		)

		var err error
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Info),
		})
		if err != nil {
			panic(fmt.Sprintf("数据库连接失败: %v", err))
		}

		// 连接池配置
		sqlDB, err := db.DB()
		if err != nil {
			panic(fmt.Sprintf("获取数据库连接池失败: %v", err))
		}
		sqlDB.SetMaxIdleConns(10)
		sqlDB.SetMaxOpenConns(100)
	})
	return db
}

// GetDB 获取数据库实例
func GetDB() *gorm.DB {
	if db == nil {
		panic("数据库未初始化，请先调用 Init()")
	}
	return db
}

// Close 关闭数据库连接
func Close() error {
	if db != nil {
		sqlDB, err := db.DB()
		if err != nil {
			return err
		}
		return sqlDB.Close()
	}
	return nil
}
