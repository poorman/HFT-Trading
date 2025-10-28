package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/hft/backend/services"
)

// TestAlpacaPerformance tests Alpaca API performance
func TestAlpacaPerformance(engineClient *services.EngineClient) gin.HandlerFunc {
	return func(c *gin.Context) {
		iterationsStr := c.DefaultQuery("iterations", "10")
		iterations, err := strconv.Atoi(iterationsStr)
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid iterations parameter"})
			return
		}

		if iterations < 1 || iterations > 100 {
			c.JSON(400, gin.H{"error": "Iterations must be between 1 and 100"})
			return
		}

		// Create request for C++ engine
		request := map[string]interface{}{
			"type":       "alpaca_performance",
			"iterations": iterations,
		}

		response, err := engineClient.SendRequest(request)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to get performance data"})
			return
		}

		c.JSON(200, response)
	}
}

// TestPolygonPerformance tests Polygon API performance
func TestPolygonPerformance(engineClient *services.EngineClient) gin.HandlerFunc {
	return func(c *gin.Context) {
		iterationsStr := c.DefaultQuery("iterations", "10")
		iterations, err := strconv.Atoi(iterationsStr)
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid iterations parameter"})
			return
		}

		if iterations < 1 || iterations > 100 {
			c.JSON(400, gin.H{"error": "Iterations must be between 1 and 100"})
			return
		}

		// Create request for C++ engine
		request := map[string]interface{}{
			"type":       "polygon_performance",
			"iterations": iterations,
		}

		response, err := engineClient.SendRequest(request)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to get performance data"})
			return
		}

		c.JSON(200, response)
	}
}
