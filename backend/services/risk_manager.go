package services

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"sync"
	"time"

	"github.com/hft/backend/models"
)

// RiskManager handles all risk management validations and monitoring
type RiskManager struct {
	db          *DatabaseService
	redis       *RedisService
	limits      *models.RiskLimits
	wsHub       *WebSocketHub
	orderCache  *OrderThrottleCache
	mu          sync.RWMutex
	initialized bool
}

// NewRiskManager creates a new risk manager
func NewRiskManager(db *DatabaseService, redis *RedisService, wsHub *WebSocketHub) *RiskManager {
	rm := &RiskManager{
		db:         db,
		redis:      redis,
		wsHub:      wsHub,
		orderCache: NewOrderThrottleCache(redis),
	}

	// Load initial limits
	if err := rm.ReloadLimits(); err != nil {
		// Use default limits if loading fails
		rm.limits = &models.RiskLimits{
			MaxPositionSize:           10000.00,
			MaxOrderSize:              1000.00,
			DailyLossLimit:            5000.00,
			MaxPortfolioConcentration: 25.00,
			MaxLeverage:               2.00,
			MaxOrdersPerSecond:        10,
			Enabled:                   true,
		}
	}

	rm.initialized = true
	return rm
}

// ValidateOrder performs all risk checks on an order
func (rm *RiskManager) ValidateOrder(order *models.OrderRequest, effectivePosition float64) *models.RiskCheckResult {
	rm.mu.RLock()
	defer rm.mu.RUnlock()

	result := &models.RiskCheckResult{
		Allowed: true,
		Alerts:  []string{},
	}

	// Check if risk management is enabled
	if !rm.limits.Enabled {
		return result
	}

	// Check circuit breaker first
	if err := rm.CheckCircuitBreaker(); err != nil {
		result.Allowed = false
		result.RejectionReason = err.Error()
		result.Alerts = append(result.Alerts, "Circuit breaker active")
		return result
	}

	// Check daily loss limit
	if err := rm.CheckDailyLossLimit(); err != nil {
		result.Allowed = false
		result.RejectionReason = err.Error()
		result.Alerts = append(result.Alerts, "Daily loss limit reached")
		return result
	}

	// Check order size
	if err := rm.CheckOrderSize(order.Quantity, order.Price); err != nil {
		result.Allowed = false
		result.RejectionReason = err.Error()
		result.Alerts = append(result.Alerts, "Order size exceeds limit")
		return result
	}

	// Check position limit
	newPosition := effectivePosition
	if order.Side == "BUY" {
		newPosition += order.Quantity
	} else {
		newPosition -= order.Quantity
	}

	if err := rm.CheckPositionLimit(order.Symbol, order.Side, order.Quantity, effectivePosition); err != nil {
		result.Allowed = false
		result.RejectionReason = err.Error()
		result.Alerts = append(result.Alerts, "Position limit exceeded")
		return result
	}

	// Check order throttle
	if err := rm.CheckOrderThrottle("default"); err != nil {
		result.Allowed = false
		result.RejectionReason = err.Error()
		result.Alerts = append(result.Alerts, "Order rate limit exceeded")
		return result
	}

	return result
}

// CheckPositionLimit validates position size against limits
func (rm *RiskManager) CheckPositionLimit(symbol string, side string, quantity float64, currentPosition float64) error {
	rm.mu.RLock()
	defer rm.mu.RUnlock()

	// Calculate new position
	newPosition := currentPosition
	if side == "BUY" {
		newPosition += quantity
	} else {
		newPosition -= quantity
	}

	// Check against global max position size
	if math.Abs(newPosition) > rm.limits.MaxPositionSize {
		return fmt.Errorf("position would exceed max position size: %.2f > %.2f", math.Abs(newPosition), rm.limits.MaxPositionSize)
	}

	// Check against symbol-specific limit
	var posLimit models.PositionLimit
	result := rm.db.GetDB().Where("symbol = ?", symbol).First(&posLimit)
	if result.Error == nil {
		if math.Abs(newPosition) > posLimit.MaxPosition {
			return fmt.Errorf("position would exceed symbol limit for %s: %.2f > %.2f", symbol, math.Abs(newPosition), posLimit.MaxPosition)
		}
	}

	return nil
}

// CheckOrderSize validates order size against limit
func (rm *RiskManager) CheckOrderSize(quantity float64, price float64) error {
	rm.mu.RLock()
	defer rm.mu.RUnlock()

	orderValue := quantity * price
	if orderValue > rm.limits.MaxOrderSize {
		return fmt.Errorf("order size exceeds limit: $%.2f > $%.2f", orderValue, rm.limits.MaxOrderSize)
	}

	return nil
}

// CheckDailyLossLimit checks if daily loss limit has been reached
func (rm *RiskManager) CheckDailyLossLimit() error {
	pnl, err := rm.GetDailyPnL()
	if err != nil {
		return nil // Allow if can't check
	}

	if pnl.CircuitBreakerTriggered {
		return fmt.Errorf("daily loss limit triggered: circuit breaker active")
	}

	rm.mu.RLock()
	limit := rm.limits.DailyLossLimit
	rm.mu.RUnlock()

	if pnl.TotalPnL <= -limit {
		return fmt.Errorf("daily loss limit reached: $%.2f <= -$%.2f", pnl.TotalPnL, limit)
	}

	return nil
}

