package services

import (
	"context"
	"fmt"
	"time"
)

// OrderThrottleCache manages order rate limiting using Redis
type OrderThrottleCache struct {
	redis *RedisService
}

// NewOrderThrottleCache creates a new order throttle cache
func NewOrderThrottleCache(redis *RedisService) *OrderThrottleCache {
	return &OrderThrottleCache{
		redis: redis,
	}
}

// CheckRate checks if the order rate limit has been exceeded
// Uses Redis INCR with TTL for sliding window rate limiting
func (otc *OrderThrottleCache) CheckRate(clientID string, maxPerSecond int) error {
	ctx := context.Background()
	key := fmt.Sprintf("throttle:%s", clientID)

	// Increment the counter
	count, err := otc.redis.client.Incr(ctx, key).Result()
	if err != nil {
		return fmt.Errorf("failed to increment throttle counter: %w", err)
	}

	// Set expiration on first request (count == 1)
	if count == 1 {
		err = otc.redis.client.Expire(ctx, key, 1*time.Second).Err()
		if err != nil {
			return fmt.Errorf("failed to set throttle expiration: %w", err)
		}
	}

	// Check if rate limit exceeded
	if count > int64(maxPerSecond) {
		return fmt.Errorf("rate limit exceeded: %d orders/sec (limit: %d)", count, maxPerSecond)
	}

	return nil
}

// GetCurrentRate returns the current order rate for a client
func (otc *OrderThrottleCache) GetCurrentRate(clientID string) (int64, error) {
	ctx := context.Background()
	key := fmt.Sprintf("throttle:%s", clientID)

	count, err := otc.redis.client.Get(ctx, key).Int64()
	if err != nil {
		// Key doesn't exist, return 0
		return 0, nil
	}

	return count, nil
}

// ResetRate resets the rate limit counter for a client
func (otc *OrderThrottleCache) ResetRate(clientID string) error {
	ctx := context.Background()
	key := fmt.Sprintf("throttle:%s", clientID)

	err := otc.redis.client.Del(ctx, key).Err()
	if err != nil {
		return fmt.Errorf("failed to reset throttle: %w", err)
	}

	return nil
}

// CheckRateAdvanced implements a more sophisticated sliding window rate limiter
// This allows for burst capacity while maintaining average rate
func (otc *OrderThrottleCache) CheckRateAdvanced(clientID string, maxPerSecond int, windowSeconds int) error {
	ctx := context.Background()
	now := time.Now()
	windowStart := now.Add(-time.Duration(windowSeconds) * time.Second)

	key := fmt.Sprintf("throttle:advanced:%s", clientID)

	// Add current timestamp to sorted set
	score := float64(now.UnixNano())
	err := otc.redis.client.ZAdd(ctx, key, struct {
		Score  float64
		Member interface{}
	}{Score: score, Member: score}).Err()
	if err != nil {
		return fmt.Errorf("failed to add to rate limiter: %w", err)
	}

	// Remove old entries outside the window
	minScore := float64(windowStart.UnixNano())
	otc.redis.client.ZRemRangeByScore(ctx, key, "-inf", fmt.Sprintf("%f", minScore))

	// Count entries in window
	count, err := otc.redis.client.ZCard(ctx, key).Result()
	if err != nil {
		return fmt.Errorf("failed to count rate: %w", err)
	}

	// Set expiration
	otc.redis.client.Expire(ctx, key, time.Duration(windowSeconds+1)*time.Second)

	// Check limit
	maxInWindow := int64(maxPerSecond * windowSeconds)
	if count > maxInWindow {
		return fmt.Errorf("rate limit exceeded: %d orders in %ds window (limit: %d)", count, windowSeconds, maxInWindow)
	}

	return nil
}

