# HFT Daily Movers Mixed Content Fix

## Issue
The `/daily-movers` page at `https://hft.widesurf.com/daily-movers` was showing an error:
```
Mixed Content: The page at 'https://hft.widesurf.com/daily-movers' was loaded over HTTPS, 
but requested an insecure XMLHttpRequest endpoint 'http://hft-backend:8082/api/movers'. 
This request has been blocked; the content must be served over HTTPS.
```

## Root Cause
1. The frontend was configured with `NEXT_PUBLIC_API_URL=http://hft-backend:8082` (internal Docker URL)
2. Traefik wasn't routing `/api` requests from `hft.widesurf.com` to the backend
3. Browser blocked mixed content (HTTPS page calling HTTP endpoint)

## Solution Applied

### 1. Added Traefik API Routing
Updated `/home/pbieda/traefik/config/dynamic.yml`:

```yaml
# hft.widesurf.com /api -> 178.128.15.57:8082 (Backend API)
hft-api:
  rule: "Host(`hft.widesurf.com`) && PathPrefix(`/api`)"
  service: hftapi-svc
  entryPoints:
    - websecure
  tls:
    certResolver: letsencrypt
  middlewares:
    - security-headers
    - api-rate-limit
  priority: 100

# hft.widesurf.com -> 178.128.15.57:3003 (Frontend)
hft:
  rule: "Host(`hft.widesurf.com`)"
  service: hft-svc
  entryPoints:
    - websecure
  tls:
    certResolver: letsencrypt
  middlewares:
    - security-headers
    - compression
  priority: 1
```

### 2. Fixed Frontend API Configuration
Updated `/home/pbieda/scripts/hft/docker-compose.yml`:

**Before:**
```yaml
environment:
  - NEXT_PUBLIC_API_URL=http://hft-backend:8082
```

**After:**
```yaml
environment:
  - NEXT_PUBLIC_API_URL=
```

This makes the frontend use relative paths (`/api/movers`) which Traefik routes to the backend.

### 3. Rebuilt and Restarted
- Rebuilt HFT frontend container
- Restarted Traefik to apply routing rules
- Restarted HFT frontend container

## API Response Format

The `/api/movers` endpoint returns:

```json
{
  "movers": {
    "gainers": [
      {
        "symbol": "CODX",
        "price": 1.26,
        "change": 0.9093,
        "percent_change": 259.28
      },
      // ... more gainers
    ],
    "losers": [
      {
        "symbol": "ADVWW",
        "price": 0.0043,
        "change": -0.006,
        "percent_change": -58.25
      },
      // ... more losers
    ],
    "last_updated": "2025-10-27T23:59:00.110370082Z",
    "market_type": "stocks"
  },
  "success": true
}
```

## Request Flow

```
Browser → https://hft.widesurf.com/api/movers
   ↓
Traefik (priority 100 routing)
   ↓
HFT Backend Container (port 8082)
   ↓
API Handler (/api/movers endpoint)
   ↓
Response (via HTTPS)
```

## Test URLs

- **Frontend**: https://hft.widesurf.com/daily-movers
- **API**: https://hft.widesurf.com/api/movers
- **Backend Direct**: http://localhost:8082/api/movers (local only)

## Status: ✅ FIXED

The page now loads without errors and displays:
- ✅ Top 20 Gainers with real-time data
- ✅ Top 20 Losers with real-time data
- ✅ No mixed content errors
- ✅ Data refreshes every 30 seconds
- ✅ All requests via HTTPS

## Files Modified

1. `/home/pbieda/traefik/config/dynamic.yml` - Added HFT API routing
2. `/home/pbieda/scripts/hft/docker-compose.yml` - Removed hardcoded backend URL
3. Restarted: Traefik, hft-frontend

---
*Last Updated: October 28, 2025*
*Fixed by: AI Assistant*

