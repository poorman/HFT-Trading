package handlers

import (
	"encoding/json"
	"log"
	"time"
	
	"github.com/gin-gonic/gin"
	"github.com/hft/backend/services"
)

func GetPositions(engineClient *services.EngineClient, redisService *services.RedisService) gin.HandlerFunc {
	return func(c *gin.Context) {
		metrics := services.GetMetrics()
		cacheKey := "positions_cache"
		
		// Try to get from cache first (60 second cache)
		if redisService != nil {
			cachedData, err := redisService.Get(cacheKey)
			if err == nil && cachedData != "" {
				var response map[string]interface{}
				if err := json.Unmarshal([]byte(cachedData), &response); err == nil {
					log.Printf("✓ Returning cached positions (avoiding API rate limit)")
					c.JSON(200, response)
					return
				}
			}
		}
		
		// Get positions from engine (calls Alpaca API)
		response, err := engineClient.GetPositions()
		if err != nil {
			log.Printf("⚠️ Engine error getting positions: %v", err)
			
			// Return empty positions instead of error to prevent frontend crashes
			fallbackResponse := map[string]interface{}{
				"positions": []interface{}{},
				"account": map[string]interface{}{
					"buying_power": "0.00",
					"cash": "0.00",
					"portfolio_value": "0.00",
					"equity": "0.00",
					"status": "disconnected",
				},
				"message": "Trading engine is currently disconnected. Positions will be available when engine reconnects.",
			}
			
			// Update metrics with zero positions
			metrics.ActivePositions.Set(0)
			
			// Cache the fallback response for 30 seconds
			if redisService != nil {
				if jsonData, err := json.Marshal(fallbackResponse); err == nil {
					redisService.SetEx(cacheKey, string(jsonData), 30*time.Second)
					log.Printf("✓ Cached fallback positions for 30 seconds")
				}
			}
			
			c.JSON(200, fallbackResponse)
			return
		}
		
		// Update active positions metric
		if positions, ok := response["positions"].([]interface{}); ok {
			metrics.ActivePositions.Set(float64(len(positions)))
		}
		
		// Cache for 60 seconds to prevent rate limiting
		if redisService != nil {
			if jsonData, err := json.Marshal(response); err == nil {
				redisService.SetEx(cacheKey, string(jsonData), 60*time.Second)
				log.Printf("✓ Cached positions for 60 seconds")
			}
		}

		c.JSON(200, response)
	}
}

func GetExecutions(dbService *services.DatabaseService, engineClient *services.EngineClient) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get all orders (including filled) from Alpaca via engine
		request := map[string]interface{}{
			"type": "GET_ALL_ORDERS",
		}
		
		response, err := engineClient.SendRequest(request)
		if err == nil && response != nil {
			// Return filled orders from Alpaca
			if orders, ok := response["orders"].([]interface{}); ok {
				log.Printf("✓ Returning %d filled orders from Alpaca", len(orders))
				c.JSON(200, orders)
				return
			}
		}
		
		// Fallback to database executions if engine request fails
		log.Printf("⚠️ Falling back to database executions")
		executions, err := dbService.GetExecutions(100)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to fetch executions"})
			return
		}
		c.JSON(200, executions)
	}
}

func GetMarketData(redisService *services.RedisService) gin.HandlerFunc {
	return func(c *gin.Context) {
		symbol := c.Param("symbol")
		data, err := redisService.GetMarketData(symbol)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to get market data"})
			return
		}
		if data == nil {
			c.JSON(404, gin.H{"error": "Market data not found"})
			return
		}
		c.JSON(200, data)
	}
}

