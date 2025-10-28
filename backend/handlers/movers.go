package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/hft/backend/services"
)

func GetMarketMovers(engineClient *services.EngineClient) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get market movers from engine (which fetches from Alpaca)
		response, err := engineClient.GetMarketMovers()
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to get market movers"})
			return
		}

		c.JSON(200, response)
	}
}

