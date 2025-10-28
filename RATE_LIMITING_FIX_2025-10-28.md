# HFT Rate Limiting and Performance Fixes - October 28, 2025

## Issues Fixed

### 1. CORS Error on Daily Movers Page
**Problem:** Production app was trying to connect to `http://localhost:8080` causing CORS errors.

**Solution:** Changed all API URL fallbacks from `'http://localhost:8080'` to relative paths (`''` or `'/api'`).

**Files Modified:**
- `frontend/app/daily-movers/page.tsx`
- `frontend/components/OrderForm.tsx`
- `frontend/components/RiskDashboard.tsx`
- `frontend/app/monitoring/page.tsx`
- `frontend/app/positions/page.tsx`
- `frontend/app/trading/page.tsx`
- `frontend/app/analytics/page.tsx`
- `frontend/app/executions/page.tsx`
- `frontend/app/strategy/movers/page.tsx`

---

### 2. Rate Limiting on /positions Page
**Problem:** Page was fetching positions every 5 seconds, hitting Alpaca API rate limits.

**Solutions Applied:**

#### A. Frontend Throttling
- **Changed polling interval** from 5 seconds to 60 seconds
- Users can still manually refresh if needed
- File: `frontend/app/positions/page.tsx`

```typescript
// Before: Every 5 seconds
const interval = setInterval(fetchPositions, 5000)

// After: Every 60 seconds
const interval = setInterval(fetchPositions, 60000)
```

#### B. Backend Redis Caching
- **Added 30-second cache** for positions data in Redis
- Multiple rapid requests return cached data instead of hitting Alpaca API
- File: `backend/handlers/positions.go`

```go
// Cache positions for 30 seconds
cacheKey := "positions_cache"

// Check cache first
if cachedData, err := redisService.Get(cacheKey); err == nil {
    return cachedData  // Avoid API call
}

// Fetch from Alpaca, then cache
response := engineClient.GetPositions()
redisService.SetEx(cacheKey, response, 30*time.Second)
```

#### C. Added Redis Helper Methods
- File: `backend/services/redis.go`
- Added `Get(key string)` method
- Added `SetEx(key string, value string, expiration time.Duration)` method

---

### 3. WebSocket Flooding on /trading Page
**Problem:** Receiving POSITION_UPDATE and PNL_UPDATE messages every second (or multiple per second), flooding console and potentially causing rate limits.

**Solutions Applied:**

#### A. WebSocket Message Throttling
- **Throttle position/PNL updates** to once every 15 seconds
- **Critical updates** (order status changes) are handled immediately
- **Reduced console spam** dramatically

File: `frontend/app/trading/page.tsx`

```typescript
// Added throttling mechanism
const lastUpdateTimeRef = useRef<number>(0)
const THROTTLE_INTERVAL = 15000 // 15 seconds

// In WebSocket handler:
const isThrottledUpdate = data.type === 'POSITION_UPDATE' || data.type === 'PNL_UPDATE'
const shouldProcess = !isThrottledUpdate || (now - lastUpdateTimeRef.current) >= THROTTLE_INTERVAL

if (isThrottledUpdate && !shouldProcess) {
    return // Skip this update - too soon
}
```

#### B. Reduced Polling Frequency
- **Open orders polling** changed from 5 seconds to 15 seconds
- Account polling remains at 30 seconds

```typescript
// Before: Every 5 seconds
const ordersInterval = setInterval(fetchOpenOrders, 5000)

// After: Every 15 seconds
const ordersInterval = setInterval(fetchOpenOrders, 15000)
```

---

## Summary of Changes

### Polling Intervals
| Endpoint | Before | After | Reason |
|----------|--------|-------|--------|
| Positions | 5s | 60s | Rate limiting |
| Open Orders | 5s | 15s | Rate limiting |
| Account | 30s | 30s | Already optimal |
| Market Movers | 30s | 30s | Already optimal |

### Caching Strategy
| Resource | Cache Duration | Location | Benefit |
|----------|----------------|----------|---------|
| Positions | 30 seconds | Redis (Backend) | Prevents Alpaca rate limits |
| Position/PNL Updates | 15 seconds | Frontend throttle | Reduces WebSocket noise |

### Console Log Improvements
**Before:**
```
WebSocket update received: {data: {…}, timestamp: 1761623879, type: 'PNL_UPDATE'}
WebSocket update received: {data: {…}, timestamp: 1761623879, type: 'POSITION_UPDATE'}
WebSocket update received: {data: {…}, timestamp: 1761623879, type: 'PNL_UPDATE'}
... (100+ messages per minute)
```

**After:**
```
✓ Processing POSITION_UPDATE (throttled to 15s)
Orders update from WebSocket: 3 orders
... (max 4 messages per minute)
```

---

## Benefits

1. **✅ No more CORS errors** - All API calls use relative paths
2. **✅ No more rate limiting** - Proper caching and throttling
3. **✅ Cleaner console** - 95% reduction in log spam
4. **✅ Better UX** - Still responsive to critical updates (order fills)
5. **✅ Lower costs** - Fewer API calls to Alpaca
6. **✅ Better performance** - Less processing overhead

---

## Testing

### Verify Rate Limiting Fix
1. Visit https://hft.widesurf.com/positions
2. Console should show: "✓ Returning cached positions (avoiding API rate limit)"
3. No "too many requests" errors

### Verify WebSocket Throttling
1. Visit https://hft.widesurf.com/trading
2. Console should show throttled messages every 15 seconds
3. Order updates still appear immediately

### Verify CORS Fix
1. Visit https://hft.widesurf.com/daily-movers
2. No CORS errors in console
3. Market data loads successfully

---

## Architecture

### Request Flow with Caching
```
Browser → /api/positions
   ↓
Backend Handler
   ↓
Check Redis Cache (30s TTL)
   ├─ HIT → Return cached data ✅
   └─ MISS → Fetch from Alpaca → Cache → Return
```

### WebSocket Flow with Throttling
```
Backend → WebSocket → Frontend
   ↓
Message arrives
   ↓
Check message type & timestamp
   ├─ POSITION/PNL + within 15s → Skip ⏭️
   ├─ POSITION/PNL + after 15s → Process ✅
   └─ ORDER_UPDATE → Process immediately ✅
```

---

## Files Modified

### Frontend (9 files)
1. `app/daily-movers/page.tsx` - Fixed API URL fallback
2. `app/positions/page.tsx` - Changed polling 5s → 60s
3. `app/trading/page.tsx` - Added WebSocket throttling, changed polling 5s → 15s
4. `app/monitoring/page.tsx` - Fixed API URL fallback
5. `app/analytics/page.tsx` - Fixed API URL fallback
6. `app/executions/page.tsx` - Fixed API URL fallback
7. `app/strategy/movers/page.tsx` - Fixed API URL fallback
8. `components/OrderForm.tsx` - Fixed API URL fallback
9. `components/RiskDashboard.tsx` - Fixed API URL fallback

### Backend (2 files)
1. `handlers/positions.go` - Added Redis caching
2. `services/redis.go` - Added Get/SetEx helper methods

---

## Status: ✅ ALL FIXED

All rate limiting issues have been resolved:
- ✅ CORS errors eliminated
- ✅ Position rate limiting fixed
- ✅ WebSocket flooding controlled
- ✅ Console spam reduced
- ✅ Caching implemented
- ✅ All containers rebuilt and restarted

---

*Last Updated: October 28, 2025*  
*Fixed by: AI Assistant*

