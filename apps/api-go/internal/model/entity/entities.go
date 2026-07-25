package entity

import "time"

// ─── 用户 ──────────────────────────────────

type User struct {
	ID        int       `gorm:"primaryKey;autoIncrement" json:"id"`
	Username  string    `gorm:"size:64;uniqueIndex;not null" json:"username"`
	Password  string    `gorm:"size:255;not null" json:"-"`
	Email     string    `gorm:"size:128" json:"email"`
	Role      string    `gorm:"size:32;default:'viewer'" json:"role"`
	Status    int       `gorm:"default:1" json:"status"` // 1=active, 2=disabled
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (User) TableName() string { return "users" }

// ─── 项目 ──────────────────────────────────

type Project struct {
	ID          int       `gorm:"primaryKey;autoIncrement" json:"id"`
	Name        string    `gorm:"size:128;not null" json:"name"`
	Description string    `gorm:"size:512" json:"description"`
	Status      int       `gorm:"default:1" json:"status"` // 1=active, 2=archived
	CreatedBy   int       `json:"created_by"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Project) TableName() string { return "projects" }

// ─── 看板 ──────────────────────────────────

type Dashboard struct {
	ID          int       `gorm:"primaryKey;autoIncrement" json:"id"`
	ProjectID   int       `gorm:"index;not null" json:"project_id"`
	Name        string    `gorm:"size:128;not null" json:"name"`
	Description string    `gorm:"size:512" json:"description"`
	Type        string    `gorm:"size:32;default:'dashboard'" json:"type"`
	Status      int       `gorm:"default:1" json:"status"`
	CreatedBy   int       `json:"created_by"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Dashboard) TableName() string { return "dashboards" }

// ─── 分析查询 ──────────────────────────────

type AnalysisQuery struct {
	ID          int       `gorm:"primaryKey;autoIncrement" json:"id"`
	ProjectID   int       `gorm:"index;not null" json:"project_id"`
	Name        string    `gorm:"size:128;not null" json:"name"`
	QueryType   string    `gorm:"size:32;not null" json:"query_type"` // funnel, retention, distribution, trend
	Config      string    `gorm:"type:text" json:"config"`            // JSON 配置
	Status      int       `gorm:"default:1" json:"status"`
	CreatedBy   int       `json:"created_by"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (AnalysisQuery) TableName() string { return "analysis_queries" }

// ─── 通知/站内信 ──────────────────────────

type Notice struct {
	ID        int       `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    int       `gorm:"index;not null" json:"user_id"`
	Title     string    `gorm:"size:256;not null" json:"title"`
	Content   string    `gorm:"type:text" json:"content"`
	Type      string    `gorm:"size:32" json:"type"` // system, alert, info
	IsRead    bool      `gorm:"default:false" json:"is_read"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (Notice) TableName() string { return "notices" }

// ─── 标签 ──────────────────────────────────

type Tag struct {
	ID        int       `gorm:"primaryKey;autoIncrement" json:"id"`
	ProjectID int       `gorm:"index;not null" json:"project_id"`
	Name      string    `gorm:"size:64;not null" json:"name"`
	Color     string    `gorm:"size:16" json:"color"`
	Type      string    `gorm:"size:32" json:"type"` // custom, system
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (Tag) TableName() string { return "tags" }

// ─── 版本日历 ──────────────────────────────

type CalendarEvent struct {
	ID          int       `gorm:"primaryKey;autoIncrement" json:"id"`
	ProjectID   int       `gorm:"index;not null" json:"project_id"`
	Title       string    `gorm:"size:256;not null" json:"title"`
	StartDate   string    `gorm:"size:32;not null" json:"start_date"`
	EndDate     string    `gorm:"size:32" json:"end_date"`
	Type        string    `gorm:"size:32;not null" json:"type"` // release, sprint, milestone
	Description string    `gorm:"size:1024" json:"description"`
	CreatedBy   int       `json:"created_by"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (CalendarEvent) TableName() string { return "calendar_events" }

// ─── 数据资产 — 数据表 ────────────────────

type DataTable struct {
	ID          int       `gorm:"primaryKey;autoIncrement" json:"id"`
	ProjectID   int       `gorm:"index;not null" json:"project_id"`
	Name        string    `gorm:"size:128;not null" json:"name"`
	Type        string    `gorm:"size:32;not null" json:"type"` // fact, dimension, aggregate
	Description string    `gorm:"size:512" json:"description"`
	Source      string    `gorm:"size:256" json:"source"`
	CreatedBy   int       `json:"created_by"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (DataTable) TableName() string { return "data_tables" }

// ─── 数据资产 — 数据集 ────────────────────

type Dataset struct {
	ID          int       `gorm:"primaryKey;autoIncrement" json:"id"`
	ProjectID   int       `gorm:"index;not null" json:"project_id"`
	Name        string    `gorm:"size:128;not null" json:"name"`
	Type        string    `gorm:"size:32;not null" json:"type"`
	Description string    `gorm:"size:512" json:"description"`
	TableID     int       `gorm:"index" json:"table_id"`
	CreatedBy   int       `json:"created_by"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Dataset) TableName() string { return "datasets" }

// ─── 数据资产 — 属性 ──────────────────────

type Attribute struct {
	ID          int       `gorm:"primaryKey;autoIncrement" json:"id"`
	ProjectID   int       `gorm:"index;not null" json:"project_id"`
	Name        string    `gorm:"size:128;not null" json:"name"`
	DataType    string    `gorm:"size:32;not null" json:"data_type"` // string, number, boolean, datetime
	CategoryID  int       `gorm:"index" json:"category_id"`
	Description string    `gorm:"size:512" json:"description"`
	CreatedBy   int       `json:"created_by"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (Attribute) TableName() string { return "attributes" }

// ─── 数据资产 — 分类 ──────────────────────

type Category struct {
	ID        int       `gorm:"primaryKey;autoIncrement" json:"id"`
	ProjectID int       `gorm:"index;not null" json:"project_id"`
	Name      string    `gorm:"size:64;not null" json:"name"`
	Type      string    `gorm:"size:32;not null" json:"type"` // event, user, page
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (Category) TableName() string { return "categories" }
