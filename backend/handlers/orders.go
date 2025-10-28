package handlers

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/hft/backend/models"
	"github.com/hft/backend/services"
)

func SubmitOrder(engineClient *services.EngineClient, kafkaService *services.KafkaService, dbService *services.DatabaseService, riskManager *services.RiskManager, positionTracker *services.PositionTracker, redisService *services.RedisService) gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()
		metrics := services.GetMetrics()
		
		// Get validated order from risk middleware (if it was used)
		var req models.OrderRequest
		if validatedOrder, exists := c.Get("validated_order"); exists {
			req = *validatedOrder.(*models.OrderRequest)
			log.Printf("Using validated order from middleware")
		} else {
			// Fallback: parse from body if middleware wasn't used
			if err := c.ShouldBindJSON(&req); err != nil {
				log.Printf("========================================")
				log.Printf("ORDER VALIDATION ERROR: %v", err)
				log.Printf("========================================")
				c.JSON(400, gin.H{
					"error": err.Error(),
					"message": "Order validation failed: " + err.Error(),
				})
				return
			}
		}
		
		log.Printf("Received order request: Symbol=%s, Side=%s, Quantity=%f, Price=%f, OrderType=%s, ClientOrderID=%s", 
			req.Symbol, req.Side, req.Quantity, req.Price, req.OrderType, req.ClientOrderID)

		// Set default order type
		if req.OrderType == "" {
			req.OrderType = "LIMIT"
		}
		
		// Validate price for LIMIT orders
		if req.OrderType == "LIMIT" && req.Price <= 0 {
			log.Printf("========================================")
			log.Printf("LIMIT ORDER VALIDATION ERROR: Price must be greater than 0")
			log.Printf("========================================")
			c.JSON(400, gin.H{
				"error": "Limit orders require a price greater than 0",
				"message": "Please specify a valid limit price",
			})
			return
		}

		// Generate order ID
		orderID := req.ClientOrderID
		if orderID == "" {
			orderID = generateOrderID()
		}

		// Track as pending order before submission
		if positionTracker != nil {
			positionTracker.AddPendingOrder(req.Symbol, req.Side, req.Quantity, orderID)
		}

		// Prepare order data for engine
		orderData := map[string]interface{}{
			"client_order_id": orderID,
			"symbol":          req.Symbol,
			"side":            req.Side,
			"quantity":        req.Quantity,
			"price":           req.Price,
			"order_type":      req.OrderType,
		}

		// Submit to engine
		response, err := engineClient.SubmitOrder(orderData)
		if err != nil {
			log.Printf("Error submitting order to engine: %v", err)
			metrics.ExecutionErrors.WithLabelValues("engine_submit").Inc()
			
			// Remove from pending on error
			if positionTracker != nil {
				positionTracker.RemovePendingOrder(req.Symbol, req.Side, orderID)
			}
			
			c.JSON(500, gin.H{"error": "Failed to submit order"})
			return
		}
		
		// Record latency
		latency := time.Since(startTime).Microseconds()
		metrics.OrderLatency.WithLabelValues("submit_order").Observe(float64(latency))

		// Save to database
		responseOrderID, _ := response["order_id"].(string)
		responseStatus, _ := response["status"].(string)
		responseFillQty, _ := response["fill_qty"].(float64)
		responseRemainingQty, _ := response["remaining_qty"].(float64)
		
		order := &models.Order{
			ClientOrderID: req.ClientOrderID,
			OrderID:       responseOrderID,
			Symbol:        req.Symbol,
			Side:          req.Side,
			Quantity:      req.Quantity,
			Price:         req.Price,
			OrderType:     req.OrderType,
			Status:        responseStatus,
			FilledQty:     responseFillQty,
			RemainingQty:  responseRemainingQty,
		}
		dbService.SaveOrder(order)

		// Publish to Kafka
		kafkaService.PublishOrder(order)
		
		// Record order metrics by status
		metrics.OrdersTotal.WithLabelValues(order.Status, order.Symbol, order.Side).Inc()
		
		// Invalidate open orders cache to force fresh fetch from Alpaca
		if redisService != nil {
			redisService.InvalidateOpenOrders()
			log.Printf("✓ Invalidated open orders cache after order submission")
		}

		// If filled, save execution and update P&L
		if order.FilledQty > 0 {
			fillPrice, _ := response["fill_price"].(float64)
			
			execution := &models.Execution{
				OrderID:       order.OrderID,
				ClientOrderID: order.ClientOrderID,
				Symbol:        order.Symbol,
				Side:          order.Side,
				FillPrice:     fillPrice,
				FillQty:       order.FilledQty,
				Timestamp:     time.Now(),
			}
			dbService.SaveExecution(execution)
			kafkaService.PublishExecution(execution)
		}

		// Handle order status and pending tracking
		if responseStatus == "FILLED" || responseStatus == "PARTIALLY_FILLED" {
			// Remove from pending tracking when filled
			if positionTracker != nil {
				positionTracker.RemovePendingOrder(req.Symbol, req.Side, responseOrderID)
			}

			// Update daily P&L if order resulted in realized profit/loss
			if riskManager != nil && responseStatus == "FILLED" {
				// Calculate realized P&L (simplified - would need cost basis in real implementation)
				responseFillPrice, _ := response["fill_price"].(float64)
				responseFillQtyForPnL, _ := response["fill_qty"].(float64)
				
				// This is a simplified P&L calculation
				// Real implementation would track cost basis per position
				realizedPnL := 0.0
				if req.Side == "SELL" {
					// Estimate P&L on sell (would need actual cost basis)
					realizedPnL = responseFillPrice * responseFillQtyForPnL * 0.01 // Placeholder
				}

				// Get current daily P&L
				dailyPnL, _ := riskManager.GetDailyPnL()
				if dailyPnL != nil {
					riskManager.UpdateDailyPnL(dailyPnL.RealizedPnL+realizedPnL, dailyPnL.UnrealizedPnL)

					// Check if circuit breaker should trigger
					limits := riskManager.GetLimits()
					newTotal := dailyPnL.RealizedPnL + realizedPnL + dailyPnL.UnrealizedPnL
					if newTotal <= -limits.DailyLossLimit && !dailyPnL.CircuitBreakerTriggered {
						riskManager.TriggerCircuitBreaker("DAILY_LOSS", newTotal, -limits.DailyLossLimit)
					}
				}
			}
		}

		// Add success flag to response
		response["success"] = true
		c.JSON(200, response)
	}
}

