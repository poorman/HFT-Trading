package handlers

import (
	"context"
	"fmt"
	"time"
	"runtime"

	"github.com/gin-gonic/gin"
	"github.com/hft/backend/services"
)

var startTime = time.Now()

// HealthCheck returns a detailed health check handler
func HealthCheck(engineClient *services.EngineClient, dbService *services.DatabaseService, redisService *services.RedisService) gin.HandlerFunc {
	return func(c *gin.Context) {
		status := gin.H{
			"status":    "ok",
			"timestamp": time.Now().Unix(),
			"services":  gin.H{},
		}

		allHealthy := true

		// Check database
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		
		dbLatency := 0
		if dbService != nil && dbService.GetDB() != nil {
			dbStart := time.Now()
			sqlDB, err := dbService.GetDB().DB()
			if err == nil {
				err = sqlDB.PingContext(ctx)
				dbLatency = int(time.Since(dbStart).Milliseconds())
				if err == nil {
					stats := sqlDB.Stats()
					status["services"].(gin.H)["database"] = gin.H{
						"status":      "healthy",
						"latency_ms":  dbLatency,
						"connections": stats.OpenConnections,
					}
				} else {
					status["services"].(gin.H)["database"] = gin.H{"status": "unhealthy", "error": err.Error()}
					allHealthy = false
				}
			} else {
				status["services"].(gin.H)["database"] = gin.H{"status": "unhealthy", "error": err.Error()}
				allHealthy = false
			}
		}

		// Check Redis
		redisLatency := 0
		if redisService != nil && redisService.GetClient() != nil {
			redisStart := time.Now()
			err := redisService.GetClient().Ping(ctx).Err()
			redisLatency = int(time.Since(redisStart).Milliseconds())
			if err == nil {
				status["services"].(gin.H)["redis"] = gin.H{
					"status":     "healthy",
					"latency_ms": redisLatency,
					"hit_rate":   95.5, // Placeholder
				}
			} else {
				status["services"].(gin.H)["redis"] = gin.H{"status": "unhealthy", "error": err.Error()}
				allHealthy = false
			}
		}

		// Check engine connection (try to get account)
		engineLatency := 0
		if engineClient != nil {
			engineStart := time.Now()
			accountReq := map[string]interface{}{"type": "account"}
			_, err := engineClient.SendRequest(accountReq)
			engineLatency = int(time.Since(engineStart).Milliseconds())
			if err == nil {
				status["services"].(gin.H)["engine"] = gin.H{
					"status":     "connected",
					"latency_ms": engineLatency,
				}
			} else {
				status["services"].(gin.H)["engine"] = gin.H{
					"status":     "disconnected",
					"error":      err.Error(),
					"latency_ms": engineLatency,
				}
				allHealthy = false
			}
		}

		// Add uptime
		uptime := time.Since(startTime)
		status["uptime"] = formatUptime(uptime)
		status["uptime_seconds"] = int(uptime.Seconds())
		
		// Add system metrics
		var m runtime.MemStats
		runtime.ReadMemStats(&m)
		status["memory_mb"] = m.Alloc / 1024 / 1024
		status["goroutines"] = runtime.NumGoroutine()
		
		// Placeholder for requests per second
		status["requests_per_sec"] = 0
		status["active_websockets"] = 0

		if !allHealthy {
			status["status"] = "degraded"
			c.JSON(503, status)
			return
		}

		c.JSON(200, status)
	}
}

func formatUptime(d time.Duration) string {
	days := int(d.Hours() / 24)
	hours := int(d.Hours()) % 24
	minutes := int(d.Minutes()) % 60
	seconds := int(d.Seconds()) % 60
	
	if days > 0 {
		return fmt.Sprintf("%dd %dh %dm %ds", days, hours, minutes, seconds)
	} else if hours > 0 {
		return fmt.Sprintf("%dh %dm %ds", hours, minutes, seconds)
	} else if minutes > 0 {
		return fmt.Sprintf("%dm %ds", minutes, seconds)
	}
	return fmt.Sprintf("%ds", seconds)
}

