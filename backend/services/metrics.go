package services

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// Metrics holds all Prometheus metrics
type Metrics struct {
	OrdersTotal          *prometheus.CounterVec
	OrderLatency         *prometheus.HistogramVec
	ActivePositions      prometheus.Gauge
	ExecutionErrors      *prometheus.CounterVec
	WebSocketConnections prometheus.Gauge
	DatabaseOperations   *prometheus.HistogramVec
	RedisOperations      *prometheus.HistogramVec
	KafkaMessages        *prometheus.CounterVec
}

var metrics *Metrics

// InitMetrics initializes Prometheus metrics
func InitMetrics() *Metrics {
	metrics = &Metrics{
		OrdersTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "hft_orders_total",
				Help: "Total number of orders processed",
			},
			[]string{"status", "symbol", "side"},
		),
		OrderLatency: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "hft_order_latency_microseconds",
				Help:    "Order processing latency in microseconds",
				Buckets: []float64{10, 50, 100, 500, 1000, 5000, 10000},
			},
			[]string{"endpoint"},
		),
		ActivePositions: promauto.NewGauge(
			prometheus.GaugeOpts{
				Name: "hft_active_positions",
				Help: "Current number of open positions",
			},
		),
		ExecutionErrors: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "hft_execution_errors_total",
				Help: "Total number of execution errors",
			},
			[]string{"error_type"},
		),
		WebSocketConnections: promauto.NewGauge(
			prometheus.GaugeOpts{
				Name: "hft_websocket_connections",
				Help: "Current number of WebSocket connections",
			},
		),
		DatabaseOperations: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "hft_database_operation_duration_ms",
				Help:    "Database operation duration in milliseconds",
				Buckets: []float64{1, 5, 10, 25, 50, 100, 500},
			},
			[]string{"operation"},
		),
		RedisOperations: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "hft_redis_operation_duration_ms",
				Help:    "Redis operation duration in milliseconds",
				Buckets: []float64{0.1, 0.5, 1, 5, 10, 25, 50},
			},
			[]string{"operation"},
		),
		KafkaMessages: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "hft_kafka_messages_total",
				Help: "Total number of Kafka messages produced",
			},
			[]string{"topic", "status"},
		),
	}
	return metrics
}

// GetMetrics returns the global metrics instance
func GetMetrics() *Metrics {
	if metrics == nil {
		return InitMetrics()
	}
	return metrics
}

