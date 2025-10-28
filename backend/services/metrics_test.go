package services

import (
	"testing"
)

func TestInitMetrics(t *testing.T) {
	metrics := InitMetrics()

	if metrics == nil {
		t.Error("Expected metrics to be initialized, got nil")
	}

	if metrics.OrdersTotal == nil {
		t.Error("Expected OrdersTotal metric to be initialized")
	}

	if metrics.OrderLatency == nil {
		t.Error("Expected OrderLatency metric to be initialized")
	}
}

func TestGetMetrics(t *testing.T) {
	metrics := GetMetrics()

	if metrics == nil {
		t.Error("Expected metrics to be returned, got nil")
	}
}

