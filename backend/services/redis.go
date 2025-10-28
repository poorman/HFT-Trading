package services

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisService struct {
	client *redis.Client
	ctx    context.Context
}

func NewRedisService(url string) *RedisService {
	if url == "" {
		log.Println("No Redis URL provided, Redis features disabled")
		return &RedisService{client: nil}
	}

	opt, err := redis.ParseURL(url)
	if err != nil {
		log.Printf("Failed to parse Redis URL: %v", err)
		return &RedisService{client: nil}
	}

	client := redis.NewClient(opt)
	ctx := context.Background()

	// Test connection
	if err := client.Ping(ctx).Err(); err != nil {
		log.Printf("Failed to connect to Redis: %v", err)
		return &RedisService{client: nil}
	}

	log.Println("Redis connected successfully")

	return &RedisService{
		client: client,
		ctx:    ctx,
	}
}

func (rs *RedisService) SetPosition(symbol string, position interface{}) error {
	if rs.client == nil {
		return nil // Redis disabled
	}

	data, err := json.Marshal(position)
	if err != nil {
		return err
	}

	key := "position:" + symbol
	return rs.client.Set(rs.ctx, key, data, 24*time.Hour).Err()
}

func (rs *RedisService) GetPosition(symbol string) (map[string]interface{}, error) {
	if rs.client == nil {
		return nil, nil
	}

	key := "position:" + symbol
	data, err := rs.client.Get(rs.ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, nil // Key doesn't exist
		}
		return nil, err
	}

	var position map[string]interface{}
	if err := json.Unmarshal(data, &position); err != nil {
		return nil, err
	}

	return position, nil
}

func (rs *RedisService) SetMarketData(symbol string, data interface{}) error {
	if rs.client == nil {
		return nil // Redis disabled
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return err
	}

	key := "marketdata:" + symbol
	return rs.client.Set(rs.ctx, key, jsonData, 5*time.Minute).Err()
}

func (rs *RedisService) GetMarketData(symbol string) (map[string]interface{}, error) {
	if rs.client == nil {
		return nil, nil
	}

	key := "marketdata:" + symbol
	data, err := rs.client.Get(rs.ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, nil // Key doesn't exist
		}
		return nil, err
	}

	var marketData map[string]interface{}
	if err := json.Unmarshal(data, &marketData); err != nil {
		return nil, err
	}

	return marketData, nil
}

// GetClient returns the underlying Redis client for custom operations
func (rs *RedisService) GetClient() *redis.Client {
	return rs.client
}

// GetContext returns the service context
func (rs *RedisService) GetContext() context.Context {
	return rs.ctx
}

// SetOpenOrders caches open orders for fast retrieval
func (rs *RedisService) SetOpenOrders(orders []interface{}) error {
	if rs.client == nil {
		return nil // Redis disabled
	}

	data, err := json.Marshal(orders)
	if err != nil {
		return err
	}

	key := "open_orders"
	// Cache for 30 seconds to ensure fresh data
	return rs.client.Set(rs.ctx, key, data, 30*time.Second).Err()
}

// GetOpenOrders retrieves cached open orders
func (rs *RedisService) GetOpenOrders() ([]interface{}, error) {
	if rs.client == nil {
		return nil, nil
	}

	key := "open_orders"
	data, err := rs.client.Get(rs.ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, nil // Key doesn't exist
		}
		return nil, err
	}

	var orders []interface{}
	if err := json.Unmarshal(data, &orders); err != nil {
		return nil, err
	}

	return orders, nil
}

// InvalidateOpenOrders removes cached open orders to force fresh fetch
func (rs *RedisService) InvalidateOpenOrders() error {
	if rs.client == nil {
		return nil
	}

	key := "open_orders"
	return rs.client.Del(rs.ctx, key).Err()
}

// Get retrieves a string value from Redis cache
func (rs *RedisService) Get(key string) (string, error) {
	if rs.client == nil {
		return "", redis.Nil
	}

	return rs.client.Get(rs.ctx, key).Result()
}

// SetEx sets a key with expiration in Redis cache
func (rs *RedisService) SetEx(key string, value string, expiration time.Duration) error {
	if rs.client == nil {
		return nil // Redis disabled
	}

	return rs.client.Set(rs.ctx, key, value, expiration).Err()
}

