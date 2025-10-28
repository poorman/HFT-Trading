package middleware

import (
	"log"
	
	"github.com/gin-gonic/gin"
	"github.com/hft/backend/models"
	"github.com/hft/backend/services"
)

// RiskValidation performs pre-trade risk checks on orders
func RiskValidation(riskManager *services.RiskManager, positionTracker *services.PositionTracker) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.OrderRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			log.Printf("============================================")
			log.Printf("RISK MIDDLEWARE VALIDATION ERROR: %v", err)
			log.Printf("============================================")
			c.JSON(400, gin.H{
				"error": err.Error(),
				"message": "Validation failed: " + err.Error(),
			})
			c.Abort()
			return
		}

		// Get current positions (including pending orders)
		effectivePos, err := positionTracker.GetEffectivePosition(req.Symbol)
		if err != nil {
			// Log error but continue with position = 0
			effectivePos = 0
		}

		// Run all risk checks
		result := riskManager.ValidateOrder(&req, effectivePos)

		if !result.Allowed {
			// Send alert via WebSocket
			riskManager.SendAlert("ORDER_REJECTED", "WARNING", req.Symbol,
				result.RejectionReason, map[string]interface{}{
					"client_order_id": req.ClientOrderID,
					"symbol":          req.Symbol,
					"side":            req.Side,
					"quantity":        req.Quantity,
					"price":           req.Price,
					"reason":          result.RejectionReason,
				})

			c.JSON(403, gin.H{
				"error":  "Order rejected by risk management",
				"reason": result.RejectionReason,
				"alerts": result.Alerts,
			})
			c.Abort()
			return
		}

		// Store validated order and effective position in context for downstream handlers
		c.Set("validated_order", &req)
		c.Set("effective_position", effectivePos)

		c.Next()
	}
}

