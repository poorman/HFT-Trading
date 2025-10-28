package handlers

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/hft/backend/models"
	"github.com/hft/backend/services"
)

// GetRiskLimits returns current risk limits
func GetRiskLimits(riskManager *services.RiskManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		limits := riskManager.GetLimits()
		c.JSON(200, limits)
	}
}

// UpdateRiskLimits updates risk limits
func UpdateRiskLimits(riskManager *services.RiskManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		var update models.RiskLimitsUpdate
		if err := c.ShouldBindJSON(&update); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		if err := riskManager.UpdateLimit(&update); err != nil {
			c.JSON(500, gin.H{"error": "Failed to update limits"})
			return
		}

		// Send alert about limit change
		riskManager.SendAlert("LIMITS_UPDATED", "INFO", "",
			"Risk limits have been updated",
			map[string]interface{}{"update": update})

		c.JSON(200, gin.H{
			"success": true,
			"limits":  riskManager.GetLimits(),
		})
	}
}

// GetRiskAlerts returns recent risk alerts
func GetRiskAlerts(dbService *services.DatabaseService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get limit from query param, default to 100
		limit := 100
		if limitStr := c.Query("limit"); limitStr != "" {
			if val, parseErr := strconv.Atoi(limitStr); parseErr == nil && val > 0 {
				limit = val
			}
		}

		var alerts []models.RiskAlert
		result := dbService.GetDB().Order("created_at DESC").Limit(limit).Find(&alerts)

		if result.Error != nil {
			c.JSON(500, gin.H{"error": "Failed to fetch alerts"})
			return
		}

		c.JSON(200, gin.H{
			"alerts": alerts,
			"count":  len(alerts),
		})
	}
}

// GetDailyPnLRisk returns today's P&L
func GetDailyPnLRisk(riskManager *services.RiskManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		pnl, err := riskManager.GetDailyPnL()
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to get daily P&L"})
			return
		}

		c.JSON(200, pnl)
	}
}

// GetCircuitBreakerStatus returns current circuit breaker status
func GetCircuitBreakerStatus(riskManager *services.RiskManager, dbService *services.DatabaseService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check if circuit breaker is active
		isActive := riskManager.IsCircuitBreakerActive()
		
		// Get latest circuit breaker event from database
		var latestBreaker models.CircuitBreakerEvent
		result := dbService.GetDB().Where("active = ?", true).Order("created_at DESC").First(&latestBreaker)
		
		if result.Error != nil {
			// No active circuit breaker
			c.JSON(200, gin.H{
				"active": false,
				"status": "normal",
			})
			return
		}
		
		c.JSON(200, gin.H{
			"active":        isActive,
			"id":            latestBreaker.ID,
			"trigger_type":  latestBreaker.TriggerType,
			"trigger_value": latestBreaker.TriggerValue,
			"threshold":     latestBreaker.Threshold,
			"created_at":    latestBreaker.CreatedAt,
		})
	}
}

// ResetCircuitBreaker resets an active circuit breaker
func ResetCircuitBreaker(riskManager *services.RiskManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			BreakerID uint `json:"breaker_id"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "breaker_id required"})
			return
		}

		if err := riskManager.ResetCircuitBreaker(req.BreakerID); err != nil {
			c.JSON(500, gin.H{"error": "Failed to reset circuit breaker"})
			return
		}

		c.JSON(200, gin.H{
			"success": true,
			"message": "Circuit breaker reset successfully",
		})
	}
}

// GetPositionLimit returns position limit for a symbol
func GetPositionLimit(riskManager *services.RiskManager, dbService *services.DatabaseService) gin.HandlerFunc {
	return func(c *gin.Context) {
		symbol := c.Param("symbol")

		var limit models.PositionLimit
		result := dbService.GetDB().Where("symbol = ?", symbol).First(&limit)

		if result.Error != nil {
			// Return default based on global limits
			globalLimits := riskManager.GetLimits()
			c.JSON(200, gin.H{
				"symbol":                symbol,
				"max_position":          globalLimits.MaxPositionSize,
				"max_concentration_pct": globalLimits.MaxPortfolioConcentration,
				"is_default":            true,
			})
			return
		}

		c.JSON(200, limit)
	}
}

// UpdatePositionLimit updates or creates position limit for a symbol
func UpdatePositionLimit(riskManager *services.RiskManager, dbService *services.DatabaseService) gin.HandlerFunc {
	return func(c *gin.Context) {
		symbol := c.Param("symbol")

		var update models.PositionLimitUpdate
		if err := c.ShouldBindJSON(&update); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		// Upsert position limit
		limit := models.PositionLimit{
			Symbol:              symbol,
			MaxPosition:         update.MaxPosition,
			MaxConcentrationPct: update.MaxConcentrationPct,
			UpdatedAt:           time.Now(),
			CreatedAt:           time.Now(),
		}

		dbService.GetDB().Save(&limit)

		// Send alert
		riskManager.SendAlert("POSITION_LIMIT_UPDATED", "INFO", symbol,
			"Position limit updated for "+symbol,
			map[string]interface{}{
				"symbol":                symbol,
				"max_position":          update.MaxPosition,
				"max_concentration_pct": update.MaxConcentrationPct,
			})

		c.JSON(200, gin.H{
			"success": true,
			"limit":   limit,
		})
	}
}

