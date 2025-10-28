package services

import (
	"context"
	"fmt"
	"strconv"
	"time"
)

// PositionTracker tracks current and pending positions
type PositionTracker struct {
	db     *DatabaseService
	redis  *RedisService
	engine *EngineClient
}

// NewPositionTracker creates a new position tracker
func NewPositionTracker(db *DatabaseService, redis *RedisService, engine *EngineClient) *PositionTracker {
	return &PositionTracker{
		db:     db,
		redis:  redis,
		engine: engine,
	}
}

// GetEffectivePosition returns the effective position including pending orders
// Effective Position = Current Filled Position + Pending Buys - Pending Sells
func (pt *PositionTracker) GetEffectivePosition(symbol string) (float64, error) {
	// Get filled position from Alpaca via engine
	currentPos, err := pt.getFilledPosition(symbol)
	if err != nil {
		return 0, fmt.Errorf("failed to get filled position: %w", err)
	}

	// Get pending buy orders
	pendingBuys, err := pt.getPendingOrders(symbol, "BUY")
	if err != nil {
		return currentPos, fmt.Errorf("failed to get pending buys: %w", err)
	}

	// Get pending sell orders
	pendingSells, err := pt.getPendingOrders(symbol, "SELL")
	if err != nil {
		return currentPos, fmt.Errorf("failed to get pending sells: %w", err)
	}

	effectivePosition := currentPos + pendingBuys - pendingSells
	return effectivePosition, nil
}

// getFilledPosition retrieves the current filled position from Alpaca
func (pt *PositionTracker) getFilledPosition(symbol string) (float64, error) {
	// Get positions from engine/Alpaca
	response, err := pt.engine.GetPositions()
	if err != nil {
		return 0, err
	}

	// Parse positions
	if positions, ok := response["positions"].([]interface{}); ok {
		for _, pos := range positions {
			if posMap, ok := pos.(map[string]interface{}); ok {
				if posSymbol, ok := posMap["symbol"].(string); ok && posSymbol == symbol {
					if qty, ok := posMap["quantity"].(float64); ok {
						return qty, nil
					}
				}
			}
		}
	}

	// No position found
	return 0, nil
}

// getPendingOrders retrieves pending orders quantity for a symbol and side from Redis
func (pt *PositionTracker) getPendingOrders(symbol, side string) (float64, error) {
	ctx := context.Background()
	key := fmt.Sprintf("pending:%s:%s", symbol, side)

	// Get all pending orders for this symbol/side
	values, err := pt.redis.client.HGetAll(ctx, key).Result()
	if err != nil {
		return 0, nil // Return 0 if no pending orders
	}

	var totalQty float64
	for _, qtyStr := range values {
		qty, err := strconv.ParseFloat(qtyStr, 64)
		if err == nil {
			totalQty += qty
		}
	}

	return totalQty, nil
}

// AddPendingOrder adds a pending order to tracking
func (pt *PositionTracker) AddPendingOrder(symbol, side string, quantity float64, orderID string) error {
	ctx := context.Background()
	key := fmt.Sprintf("pending:%s:%s", symbol, side)

	// Store the pending order quantity
	err := pt.redis.client.HSet(ctx, key, orderID, fmt.Sprintf("%.8f", quantity)).Err()
	if err != nil {
		return fmt.Errorf("failed to add pending order: %w", err)
	}

	// Set expiration (24 hours)
	pt.redis.client.Expire(ctx, key, 24*time.Hour)

	return nil
}

// RemovePendingOrder removes a pending order from tracking
func (pt *PositionTracker) RemovePendingOrder(symbol, side, orderID string) error {
	ctx := context.Background()
	key := fmt.Sprintf("pending:%s:%s", symbol, side)

	err := pt.redis.client.HDel(ctx, key).Err()
	if err != nil {
		return fmt.Errorf("failed to remove pending order: %w", err)
	}

	return nil
}

// GetAllPendingOrders returns all pending orders across all symbols
func (pt *PositionTracker) GetAllPendingOrders() (map[string]map[string]float64, error) {
	ctx := context.Background()

	// Pattern to match all pending order keys
	pattern := "pending:*"
	
	var cursor uint64
	allPending := make(map[string]map[string]float64)

	for {
		keys, nextCursor, err := pt.redis.client.Scan(ctx, cursor, pattern, 100).Result()
		if err != nil {
			return nil, err
		}

		for _, key := range keys {
			// Parse key format: pending:SYMBOL:SIDE
			values, err := pt.redis.client.HGetAll(ctx, key).Result()
			if err != nil {
				continue
			}

			var totalQty float64
			for _, qtyStr := range values {
				qty, err := strconv.ParseFloat(qtyStr, 64)
				if err == nil {
					totalQty += qty
				}
			}

			if totalQty > 0 {
				if allPending[key] == nil {
					allPending[key] = make(map[string]float64)
				}
				allPending[key]["quantity"] = totalQty
			}
		}

		cursor = nextCursor
		if cursor == 0 {
			break
		}
	}

	return allPending, nil
}

// CleanupExpiredPending removes expired pending orders (called periodically)
func (pt *PositionTracker) CleanupExpiredPending() error {
	ctx := context.Background()
	pattern := "pending:*"
	
	var cursor uint64
	for {
		keys, nextCursor, err := pt.redis.client.Scan(ctx, cursor, pattern, 100).Result()
		if err != nil {
			return err
		}

		for _, key := range keys {
			// Check TTL
			ttl, err := pt.redis.client.TTL(ctx, key).Result()
			if err != nil || ttl < 0 {
				// Key expired or error, delete it
				pt.redis.client.Del(ctx, key)
			}
		}

		cursor = nextCursor
		if cursor == 0 {
			break
		}
	}

	return nil
}

