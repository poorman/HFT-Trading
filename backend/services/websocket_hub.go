package services

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/hft/backend/models"
)

// WebSocketClient represents a connected WebSocket client
type WebSocketClient struct {
	conn *websocket.Conn
	send chan []byte
	hub  *WebSocketHub
}

// WebSocketHub manages all WebSocket connections
type WebSocketHub struct {
	clients    map[*WebSocketClient]bool
	broadcast  chan []byte
	register   chan *WebSocketClient
	unregister chan *WebSocketClient
	mu         sync.RWMutex
}

// NewWebSocketHub creates a new WebSocket hub
func NewWebSocketHub() *WebSocketHub {
	hub := &WebSocketHub{
		clients:    make(map[*WebSocketClient]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *WebSocketClient),
		unregister: make(chan *WebSocketClient),
	}

	// Start the hub
	go hub.run()

	return hub
}

// run handles registration, unregistration, and broadcasting
func (hub *WebSocketHub) run() {
	for {
		select {
		case client := <-hub.register:
			hub.mu.Lock()
			hub.clients[client] = true
			hub.mu.Unlock()
			log.Printf("WebSocket client registered. Total clients: %d", len(hub.clients))

		case client := <-hub.unregister:
			hub.mu.Lock()
			if _, ok := hub.clients[client]; ok {
				delete(hub.clients, client)
				close(client.send)
				log.Printf("WebSocket client unregistered. Total clients: %d", len(hub.clients))
			}
			hub.mu.Unlock()

		case message := <-hub.broadcast:
			hub.mu.RLock()
			for client := range hub.clients {
				select {
				case client.send <- message:
				default:
					// Client send buffer full, disconnect
					close(client.send)
					delete(hub.clients, client)
				}
			}
			hub.mu.RUnlock()
		}
	}
}

// RegisterClient registers a new WebSocket client
func (hub *WebSocketHub) RegisterClient(conn *websocket.Conn) *WebSocketClient {
	client := &WebSocketClient{
		conn: conn,
		send: make(chan []byte, 256),
		hub:  hub,
	}

	hub.register <- client

	// Start client writer
	go client.writePump()

	return client
}

// UnregisterClient unregisters a WebSocket client
func (hub *WebSocketHub) UnregisterClient(client *WebSocketClient) {
	hub.unregister <- client
}

// Broadcast sends a message to all connected clients
func (hub *WebSocketHub) Broadcast(message []byte) {
	hub.broadcast <- message
}

// BroadcastAlert sends a risk alert to all clients
func (hub *WebSocketHub) BroadcastAlert(alert *models.RiskAlert) {
	message := map[string]interface{}{
		"type":      "RISK_ALERT",
		"data":      alert,
		"timestamp": time.Now().Unix(),
	}

	jsonData, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling risk alert: %v", err)
		return
	}

	hub.broadcast <- jsonData
}

// BroadcastPnLUpdate sends a P&L update to all clients
func (hub *WebSocketHub) BroadcastPnLUpdate(pnl *models.DailyPnLTracking) {
	message := map[string]interface{}{
		"type":      "PNL_UPDATE",
		"data":      pnl,
		"timestamp": time.Now().Unix(),
	}

	jsonData, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling P&L update: %v", err)
		return
	}

	hub.broadcast <- jsonData
}

// BroadcastCircuitBreaker sends a circuit breaker event to all clients
func (hub *WebSocketHub) BroadcastCircuitBreaker(event *models.CircuitBreakerEvent) {
	message := map[string]interface{}{
		"type":      "CIRCUIT_BREAKER",
		"data":      event,
		"timestamp": time.Now().Unix(),
	}

	jsonData, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling circuit breaker event: %v", err)
		return
	}

	hub.broadcast <- jsonData
}

// BroadcastPositionUpdate sends a position update to all clients
func (hub *WebSocketHub) BroadcastPositionUpdate(positions interface{}) {
	message := map[string]interface{}{
		"type":      "POSITION_UPDATE",
		"data":      positions,
		"timestamp": time.Now().Unix(),
	}

	jsonData, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling position update: %v", err)
		return
	}

	hub.broadcast <- jsonData
}

// GetClientCount returns the number of connected clients
func (hub *WebSocketHub) GetClientCount() int {
	hub.mu.RLock()
	defer hub.mu.RUnlock()
	return len(hub.clients)
}

// writePump pumps messages from the send channel to the websocket connection
func (client *WebSocketClient) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		client.conn.Close()
	}()

	for {
		select {
		case message, ok := <-client.send:
			client.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				// Hub closed the channel
				client.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := client.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			// Send ping to keep connection alive
			client.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := client.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

