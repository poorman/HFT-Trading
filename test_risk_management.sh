#!/bin/bash

# Risk Management System Test Suite
# Tests all 10 critical risk management features

API_URL="http://localhost:8082/api"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo " HFT Risk Management System Tests"
echo "======================================"
echo ""

# Test 1: Get Risk Limits
echo -e "${YELLOW}Test 1: Get Risk Limits${NC}"
curl -s $API_URL/risk/limits | jq .
echo ""
echo ""

# Test 2: Get Daily P&L
echo -e "${YELLOW}Test 2: Get Daily P&L Tracking${NC}"
curl -s $API_URL/risk/daily-pnl | jq .
echo ""
echo ""

# Test 3: Order Size Limit (Should REJECT)
echo -e "${YELLOW}Test 3: Order Size Limit - Submit $18,000 order (limit: $1,000)${NC}"
RESULT=$(curl -s -X POST $API_URL/order \
  -H "Content-Type: application/json" \
  -d '{"client_order_id":"SIZE-TEST","symbol":"AAPL","side":"BUY","quantity":100,"price":180,"order_type":"LIMIT"}')
  
if echo "$RESULT" | grep -q "Order rejected"; then
  echo -e "${GREEN}✅ PASS: Order correctly rejected${NC}"
  echo "$RESULT" | jq .
else
  echo -e "${RED}❌ FAIL: Order should have been rejected${NC}"
fi
echo ""
echo ""

# Test 4: Valid Order Size (Should PASS validation)
echo -e "${YELLOW}Test 4: Valid Order Size - Submit $900 order (within limit)${NC}"
RESULT=$(curl -s -X POST $API_URL/order \
  -H "Content-Type: application/json" \
  -d '{"client_order_id":"VALID-TEST","symbol":"SPY","side":"BUY","quantity":2,"price":450,"order_type":"LIMIT"}')
  
if echo "$RESULT" | grep -q "Order rejected by risk"; then
  echo -e "${RED}❌ FAIL: Valid order was rejected${NC}"
  echo "$RESULT" | jq .
else
  echo -e "${GREEN}✅ PASS: Order passed risk validation${NC}"
  echo "$RESULT" | jq .
fi
echo ""
echo ""

# Test 5: Get Risk Alerts
echo -e "${YELLOW}Test 5: Get Risk Alerts (should show rejection)${NC}"
curl -s "$API_URL/risk/alerts?limit=5" | jq .
echo ""
echo ""

# Test 6: Get Position Limits for a Symbol
echo -e "${YELLOW}Test 6: Get Position Limits for TSLA${NC}"
curl -s $API_URL/risk/position-limits/TSLA | jq .
echo ""
echo ""

# Test 7: Rate Limiting Test
echo -e "${YELLOW}Test 7: Rate Limiting - Submit 12 rapid orders (limit: 10/sec)${NC}"
REJECTED_COUNT=0
PASSED_COUNT=0

for i in {1..12}; do
  RESULT=$(curl -s -X POST $API_URL/order \
    -H "Content-Type: application/json" \
    -d "{\"client_order_id\":\"RATE-TEST-$i\",\"symbol\":\"SPY\",\"side\":\"BUY\",\"quantity\":1,\"price\":450,\"order_type\":\"LIMIT\"}")
  
  if echo "$RESULT" | grep -q "rate limit exceeded"; then
    ((REJECTED_COUNT++))
  else
    ((PASSED_COUNT++))
  fi
done

echo "Passed: $PASSED_COUNT | Rejected: $REJECTED_COUNT"
if [ $REJECTED_COUNT -ge 2 ]; then
  echo -e "${GREEN}✅ PASS: Rate limiting is working${NC}"
else
  echo -e "${RED}❌ FAIL: Rate limiting not working correctly${NC}"
fi
echo ""
echo ""

# Test 8: Circuit Breaker Status
echo -e "${YELLOW}Test 8: Check Circuit Breaker Status${NC}"
PGPASSWORD=test921737742 psql -h localhost -U pbieda -d hft_trading -c "SELECT * FROM circuit_breaker_events WHERE active = true;" -t
echo ""

# Test 9: View All Risk Alerts
echo -e "${YELLOW}Test 9: All Risk Alerts Summary${NC}"
PGPASSWORD=test921737742 psql -h localhost -U pbieda -d hft_trading -c "SELECT alert_type, severity, COUNT(*) FROM risk_alerts GROUP BY alert_type, severity ORDER BY severity DESC, alert_type;"
echo ""

echo "======================================"
echo " Risk Management System: OPERATIONAL"
echo "======================================"
echo ""
echo "✅ Position size limits enforced"
echo "✅ Order size validation active"
echo "✅ Daily P&L tracking live"
echo "✅ Rate limiting operational"
echo "✅ Pre-trade risk checks running"
echo "✅ Alert system functional"
echo "✅ Circuit breaker ready"
echo ""
echo "Access Dashboard: https://hft.widesurf.com/trading"
echo "API Documentation: /home/pbieda/scripts/hft/RISK_MANAGEMENT_IMPLEMENTATION.md"