// CheckConcentrationLimit validates portfolio concentration
func (rm *RiskManager) CheckConcentrationLimit(symbol string, orderValue float64, portfolioValue float64) error {
	rm.mu.RLock()
	defer rm.mu.RUnlock()

	if portfolioValue <= 0 {
		return nil // Skip if portfolio value unknown
	}

	concentration := (orderValue / portfolioValue) * 100

	// Check global concentration limit
	if concentration > rm.limits.MaxPortfolioConcentration {
		return fmt.Errorf("order would exceed concentration limit: %.2f%% > %.2f%%", concentration, rm.limits.MaxPortfolioConcentration)
	}

	// Check symbol-specific concentration limit
	var posLimit models.PositionLimit
	result := rm.db.GetDB().Where("symbol = ?", symbol).First(&posLimit)
	if result.Error == nil {
		if concentration > posLimit.MaxConcentrationPct {
			return fmt.Errorf("order would exceed symbol concentration limit for %s: %.2f%% > %.2f%%", symbol, concentration, posLimit.MaxConcentrationPct)
		}
	}

	return nil
}

// CheckOrderThrottle validates order rate limit
func (rm *RiskManager) CheckOrderThrottle(clientID string) error {
	rm.mu.RLock()
	maxRate := rm.limits.MaxOrdersPerSecond
	rm.mu.RUnlock()

	return rm.orderCache.CheckRate(clientID, maxRate)
}

// CheckCircuitBreaker checks if circuit breaker is active
func (rm *RiskManager) CheckCircuitBreaker() error {
	var activeBreakers []models.CircuitBreakerEvent
	result := rm.db.GetDB().Where("active = ?", true).Find(&activeBreakers)
	
	if result.Error != nil {
		return nil // Allow if can't check
	}

	for _, breaker := range activeBreakers {
		// Check if breaker has expired
		if breaker.DurationSeconds > 0 {
			expiryTime := breaker.CreatedAt.Add(time.Duration(breaker.DurationSeconds) * time.Second)
			if time.Now().After(expiryTime) {
				// Auto-reset expired breaker
				rm.ResetCircuitBreaker(breaker.ID)
				continue
			}
		}

		return fmt.Errorf("circuit breaker active: %s (triggered at %s)", breaker.TriggerType, breaker.CreatedAt.Format(time.RFC3339))
	}

	return nil
}

// IsCircuitBreakerActive returns true if circuit breaker is active
func (rm *RiskManager) IsCircuitBreakerActive() bool {
	return rm.CheckCircuitBreaker() != nil
}

// UpdateDailyPnL updates the daily P&L tracking
func (rm *RiskManager) UpdateDailyPnL(realizedPnL, unrealizedPnL float64) error {
	today := time.Now().Format("2006-01-02")
	totalPnL := realizedPnL + unrealizedPnL

	// Update or insert today's P&L
	var pnl models.DailyPnLTracking
	result := rm.db.GetDB().Where("date = ?", today).First(&pnl)

	if result.Error != nil {
		// Create new record
		pnl = models.DailyPnLTracking{
			Date:          time.Now(),
			RealizedPnL:   realizedPnL,
			UnrealizedPnL: unrealizedPnL,
			TotalPnL:      totalPnL,
			UpdatedAt:     time.Now(),
		}
		rm.db.GetDB().Create(&pnl)
	} else {
		// Update existing record
		pnl.RealizedPnL = realizedPnL
		pnl.UnrealizedPnL = unrealizedPnL
		pnl.TotalPnL = totalPnL
		pnl.UpdatedAt = time.Now()
		rm.db.GetDB().Save(&pnl)
	}

	// Cache in Redis for fast access
	ctx := context.Background()
	key := "daily_pnl:latest"
	jsonData, _ := json.Marshal(pnl)
	rm.redis.client.Set(ctx, key, jsonData, 1*time.Hour)

	// Broadcast update via WebSocket
	if rm.wsHub != nil {
		rm.wsHub.BroadcastPnLUpdate(&pnl)
	}

	return nil
}

// GetDailyPnL retrieves today's P&L
func (rm *RiskManager) GetDailyPnL() (*models.DailyPnLTracking, error) {
	// Try Redis cache first
	ctx := context.Background()
	key := "daily_pnl:latest"
	cachedData, err := rm.redis.client.Get(ctx, key).Result()
	
	if err == nil {
		var pnl models.DailyPnLTracking
		if json.Unmarshal([]byte(cachedData), &pnl) == nil {
			return &pnl, nil
		}
	}

	// Fallback to database
	today := time.Now().Format("2006-01-02")
	var pnl models.DailyPnLTracking
	result := rm.db.GetDB().Where("date = ?", today).First(&pnl)

	if result.Error != nil {
		// Create today's record if it doesn't exist
		pnl = models.DailyPnLTracking{
			Date:          time.Now(),
			RealizedPnL:   0,
			UnrealizedPnL: 0,
			TotalPnL:      0,
		}
		rm.db.GetDB().Create(&pnl)
	}

	return &pnl, nil
}