// generateOrderID creates a unique order ID
func generateOrderID() string {
	return fmt.Sprintf("ORD-%d", time.Now().UnixNano())
}

func GetOrders(dbService *services.DatabaseService) gin.HandlerFunc {
	return func(c *gin.Context) {
		orders, err := dbService.GetOrders(100)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to fetch orders"})
			return
		}
		c.JSON(200, orders)
	}
}

func GetOrder(dbService *services.DatabaseService) gin.HandlerFunc {
	return func(c *gin.Context) {
		orderID := c.Param("id")
		order, err := dbService.GetOrderByID(orderID)
		if err != nil {
			c.JSON(404, gin.H{"error": "Order not found"})
			return
		}
		c.JSON(200, order)
	}
}

func GetOpenOrders(engineClient *services.EngineClient, redisService *services.RedisService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Try to get cached orders first
		if cachedOrders, err := redisService.GetOpenOrders(); err == nil && cachedOrders != nil {
			log.Printf("Serving open orders from Redis cache (%d orders)", len(cachedOrders))
			c.JSON(200, cachedOrders)
			return
		}

		// Cache miss - fetch from engine
		log.Printf("Cache miss - fetching open orders from engine")
		
		// Request open orders from the engine
		request := map[string]interface{}{
			"type": "GET_OPEN_ORDERS",
		}
		
		response, err := engineClient.SendRequest(request)
		if err != nil {
			log.Printf("Failed to get open orders: %v", err)
			c.JSON(500, gin.H{"error": "Failed to fetch open orders"})
			return
		}
		
		// Return the open orders array
		if orders, ok := response["orders"].([]interface{}); ok {
			// Cache the result for next time
			if err := redisService.SetOpenOrders(orders); err != nil {
				log.Printf("Failed to cache open orders: %v", err)
			} else {
				log.Printf("Cached %d open orders in Redis", len(orders))
			}
			
			c.JSON(200, orders)
		} else {
			c.JSON(200, []interface{}{})
		}
	}
}

func CancelOrder(engineClient *services.EngineClient, redisService *services.RedisService) gin.HandlerFunc {
	return func(c *gin.Context) {
		orderID := c.Param("id")
		
		log.Printf("Cancelling order: %s", orderID)
		
		// Request order cancellation from the engine
		request := map[string]interface{}{
			"type":     "CANCEL_ORDER",
			"order_id": orderID,
		}
		
		response, err := engineClient.SendRequest(request)
		if err != nil {
			log.Printf("Failed to cancel order: %v", err)
			c.JSON(500, gin.H{"error": "Failed to cancel order"})
			return
		}
		
		// Invalidate open orders cache to force fresh fetch from Alpaca
		if redisService != nil {
			redisService.InvalidateOpenOrders()
			log.Printf("✓ Invalidated open orders cache after order cancellation")
		}
		
		// Add success flag
		response["success"] = true
		log.Printf("✓ Order cancelled successfully: %s", orderID)
		c.JSON(200, response)
	}
}

