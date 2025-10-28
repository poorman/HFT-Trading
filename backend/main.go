package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/hft/backend/handlers"
	"github.com/hft/backend/middleware"
	"github.com/hft/backend/services"
	"github.com/joho/godotenv"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/rs/zerolog/log"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Info().Msg("No .env file found, using environment variables")
	}

	// Initialize logger
	services.InitLogger()
	log.Info().Msg("Starting HFT Trading System API")

	// Initialize metrics
	services.InitMetrics()
	log.Info().Msg("Prometheus metrics initialized")

	// Initialize services
	engineClient := services.NewEngineClient(getEnv("ENGINE_ADDRESS", "tcp://hft-engine:5555"))
	defer engineClient.Close()

	dbService := services.NewDatabaseService(getEnv("DATABASE_URL", ""))
	redisService := services.NewRedisService(getEnv("REDIS_URL", "redis://hft-redis:6379"))
	kafkaService := services.NewKafkaService(getEnv("KAFKA_BROKERS", "hft-kafka:9092"))

	// Initialize risk management services
	wsHub := services.NewWebSocketHub()
	riskManager := services.NewRiskManager(dbService, redisService, wsHub)
	positionTracker := services.NewPositionTracker(dbService, redisService, engineClient)
	pnlMonitor := services.NewPnLMonitor(riskManager, engineClient)
	configReloader := services.NewConfigReloader(riskManager)

	// Start background services
	pnlMonitor.Start()
	defer pnlMonitor.Stop()
	
	configReloader.Start()
	defer configReloader.Stop()

	log.Info().Msg("All services initialized successfully")
	log.Info().Msg("Risk management system enabled")

	// Initialize Gin
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// CORS configuration
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"*"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
	r.Use(cors.New(config))

	// Health check with detailed status
	r.GET("/health", handlers.HealthCheck(engineClient, dbService, redisService))
	
	// Readiness probe
	r.GET("/ready", func(c *gin.Context) {
		c.JSON(200, gin.H{"ready": true})
	})
	
	// Liveness probe
	r.GET("/live", func(c *gin.Context) {
		c.JSON(200, gin.H{"alive": true})
	})
	
	// Prometheus metrics endpoint
	r.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// API routes
	api := r.Group("/api")
	{
		// API Homepage - nice landing page
		api.GET("/", handlers.APIHomePage())
		
		// Order endpoints with risk validation
		api.POST("/order", middleware.RiskValidation(riskManager, positionTracker), handlers.SubmitOrder(engineClient, kafkaService, dbService, riskManager, positionTracker, redisService))
		api.GET("/orders", middleware.OptionalAuth(), handlers.GetOrders(dbService))
		api.GET("/orders/open", middleware.OptionalAuth(), handlers.GetOpenOrders(engineClient, redisService))
		api.GET("/orders/:id", middleware.OptionalAuth(), handlers.GetOrder(dbService))
		api.DELETE("/order/:id", middleware.OptionalAuth(), handlers.CancelOrder(engineClient, redisService))

		// Account endpoints
		api.GET("/account", middleware.OptionalAuth(), handlers.GetAccount(engineClient))

		// Position endpoints
		api.GET("/positions", middleware.OptionalAuth(), handlers.GetPositions(engineClient, redisService))

		// Execution endpoints
		api.GET("/executions", middleware.OptionalAuth(), handlers.GetExecutions(dbService, engineClient))

		// Analytics endpoints
		api.GET("/analytics", middleware.OptionalAuth(), handlers.GetAnalytics(dbService, engineClient))
		api.GET("/analytics/daily-pnl", middleware.OptionalAuth(), handlers.GetDailyPnL(dbService))

		// Market data (if implemented)
		api.GET("/marketdata/:symbol", handlers.GetMarketData(redisService))
		
		// Market movers
		api.GET("/movers", middleware.OptionalAuth(), handlers.GetMarketMovers(engineClient))
		
		// Performance testing endpoints
		api.GET("/performance/alpaca", middleware.OptionalAuth(), handlers.TestAlpacaPerformance(engineClient))
		api.GET("/performance/polygon", middleware.OptionalAuth(), handlers.TestPolygonPerformance(engineClient))
		
		// Movers strategy endpoints
		api.GET("/strategy/movers/status", middleware.OptionalAuth(), handlers.GetMoversStrategyStatus(engineClient))
		api.GET("/strategy/movers/positions", middleware.OptionalAuth(), handlers.GetMoversStrategyPositions(engineClient))
		api.GET("/strategy/movers/performance", middleware.OptionalAuth(), handlers.GetMoversStrategyPerformance(engineClient))
		api.POST("/strategy/movers/enable", middleware.OptionalAuth(), handlers.EnableMoversStrategy(engineClient))
		api.POST("/strategy/movers/disable", middleware.OptionalAuth(), handlers.DisableMoversStrategy(engineClient))
		api.POST("/strategy/movers/force-close", middleware.OptionalAuth(), handlers.ForceCloseMoversStrategy(engineClient))

		// Risk management endpoints
		risk := api.Group("/risk")
		{
			risk.GET("/limits", handlers.GetRiskLimits(riskManager))
			risk.PUT("/limits", middleware.OptionalAuth(), handlers.UpdateRiskLimits(riskManager))
			risk.GET("/alerts", handlers.GetRiskAlerts(dbService))
			risk.GET("/daily-pnl", handlers.GetDailyPnLRisk(riskManager))
			risk.GET("/circuit-breaker", handlers.GetCircuitBreakerStatus(riskManager, dbService))
			risk.POST("/circuit-breaker/reset", middleware.OptionalAuth(), handlers.ResetCircuitBreaker(riskManager))
			risk.GET("/position-limits/:symbol", handlers.GetPositionLimit(riskManager, dbService))
			risk.PUT("/position-limits/:symbol", middleware.OptionalAuth(), handlers.UpdatePositionLimit(riskManager, dbService))
		}
	}

	// WebSocket endpoint with risk alerts
	r.GET("/ws", handlers.WebSocketHandler(engineClient, wsHub, riskManager))

	// Start server with graceful shutdown
	port := getEnv("PORT", "8080")
	srv := &http.Server{
		Addr:    ":" + port,
		Handler: r,
	}

	// Start server in goroutine
	go func() {
		log.Info().Str("port", port).Msg("HFT API Server starting")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("Failed to start server")
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	
	log.Info().Msg("Shutting down server...")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal().Err(err).Msg("Server forced to shutdown")
	}

	log.Info().Msg("Server exited")
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

