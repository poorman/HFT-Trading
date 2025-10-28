package services

import (
	"log"
	"time"
)

// ConfigReloader periodically reloads configuration from database
type ConfigReloader struct {
	riskManager *RiskManager
	ticker      *time.Ticker
	stopChan    chan bool
}

// NewConfigReloader creates a new configuration reloader
func NewConfigReloader(riskManager *RiskManager) *ConfigReloader {
	return &ConfigReloader{
		riskManager: riskManager,
		stopChan:    make(chan bool),
	}
}

// Start begins the configuration reloader
func (cr *ConfigReloader) Start() {
	cr.ticker = time.NewTicker(10 * time.Second)

	go func() {
		log.Println("Configuration Reloader started (checking every 10 seconds)")

		for {
			select {
			case <-cr.ticker.C:
				cr.reload()

			case <-cr.stopChan:
				log.Println("Configuration Reloader stopped")
				return
			}
		}
	}()
}

// Stop stops the configuration reloader
func (cr *ConfigReloader) Stop() {
	if cr.ticker != nil {
		cr.ticker.Stop()
	}
	cr.stopChan <- true
}

// reload reloads configuration from database
func (cr *ConfigReloader) reload() {
	if err := cr.riskManager.ReloadLimits(); err != nil {
		log.Printf("Error reloading risk limits: %v", err)
		return
	}

	// Log successful reload (only on changes)
	// Could add change detection to avoid spam
}

