package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/hft/backend/services"
)

func GetAccount(engineClient *services.EngineClient) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get account from engine (which fetches from Alpaca)
		response, err := engineClient.GetAccount()
		if err != nil {
			// Return fallback account data instead of error
			fallbackResponse := map[string]interface{}{
				"account": map[string]interface{}{
					"buying_power": "0.00",
					"cash": "0.00",
					"portfolio_value": "0.00",
					"equity": "0.00",
					"status": "disconnected",
					"currency": "USD",
					"day_trade_count": 0,
					"pattern_day_trader": false,
				},
				"message": "Trading engine is currently disconnected. Account data will be available when engine reconnects.",
			}
			c.JSON(200, fallbackResponse)
			return
		}

		c.JSON(200, response)
	}
}

