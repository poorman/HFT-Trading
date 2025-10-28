package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/hft/backend/services"
)

// GetMoversStrategyStatus returns the current status of the movers strategy
func GetMoversStrategyStatus(engineClient *services.EngineClient) gin.HandlerFunc {
	return func(c *gin.Context) {
		request := map[string]interface{}{
			"type":   "movers_strategy",
			"action": "status",
		}

		response, err := engineClient.SendRequest(request)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to get strategy status", "details": err.Error()})
			return
		}

		c.JSON(200, response)
	}
}

// GetMoversStrategyPositions returns active positions for the movers strategy
func GetMoversStrategyPositions(engineClient *services.EngineClient) gin.HandlerFunc {
	return func(c *gin.Context) {
		request := map[string]interface{}{
			"type":   "movers_strategy",
			"action": "positions",
		}

		response, err := engineClient.SendRequest(request)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to get strategy positions", "details": err.Error()})
			return
		}

		c.JSON(200, response)
	}
}

// GetMoversStrategyPerformance returns performance metrics for the movers strategy
func GetMoversStrategyPerformance(engineClient *services.EngineClient) gin.HandlerFunc {
	return func(c *gin.Context) {
		request := map[string]interface{}{
			"type":   "movers_strategy",
			"action": "performance",
		}

		response, err := engineClient.SendRequest(request)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to get strategy performance", "details": err.Error()})
			return
		}

		c.JSON(200, response)
	}
}

// EnableMoversStrategy enables the movers strategy
func EnableMoversStrategy(engineClient *services.EngineClient) gin.HandlerFunc {
	return func(c *gin.Context) {
		request := map[string]interface{}{
			"type":   "movers_strategy",
			"action": "enable",
		}

		response, err := engineClient.SendRequest(request)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to enable strategy", "details": err.Error()})
			return
		}

		c.JSON(200, response)
	}
}

// DisableMoversStrategy disables the movers strategy
func DisableMoversStrategy(engineClient *services.EngineClient) gin.HandlerFunc {
	return func(c *gin.Context) {
		request := map[string]interface{}{
			"type":   "movers_strategy",
			"action": "disable",
		}

		response, err := engineClient.SendRequest(request)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to disable strategy", "details": err.Error()})
			return
		}

		c.JSON(200, response)
	}
}

// ForceCloseMoversStrategy forces closure of all active positions
func ForceCloseMoversStrategy(engineClient *services.EngineClient) gin.HandlerFunc {
	return func(c *gin.Context) {
		request := map[string]interface{}{
			"type":   "movers_strategy",
			"action": "force_close",
		}

		response, err := engineClient.SendRequest(request)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to force close positions", "details": err.Error()})
			return
		}

		c.JSON(200, response)
	}
}