// TriggerCircuitBreaker activates the circuit breaker
func (rm *RiskManager) TriggerCircuitBreaker(triggerType string, value, threshold float64) error {
	// Create circuit breaker event
	event := models.CircuitBreakerEvent{
		TriggerType:     triggerType,
		TriggerValue:    value,
		Threshold:       threshold,
		DurationSeconds: 0, // Infinite until manual reset
		Active:          true,
		CreatedAt:       time.Now(),
	}

	rm.db.GetDB().Create(&event)

	// Update daily P&L tracking
	today := time.Now().Format("2006-01-02")
	rm.db.GetDB().Model(&models.DailyPnLTracking{}).
		Where("date = ?", today).
		Update("circuit_breaker_triggered", true)

	// Send critical alert
	rm.SendAlert("CIRCUIT_BREAKER", "CRITICAL", "", 
		fmt.Sprintf("Circuit breaker triggered: %s (value: %.2f, threshold: %.2f)", triggerType, value, threshold),
		map[string]interface{}{
			"trigger_type":  triggerType,
			"trigger_value": value,
			"threshold":     threshold,
		})

	// Broadcast via WebSocket
	if rm.wsHub != nil {
		rm.wsHub.BroadcastCircuitBreaker(&event)
	}

	return nil
}

// ResetCircuitBreaker deactivates a circuit breaker
func (rm *RiskManager) ResetCircuitBreaker(breakerID uint) error {
	now := time.Now()
	result := rm.db.GetDB().Model(&models.CircuitBreakerEvent{}).
		Where("id = ?", breakerID).
		Updates(map[string]interface{}{
			"active":   false,
			"reset_at": now,
		})

	if result.Error != nil {
		return result.Error
	}

	// Send alert
	rm.SendAlert("CIRCUIT_BREAKER_RESET", "INFO", "",
		fmt.Sprintf("Circuit breaker %d reset at %s", breakerID, now.Format(time.RFC3339)),
		map[string]interface{}{"breaker_id": breakerID})

	return nil
}

// SendAlert creates and broadcasts a risk alert
func (rm *RiskManager) SendAlert(alertType, severity, symbol, message string, metadata map[string]interface{}) error {
	metadataJSON, _ := json.Marshal(metadata)

	alert := models.RiskAlert{
		AlertType: alertType,
		Severity:  severity,
		Symbol:    symbol,
		Message:   message,
		Metadata:  string(metadataJSON),
		CreatedAt: time.Now(),
	}

	// Save to database
	rm.db.GetDB().Create(&alert)

	// Broadcast via WebSocket
	if rm.wsHub != nil {
		rm.wsHub.BroadcastAlert(&alert)
	}

	return nil
}

// ReloadLimits reloads risk limits from database
func (rm *RiskManager) ReloadLimits() error {
	var limits models.RiskLimits
	result := rm.db.GetDB().Order("id DESC").First(&limits)

	if result.Error != nil {
		return result.Error
	}

	rm.mu.Lock()
	rm.limits = &limits
	rm.mu.Unlock()

	// Cache in Redis
	ctx := context.Background()
	key := "risk_limits:active"
	jsonData, _ := json.Marshal(limits)
	rm.redis.client.Set(ctx, key, jsonData, 1*time.Hour)

	return nil
}

// UpdateLimit updates a specific risk limit
func (rm *RiskManager) UpdateLimit(update *models.RiskLimitsUpdate) error {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	var limits models.RiskLimits
	result := rm.db.GetDB().Order("id DESC").First(&limits)
	if result.Error != nil {
		return result.Error
	}

	// Apply updates
	if update.MaxPositionSize != nil {
		limits.MaxPositionSize = *update.MaxPositionSize
	}
	if update.MaxOrderSize != nil {
		limits.MaxOrderSize = *update.MaxOrderSize
	}
	if update.DailyLossLimit != nil {
		limits.DailyLossLimit = *update.DailyLossLimit
	}
	if update.MaxPortfolioConcentration != nil {
		limits.MaxPortfolioConcentration = *update.MaxPortfolioConcentration
	}
	if update.MaxLeverage != nil {
		limits.MaxLeverage = *update.MaxLeverage
	}
	if update.MaxOrdersPerSecond != nil {
		limits.MaxOrdersPerSecond = *update.MaxOrdersPerSecond
	}
	if update.Enabled != nil {
		limits.Enabled = *update.Enabled
	}

	limits.UpdatedAt = time.Now()
	rm.db.GetDB().Save(&limits)

	// Reload
	rm.limits = &limits

	return nil
}

// GetLimits returns current risk limits
func (rm *RiskManager) GetLimits() *models.RiskLimits {
	rm.mu.RLock()
	defer rm.mu.RUnlock()
	return rm.limits
}