// APIHomePage returns a nice landing page for the API
func APIHomePage() gin.HandlerFunc {
	return func(c *gin.Context) {
		html := `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HFT Trading API</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 900px;
            width: 100%;
            padding: 40px;
            animation: fadeIn 0.6s ease-in;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        h1 {
            color: #667eea;
            font-size: 2.5em;
            margin-bottom: 10px;
            text-align: center;
        }
        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 40px;
            font-size: 1.1em;
        }
        .status {
            background: #e8f5e9;
            border-left: 4px solid #4caf50;
            padding: 15px;
            margin-bottom: 30px;
            border-radius: 5px;
        }
        .status-badge {
            display: inline-block;
            background: #4caf50;
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 0.9em;
        }
        .endpoints {
            margin-top: 30px;
        }
        .endpoint-group {
            margin-bottom: 30px;
        }
        .endpoint-group h3 {
            color: #333;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #667eea;
        }
        .endpoint {
            background: #f8f9fa;
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 8px;
            transition: all 0.3s ease;
        }
        .endpoint:hover {
            background: #e9ecef;
            transform: translateX(5px);
        }
        .method {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 5px;
            font-weight: bold;
            font-size: 0.85em;
            margin-right: 10px;
            color: white;
        }
        .method.get { background: #2196f3; }
        .method.post { background: #4caf50; }
        .method.delete { background: #f44336; }
        .path {
            font-family: 'Courier New', monospace;
            color: #333;
            font-weight: 600;
        }
        .description {
            color: #666;
            font-size: 0.9em;
            margin-top: 8px;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #999;
            font-size: 0.9em;
        }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .feature {
            text-align: center;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
        }
        .feature-icon {
            font-size: 2em;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 HFT Trading API</h1>
        <p class="subtitle">High-Frequency Trading System Backend</p>
        
        <div class="status">
            <span class="status-badge">● ONLINE</span>
            <span style="margin-left: 15px; color: #666;">API is running and ready to accept requests</span>
        </div>

        <div class="features">
            <div class="feature">
                <div class="feature-icon">⚡</div>
                <strong>Ultra-Low Latency</strong>
                <div style="color: #666; font-size: 0.9em; margin-top: 5px;">Microsecond execution</div>
            </div>
            <div class="feature">
                <div class="feature-icon">🛡️</div>
                <strong>Risk Management</strong>
                <div style="color: #666; font-size: 0.9em; margin-top: 5px;">Real-time limits</div>
            </div>
            <div class="feature">
                <div class="feature-icon">📊</div>
                <strong>Live Monitoring</strong>
                <div style="color: #666; font-size: 0.9em; margin-top: 5px;">Prometheus metrics</div>
            </div>
        </div>

        <div class="endpoints">
            <div class="endpoint-group">
                <h3>📈 Order Management</h3>
                <div class="endpoint">
                    <span class="method post">POST</span>
                    <span class="path">/api/orders</span>
                    <div class="description">Submit a new order to the trading engine</div>
                </div>
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <span class="path">/api/orders</span>
                    <div class="description">Retrieve all orders (last 100)</div>
                </div>
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <span class="path">/api/orders/:id</span>
                    <div class="description">Get specific order details by ID</div>
                </div>
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <span class="path">/api/orders/open</span>
                    <div class="description">Get all open orders</div>
                </div>
                <div class="endpoint">
                    <span class="method delete">DELETE</span>
                    <span class="path">/api/orders/:id</span>
                    <div class="description">Cancel an order</div>
                </div>
            </div>

            <div class="endpoint-group">
                <h3>💼 Positions & Portfolio</h3>
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <span class="path">/api/positions</span>
                    <div class="description">Get current positions</div>
                </div>
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <span class="path">/api/portfolio</span>
                    <div class="description">Get portfolio summary and P&L</div>
                </div>
            </div>

            <div class="endpoint-group">
                <h3>⚙️ System & Monitoring</h3>
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <span class="path">/api/health</span>
                    <div class="description">System health check</div>
                </div>
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <span class="path">/metrics</span>
                    <div class="description">Prometheus metrics endpoint</div>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>HFT Trading System v1.0 | Built with Go & Gin Framework</p>
            <p style="margin-top: 5px;">For API documentation, see <a href="/docs" style="color: #667eea;">OpenAPI Docs</a></p>
        </div>
    </div>
</body>
</html>
`
		c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(html))
	}
}
