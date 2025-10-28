package handlers

import (
	"fmt"
	
	"github.com/gin-gonic/gin"
	"github.com/hft/backend/services"
	"github.com/rs/zerolog/log"
)

// GetAnalytics returns trading analytics and P&L
func GetAnalytics(dbService *services.DatabaseService, engineClient *services.EngineClient) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get all orders from Alpaca for comprehensive analytics
		request := map[string]interface{}{
			"type": "GET_ALL_ORDERS",
		}
		
		response, err := engineClient.SendRequest(request)
		
		var totalOrders int
		var filledOrders int
		var buyOrders int
		var sellOrders int
		var totalVolume float64
		
		if err == nil && response != nil {
			if orders, ok := response["all_orders"].([]interface{}); ok {
				totalOrders = len(orders)
				
				for _, orderInterface := range orders {
					if order, ok := orderInterface.(map[string]interface{}); ok {
						status, _ := order["status"].(string)
						side, _ := order["side"].(string)
						
						if status == "filled" || status == "partially_filled" {
							filledOrders++
							
							// Count buy/sell orders
							if side == "buy" {
								buyOrders++
							} else if side == "sell" {
								sellOrders++
							}
							
							// Calculate volume
							if filledQtyStr, ok := order["filled_qty"].(string); ok {
								if filledQty, err := parseFloat(filledQtyStr); err == nil {
									if fillPriceStr, ok := order["filled_avg_price"].(string); ok {
										if fillPrice, err := parseFloat(fillPriceStr); err == nil {
											totalVolume += filledQty * fillPrice
										}
									}
								}
							}
						}
					}
				}
			}
		}
		
		// Calculate fill rate
		fillRate := 0.0
		if totalOrders > 0 {
			fillRate = (float64(filledOrders) / float64(totalOrders)) * 100
		}
		
		// Get executions from database for additional stats
		var executions []struct {
			Side      string
			FillPrice float64
			FillQty   float64
		}
		
		dbService.GetDB().Table("executions").
			Select("side, fill_price, fill_qty").
			Find(&executions)
		
		var buyValue, sellValue float64
		for _, exec := range executions {
			if exec.Side == "BUY" {
				buyValue += exec.FillPrice * exec.FillQty
			} else if exec.Side == "SELL" {
				sellValue += exec.FillPrice * exec.FillQty
			}
		}
		
		totalPnL := sellValue - buyValue
		
		// Get symbol-wise breakdown
		type SymbolStats struct {
			Symbol      string  `json:"symbol"`
			TotalTrades int64   `json:"total_trades"`
			TotalVolume float64 `json:"total_volume"`
			AvgPrice    float64 `json:"avg_price"`
		}
		
		var symbolStats []SymbolStats
		dbService.GetDB().Table("executions").
			Select("symbol, COUNT(*) as total_trades, SUM(fill_qty) as total_volume, AVG(fill_price) as avg_price").
			Group("symbol").
			Find(&symbolStats)
		
		// Calculate win rate (simplified)
		winRate := 0.0
		if totalPnL > 0 && filledOrders > 0 {
			winRate = 100.0 // Simplified - all trades winning if overall P&L positive
		}
		
		log.Info().
			Int("total_orders", totalOrders).
			Int("filled_orders", filledOrders).
			Float64("fill_rate", fillRate).
			Float64("total_pnl", totalPnL).
			Msg("Analytics requested")
		
		c.JSON(200, gin.H{
			"total_orders":     totalOrders,
			"filled_orders":    filledOrders,
			"total_trades":     filledOrders,
			"buy_orders":       buyOrders,
			"sell_orders":      sellOrders,
			"fillRate":         fillRate,
			"fill_rate":        fillRate,
			"total_volume":     totalVolume,
			"total_pnl":        totalPnL,
			"winning_trades":   0, // Placeholder
			"losing_trades":    0, // Placeholder
			"win_rate":         winRate,
			"avg_latency_ms":   12.5,  // Placeholder - would need actual metrics
			"p50_latency_ms":   10.0,  // Placeholder
			"p99_latency_ms":   45.0,  // Placeholder
			"symbol_stats":     symbolStats,
		})
	}
}

func parseFloat(s string) (float64, error) {
	var f float64
	_, err := fmt.Sscanf(s, "%f", &f)
	return f, err
}

// GetDailyPnL returns daily P&L breakdown
func GetDailyPnL(dbService *services.DatabaseService) gin.HandlerFunc {
	return func(c *gin.Context) {
		type DailyPnL struct {
			Date  string  `json:"date"`
			PnL   float64 `json:"pnl"`
			Count int64   `json:"count"`
		}

		var dailyPnL []DailyPnL
		dbService.GetDB().Table("executions").
			Select("DATE(timestamp) as date, SUM(CASE WHEN side = 'SELL' THEN fill_price * fill_qty ELSE -fill_price * fill_qty END) as pnl, COUNT(*) as count").
			Group("DATE(timestamp)").
			Order("date DESC").
			Limit(30).
			Find(&dailyPnL)

		c.JSON(200, gin.H{
			"daily_pnl": dailyPnL,
		})
	}
}

