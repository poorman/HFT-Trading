package services

import (
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	zmq "github.com/pebbe/zmq4"
)

type EngineClient struct {
	address string
	socket  *zmq.Socket
	timeout time.Duration
	mutex   sync.Mutex
}

func NewEngineClient(address string) *EngineClient {
	socket, err := zmq.NewSocket(zmq.REQ)
	if err != nil {
		log.Fatal("Failed to create ZMQ socket:", err)
	}

	if err := socket.Connect(address); err != nil {
		log.Fatal("Failed to connect to engine:", err)
	}

	// Set timeout
	socket.SetRcvtimeo(10 * time.Second)
	socket.SetSndtimeo(10 * time.Second)

	log.Printf("Connected to trading engine at %s", address)

	return &EngineClient{
		address: address,
		socket:  socket,
		timeout: 5 * time.Second,
	}
}

func (ec *EngineClient) Close() {
	if ec.socket != nil {
		ec.socket.Close()
	}
}

// reconnectSocket reconnects the ZMQ socket
func (ec *EngineClient) reconnectSocket() error {
	log.Printf("🔄 Attempting to reconnect ZMQ socket...")
	
	// Close existing socket
	if ec.socket != nil {
		ec.socket.Close()
	}
	
	// Create new socket
	socket, err := zmq.NewSocket(zmq.REQ)
	if err != nil {
		return fmt.Errorf("failed to create new ZMQ socket: %w", err)
	}

	// Connect to engine
	if err := socket.Connect(ec.address); err != nil {
		socket.Close()
		return fmt.Errorf("failed to connect to engine: %w", err)
	}

	// Set timeout
	socket.SetRcvtimeo(10 * time.Second)
	socket.SetSndtimeo(10 * time.Second)

	// Update socket reference
	ec.socket = socket
	log.Printf("✅ ZMQ socket reconnected successfully")
	
	return nil
}

func (ec *EngineClient) SubmitOrder(orderData map[string]interface{}) (map[string]interface{}, error) {
	ec.mutex.Lock()
	defer ec.mutex.Unlock()

	// Add request type
	orderData["type"] = "order"

	// Marshal to JSON
	jsonData, err := json.Marshal(orderData)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal order: %w", err)
	}

	// Send request with retry logic
	var responseBytes []byte
	for attempts := 0; attempts < 3; attempts++ {
		// Send request
		if _, err := ec.socket.SendBytes(jsonData, 0); err != nil {
			log.Printf("⚠️ Send order attempt %d failed: %v", attempts+1, err)
			if attempts == 2 {
				return nil, fmt.Errorf("failed to send order after 3 attempts: %w", err)
			}
			// Try to reconnect socket
			if err := ec.reconnectSocket(); err != nil {
				log.Printf("❌ Failed to reconnect socket: %v", err)
				return nil, fmt.Errorf("failed to reconnect socket: %w", err)
			}
			continue
		}

		// Receive response
		responseBytes, err = ec.socket.RecvBytes(0)
		if err != nil {
			log.Printf("⚠️ Receive order attempt %d failed: %v", attempts+1, err)
			if attempts == 2 {
				return nil, fmt.Errorf("failed to receive response after 3 attempts: %w", err)
			}
			// Try to reconnect socket
			if err := ec.reconnectSocket(); err != nil {
				log.Printf("❌ Failed to reconnect socket: %v", err)
				return nil, fmt.Errorf("failed to reconnect socket: %w", err)
			}
			continue
		}
		break
	}

	// Parse response
	var response map[string]interface{}
	if err := json.Unmarshal(responseBytes, &response); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return response, nil
}

func (ec *EngineClient) GetPositions() (map[string]interface{}, error) {
	ec.mutex.Lock()
	defer ec.mutex.Unlock()

	request := map[string]interface{}{
		"type": "positions",
	}

	// Marshal to JSON
	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Send request with retry logic
	var responseBytes []byte
	for attempts := 0; attempts < 3; attempts++ {
		// Send request
		if _, err := ec.socket.SendBytes(jsonData, 0); err != nil {
			log.Printf("⚠️ Send attempt %d failed: %v", attempts+1, err)
			if attempts == 2 {
				return nil, fmt.Errorf("failed to send request after 3 attempts: %w", err)
			}
			// Try to reconnect socket
			if err := ec.reconnectSocket(); err != nil {
				log.Printf("❌ Failed to reconnect socket: %v", err)
				return nil, fmt.Errorf("failed to reconnect socket: %w", err)
			}
			continue
		}

		// Receive response
		responseBytes, err = ec.socket.RecvBytes(0)
		if err != nil {
			log.Printf("⚠️ Receive attempt %d failed: %v", attempts+1, err)
			if attempts == 2 {
				return nil, fmt.Errorf("failed to receive response after 3 attempts: %w", err)
			}
			// Try to reconnect socket
			if err := ec.reconnectSocket(); err != nil {
				log.Printf("❌ Failed to reconnect socket: %v", err)
				return nil, fmt.Errorf("failed to reconnect socket: %w", err)
			}
			continue
		}
		break
	}

	// Parse response
	var response map[string]interface{}
	if err := json.Unmarshal(responseBytes, &response); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return response, nil
}

