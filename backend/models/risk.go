package models

import (
	"time"
)

// RiskLimits represents global risk management parameters
type RiskLimits struct {
	ID                        uint      `json:"id" gorm:"primaryKey"`
	MaxPositionSize           float64   `json:"max_position_size" gorm:"type:decimal(20,8)"`
	MaxOrderSize              float64   `json:"max_order_size" gorm:"type:decimal(20,8)"`
	DailyLossLimit            float64   `json:"daily_loss_limit" gorm:"type:decimal(20,8)"`
	MaxPortfolioConcentration float64   `json:"max_portfolio_concentration" gorm:"type:decimal(5,2)"`
	MaxLeverage               float64   `json:"max_leverage" gorm:"type:decimal(5,2)"`
	MaxOrdersPerSecond        int       `json:"max_orders_per_second"`
	Enabled                   bool      `json:"enabled" gorm:"default:true"`
	UpdatedAt                 time.Time `json:"updated_at"`
	CreatedAt                 time.Time `json:"created_at"`
}

// PositionLimit represents per-symbol position limits
type PositionLimit struct {
	Symbol              string    `json:"symbol" gorm:"primaryKey"`
	MaxPosition         float64   `json:"max_position" gorm:"type:decimal(20,8)"`
	MaxConcentrationPct float64   `json:"max_concentration_pct" gorm:"type:decimal(5,2)"`
	UpdatedAt           time.Time `json:"updated_at"`
	CreatedAt           time.Time `json:"created_at"`
}

// RiskAlert represents a risk management alert or violation
type RiskAlert struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	AlertType string    `json:"alert_type" gorm:"index"`
	Severity  string    `json:"severity" gorm:"index"`
	Symbol    string    `json:"symbol"`
	Message   string    `json:"message"`
	Metadata  string    `json:"metadata" gorm:"type:jsonb"` // JSON string
	CreatedAt time.Time `json:"created_at" gorm:"index:idx_risk_alerts_created_at"`
}

// DailyPnLTracking represents daily profit/loss tracking
type DailyPnLTracking struct {
	Date                    time.Time `json:"date" gorm:"primaryKey;type:date"`
	RealizedPnL             float64   `json:"realized_pnl" gorm:"type:decimal(20,8);default:0"`
	UnrealizedPnL           float64   `json:"unrealized_pnl" gorm:"type:decimal(20,8);default:0"`
	TotalPnL                float64   `json:"total_pnl" gorm:"type:decimal(20,8);default:0"`
	CircuitBreakerTriggered bool      `json:"circuit_breaker_triggered" gorm:"default:false"`
	UpdatedAt               time.Time `json:"updated_at"`
	CreatedAt               time.Time `json:"created_at"`
}

// CircuitBreakerEvent represents a circuit breaker activation
type CircuitBreakerEvent struct {
	ID              uint       `json:"id" gorm:"primaryKey"`
	TriggerType     string     `json:"trigger_type"`
	TriggerValue    float64    `json:"trigger_value" gorm:"type:decimal(20,8)"`
	Threshold       float64    `json:"threshold" gorm:"type:decimal(20,8)"`
	DurationSeconds int        `json:"duration_seconds"`
	Active          bool       `json:"active" gorm:"default:true;index:idx_circuit_breaker_active"`
	CreatedAt       time.Time  `json:"created_at" gorm:"index:idx_circuit_breaker_active"`
	ResetAt         *time.Time `json:"reset_at"`
}

// RiskCheckResult represents the result of a risk validation check
type RiskCheckResult struct {
	Allowed         bool     `json:"allowed"`
	RejectionReason string   `json:"rejection_reason"`
	Alerts          []string `json:"alerts"`
}

// RiskLimitsUpdate represents a request to update risk limits
type RiskLimitsUpdate struct {
	MaxPositionSize           *float64 `json:"max_position_size"`
	MaxOrderSize              *float64 `json:"max_order_size"`
	DailyLossLimit            *float64 `json:"daily_loss_limit"`
	MaxPortfolioConcentration *float64 `json:"max_portfolio_concentration"`
	MaxLeverage               *float64 `json:"max_leverage"`
	MaxOrdersPerSecond        *int     `json:"max_orders_per_second"`
	Enabled                   *bool    `json:"enabled"`
}

// PositionLimitUpdate represents a request to update position limits for a symbol
type PositionLimitUpdate struct {
	MaxPosition         float64 `json:"max_position" binding:"required"`
	MaxConcentrationPct float64 `json:"max_concentration_pct" binding:"required"`
}

