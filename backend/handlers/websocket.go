package handlers

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/hft/backend/services"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins (configure for production)
	},
}

func WebSocketHandler(engineClient *services.EngineClient, wsHub *services.WebSocketHub, riskManager *services.RiskManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		metrics := services.GetMetrics()
		
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("Failed to upgrade connection: %v", err)
			return
		}
		defer conn.Close()
		
		// Increment websocket connections
		metrics.WebSocketConnections.Inc()
		defer metrics.WebSocketConnections.Dec()

		log.Println("WebSocket client connected")

		// Register client with hub
		client := wsHub.RegisterClient(conn)
		defer wsHub.UnregisterClient(client)

		// Send periodic updates
		ticker := time.NewTicker(1 * time.Second)
		defer ticker.Stop()

		// Start background goroutine for risk alerts
		go func() {
			for range ticker.C {
				// Send current P&L update
				if riskManager != nil {
					pnl, err := riskManager.GetDailyPnL()
					if err == nil {
						wsHub.BroadcastPnLUpdate(pnl)
					}
				}

				// Get positions update
				positions, err := engineClient.GetPositions()
				if err == nil {
					wsHub.BroadcastPositionUpdate(positions)
				}

				// Check circuit breaker status
				if riskManager != nil && riskManager.IsCircuitBreakerActive() {
					// Circuit breaker is active, alert was already sent when triggered
				}
			}
		}()

		// Keep connection alive and handle disconnect
		for {
			select {
			case <-c.Done():
				log.Println("WebSocket client disconnected")
				return
			}
		}
	}
}