func (ec *EngineClient) GetAccount() (map[string]interface{}, error) {
	ec.mutex.Lock()
	defer ec.mutex.Unlock()

	request := map[string]interface{}{
		"type": "account",
	}

	// Marshal to JSON
	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Send request with retry logic
	var responseBytes []byte
	for attempts := 0; attempts < 3; attempts++ {
		// Send request
		if _, err := ec.socket.SendBytes(jsonData, 0); err != nil {
			log.Printf("⚠️ Send account attempt %d failed: %v", attempts+1, err)
			if attempts == 2 {
				return nil, fmt.Errorf("failed to send request after 3 attempts: %w", err)
			}
			// Try to reconnect socket
			if err := ec.reconnectSocket(); err != nil {
				log.Printf("❌ Failed to reconnect socket: %v", err)
				return nil, fmt.Errorf("failed to reconnect socket: %w", err)
			}
			continue
		}

		// Receive response
		responseBytes, err = ec.socket.RecvBytes(0)
		if err != nil {
			log.Printf("⚠️ Receive account attempt %d failed: %v", attempts+1, err)
			if attempts == 2 {
				return nil, fmt.Errorf("failed to receive response after 3 attempts: %w", err)
			}
			// Try to reconnect socket
			if err := ec.reconnectSocket(); err != nil {
				log.Printf("❌ Failed to reconnect socket: %v", err)
				return nil, fmt.Errorf("failed to reconnect socket: %w", err)
			}
			continue
		}
		break
	}

	// Parse response
	var response map[string]interface{}
	if err := json.Unmarshal(responseBytes, &response); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return response, nil
}

func (ec *EngineClient) GetMarketMovers() (map[string]interface{}, error) {
	ec.mutex.Lock()
	defer ec.mutex.Unlock()

	request := map[string]interface{}{
		"type": "movers",
	}

	// Marshal to JSON
	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Send request with retry logic
	var responseBytes []byte
	for attempts := 0; attempts < 3; attempts++ {
		// Send request
		if _, err := ec.socket.SendBytes(jsonData, 0); err != nil {
			log.Printf("⚠️ Send movers attempt %d failed: %v", attempts+1, err)
			if attempts == 2 {
				return nil, fmt.Errorf("failed to send request after 3 attempts: %w", err)
			}
			// Try to reconnect socket
			if err := ec.reconnectSocket(); err != nil {
				log.Printf("❌ Failed to reconnect socket: %v", err)
				return nil, fmt.Errorf("failed to reconnect socket: %w", err)
			}
			continue
		}

		// Receive response
		responseBytes, err = ec.socket.RecvBytes(0)
		if err != nil {
			log.Printf("⚠️ Receive movers attempt %d failed: %v", attempts+1, err)
			if attempts == 2 {
				return nil, fmt.Errorf("failed to receive response after 3 attempts: %w", err)
			}
			// Try to reconnect socket
			if err := ec.reconnectSocket(); err != nil {
				log.Printf("❌ Failed to reconnect socket: %v", err)
				return nil, fmt.Errorf("failed to reconnect socket: %w", err)
			}
			continue
		}
		break
	}

	// Parse response
	var response map[string]interface{}
	if err := json.Unmarshal(responseBytes, &response); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return response, nil
}

// SendRequest sends a generic request to the engine
func (ec *EngineClient) SendRequest(requestData map[string]interface{}) (map[string]interface{}, error) {
	ec.mutex.Lock()
	defer ec.mutex.Unlock()

	// Convert request to JSON
	requestJSON, err := json.Marshal(requestData)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Send request with retry logic
	var responseBytes []byte
	for attempts := 0; attempts < 3; attempts++ {
		// Send request
		if _, err := ec.socket.SendBytes(requestJSON, 0); err != nil {
			log.Printf("⚠️ Send generic request attempt %d failed: %v", attempts+1, err)
			if attempts == 2 {
				return nil, fmt.Errorf("failed to send request after 3 attempts: %w", err)
			}
			// Try to reconnect socket
			if err := ec.reconnectSocket(); err != nil {
				log.Printf("❌ Failed to reconnect socket: %v", err)
				return nil, fmt.Errorf("failed to reconnect socket: %w", err)
			}
			continue
		}

		// Receive response
		responseBytes, err = ec.socket.RecvBytes(0)
		if err != nil {
			log.Printf("⚠️ Receive generic request attempt %d failed: %v", attempts+1, err)
			if attempts == 2 {
				return nil, fmt.Errorf("failed to receive response after 3 attempts: %w", err)
			}
			// Try to reconnect socket
			if err := ec.reconnectSocket(); err != nil {
				log.Printf("❌ Failed to reconnect socket: %v", err)
				return nil, fmt.Errorf("failed to reconnect socket: %w", err)
			}
			continue
		}
		break
	}

	// Parse response
	var response map[string]interface{}
	if err := json.Unmarshal(responseBytes, &response); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return response, nil
}
