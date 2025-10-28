#!/bin/bash

# HFT Trading System - Monitoring Script
# Checks system health and sends alerts if needed

set -e

BACKEND_URL="http://localhost:8082"
ALERT_EMAIL="${ALERT_EMAIL:-}"
LOG_FILE="/home/pbieda/scripts/hft/logs/monitor.log"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

check_service() {
    SERVICE=$1
    CONTAINER=$2
    
    if docker ps --format '{{.Names}}' | grep -q "^$CONTAINER$"; then
        log "✓ $SERVICE is running"
        return 0
    else
        log "✗ $SERVICE is not running"
        return 1
    fi
}

check_health() {
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health" 2>/dev/null || echo "000")
    
    if [ "$RESPONSE" = "200" ]; then
        log "✓ Backend health check passed"
        return 0
    else
        log "✗ Backend health check failed (HTTP $RESPONSE)"
        return 1
    fi
}

check_metrics() {
    METRICS=$(curl -s "$BACKEND_URL/metrics" 2>/dev/null | grep -c "^hft_" || echo "0")
    
    if [ "$METRICS" -gt 0 ]; then
        log "✓ Prometheus metrics available ($METRICS metrics)"
        return 0
    else
        log "✗ Prometheus metrics not available"
        return 1
    fi
}

check_database() {
    if docker exec a39c456f9738_local_pgdb psql -U pbieda -d hft_trading -c "SELECT 1;" >/dev/null 2>&1; then
        log "✓ Database connection OK"
        return 0
    else
        log "✗ Database connection failed"
        return 1
    fi
}

send_alert() {
    MESSAGE=$1
    log "ALERT: $MESSAGE"
    
    if [ -n "$ALERT_EMAIL" ]; then
        echo "$MESSAGE" | mail -s "HFT System Alert" "$ALERT_EMAIL" || true
    fi
}

# Main monitoring loop
log "=== HFT System Health Check ==="

FAILED=0

check_service "Engine" "hft-engine" || FAILED=$((FAILED + 1))
check_service "Backend" "hft-backend" || FAILED=$((FAILED + 1))
check_service "Frontend" "hft-frontend" || FAILED=$((FAILED + 1))
check_service "Redis" "hft-redis" || FAILED=$((FAILED + 1))
check_service "Kafka" "hft-kafka" || FAILED=$((FAILED + 1))

check_health || FAILED=$((FAILED + 1))
check_metrics || FAILED=$((FAILED + 1))
check_database || FAILED=$((FAILED + 1))

log "=== Health Check Complete ==="
log "Failed checks: $FAILED"

if [ $FAILED -gt 0 ]; then
    send_alert "HFT system has $FAILED failed health checks. Please investigate."
    exit 1
else
    log "All systems healthy ✓"
    exit 0
fi

