package services

import (
	"log"
	"time"
)

// PnLMonitor monitors profit and loss in real-time
type PnLMonitor struct {
	riskManager  *RiskManager
	engineClient *EngineClient
	ticker       *time.Ticker
	stopChan     chan bool
}

// NewPnLMonitor creates a new P&L monitor
func NewPnLMonitor(riskManager *RiskManager, engineClient *EngineClient) *PnLMonitor {
	return &PnLMonitor{
		riskManager:  riskManager,
		engineClient: engineClient,
		stopChan:     make(chan bool),
	}
}

// Start begins monitoring P&L
func (pm *PnLMonitor) Start() {
	pm.ticker = time.NewTicker(5 * time.Second)

	go func() {
		log.Println("P&L Monitor started (updating every 5 seconds)")

		for {
			select {
			case <-pm.ticker.C:
				pm.updatePnL()

			case <-pm.stopChan:
				log.Println("P&L Monitor stopped")
				return
			}
		}
	}()
}

// Stop stops the P&L monitor
func (pm *PnLMonitor) Stop() {
	if pm.ticker != nil {
		pm.ticker.Stop()
	}
	pm.stopChan <- true
}

// updatePnL calculates and updates daily P&L
func (pm *PnLMonitor) updatePnL() {
	// Get current positions from engine
	response, err := pm.engineClient.GetPositions()
	if err != nil {
		log.Printf("Error getting positions for P&L update: %v", err)
		return
	}

	// Calculate unrealized P&L
	unrealizedPnL := pm.calculateUnrealizedPnL(response)

	// Get today's realized P&L (from database)
	dailyPnL, err := pm.riskManager.GetDailyPnL()
	if err != nil {
		log.Printf("Error getting daily P&L: %v", err)
		return
	}

	// Update with latest unrealized P&L
	pm.riskManager.UpdateDailyPnL(dailyPnL.RealizedPnL, unrealizedPnL)

	// Check if circuit breaker should trigger
	totalPnL := dailyPnL.RealizedPnL + unrealizedPnL
	limits := pm.riskManager.GetLimits()
	threshold := limits.DailyLossLimit

	if totalPnL <= -threshold && !dailyPnL.CircuitBreakerTriggered {
		log.Printf("ALERT: Daily loss limit breached! Total P&L: %.2f, Limit: %.2f", totalPnL, threshold)
		pm.riskManager.TriggerCircuitBreaker("DAILY_LOSS", totalPnL, -threshold)
	}
}

// calculateUnrealizedPnL calculates unrealized P&L from positions
func (pm *PnLMonitor) calculateUnrealizedPnL(positionsResponse map[string]interface{}) float64 {
	var totalUnrealizedPnL float64

	// Parse positions from response
	if positions, ok := positionsResponse["positions"].([]interface{}); ok {
		for _, pos := range positions {
			if posMap, ok := pos.(map[string]interface{}); ok {
				// Get unrealized P&L from position
				if unrealizedPnL, ok := posMap["unrealized_pnl"].(float64); ok {
					totalUnrealizedPnL += unrealizedPnL
				}
			}
		}
	}

	return totalUnrealizedPnL
}

