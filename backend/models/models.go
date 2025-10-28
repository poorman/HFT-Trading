package models

import (
	"time"
)

// Order represents a trading order
type Order struct {
	ID              uint      `json:"id" gorm:"primaryKey"`
	ClientOrderID   string    `json:"client_order_id" gorm:"uniqueIndex"`
	OrderID         string    `json:"order_id" gorm:"uniqueIndex"`
	Symbol          string    `json:"symbol"`
	Side            string    `json:"side"` // BUY, SELL
	Quantity        float64   `json:"quantity"`
	Price           float64   `json:"price"`
	OrderType       string    `json:"order_type"` // LIMIT, MARKET, STOP
	Status          string    `json:"status"`     // NEW, PARTIALLY_FILLED, FILLED, REJECTED, CANCELED
	FilledQty       float64   `json:"filled_qty"`
	RemainingQty    float64   `json:"remaining_qty"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// Execution represents a trade execution
type Execution struct {
	ID              uint      `json:"id" gorm:"primaryKey"`
	OrderID         string    `json:"order_id"`
	ClientOrderID   string    `json:"client_order_id"`
	Symbol          string    `json:"symbol"`
	Side            string    `json:"side"`
	FillPrice       float64   `json:"fill_price"`
	FillQty         float64   `json:"fill_qty"`
	Timestamp       time.Time `json:"timestamp"`
	CreatedAt       time.Time `json:"created_at"`
}

// Position represents a trading position
type Position struct {
	Symbol         string    `json:"symbol"`
	Quantity       float64   `json:"quantity"`
	AvgPrice       float64   `json:"avg_price"`
	UnrealizedPnL  float64   `json:"unrealized_pnl"`
	RealizedPnL    float64   `json:"realized_pnl"`
	Timestamp      time.Time `json:"timestamp"`
}

// OrderRequest is the API request format
type OrderRequest struct {
	ClientOrderID string  `json:"client_order_id" binding:"required"`
	Symbol        string  `json:"symbol" binding:"required"`
	Side          string  `json:"side" binding:"required"`
	Quantity      float64 `json:"quantity" binding:"required,gt=0"`
	Price         float64 `json:"price"`  // Optional - required only for LIMIT orders
	OrderType     string  `json:"order_type"`
}

// OrderResponse is the API response format
type OrderResponse struct {
	Success        bool      `json:"success"`
	OrderID        string    `json:"order_id"`
	ClientOrderID  string    `json:"client_order_id"`
	Symbol         string    `json:"symbol"`
	Side           string    `json:"side"`
	Status         string    `json:"status"`
	FillPrice      float64   `json:"fill_price"`
	FillQty        float64   `json:"fill_qty"`
	RemainingQty   float64   `json:"remaining_qty"`
	Message        string    `json:"message"`
	Timestamp      int64     `json:"timestamp"`
}

// MoversPosition represents a position in the daily movers strategy
type MoversPosition struct {
	ID              uint      `json:"id" gorm:"primaryKey"`
	Symbol          string    `json:"symbol" gorm:"index"`
	PurchasePrice   float64   `json:"purchase_price"`
	PurchaseQuantity float64 `json:"purchase_quantity"`
	PurchaseTime    time.Time `json:"purchase_time"`
	PurchaseOrderID string    `json:"purchase_order_id"`
	SellPrice       *float64  `json:"sell_price"`
	SellQuantity    *float64  `json:"sell_quantity"`
	SellTime        *time.Time `json:"sell_time"`
	SellOrderID     *string   `json:"sell_order_id"`
	ProfitLoss      *float64  `json:"profit_loss"`
	ProfitPct       *float64  `json:"profit_pct"`
	Status          string    `json:"status" gorm:"index"` // 'open', 'closed', 'error'
	StrategyType    string    `json:"strategy_type" gorm:"default:'daily_movers'"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

