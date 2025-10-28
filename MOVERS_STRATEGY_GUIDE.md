# Daily Movers Strategy - Control Panel Guide

## 🎉 Status: LIVE & ENABLED

Your Daily Movers momentum trading strategy is now fully operational!

## 🎨 Access Your Control Panel

**Main Control Panel**: http://localhost:3003/strategy/movers
**Production URL**: https://hft.widesurf.com/strategy/movers

## 📊 Control Panel Features

### Real-Time Dashboard
- **Auto-refresh every 5 seconds** - Always up-to-date
- **Strategy status** - Running/Stopped with API selection
- **Active positions** - Live P&L tracking for each position
- **Market status** - Hours, cutoff times, and timing indicators
- **Performance metrics** - Total positions, daily trades, API failures

### Interactive Controls
1. **Enable/Disable Toggle** - One-click strategy control
2. **Force Close All** - Emergency stop button for all positions
3. **Refresh Button** - Manual data refresh
4. **Real-time Updates** - Automatic updates every 5 seconds

### Visual Indicators
- ✅ **Green**: Profitable positions, enabled status
- ❌ **Red**: Unprofitable positions, disabled status
- 🟡 **Amber**: Warnings and API failures
- 🔵 **Blue**: Neutral information

## ⚙️ Strategy Configuration

### Current Settings
```
Buy Threshold: 5.0% gain
Sell Threshold: 4.5% profit
Investment Amount: $1,000 per trade
Check Interval: Every 10 seconds
Max Positions: 10 concurrent
Timezone: America/Chicago (Central Time)
```

### Trading Hours
- **Market Open**: 8:30 AM CT
- **Buy Window**: 8:30 AM - 9:00 AM CT
- **Sell Window**: All day until 3:50 PM CT
- **Force Close**: 3:50 PM CT (10 min before close)

## 📈 How It Works

### Buy Logic (Every 10 seconds)
1. Checks if before 9:00 AM CT
2. Fetches top daily movers from fastest API
3. Filters stocks with 5%+ gain since market open
4. Buys one position per symbol for $1,000
5. Maximum 10 concurrent positions
6. No duplicate symbols per day

### Sell Logic (Every 10 seconds)
1. Monitors all active positions
2. Sells when:
   - Profit reaches 4.5% from purchase price, OR
   - Time reaches 3:50 PM CT
3. Updates position status in real-time

## 🔌 API Endpoints

### Status & Control
```bash
# Get strategy status
GET http://localhost:8082/api/strategy/movers/status

# Get active positions
GET http://localhost:8082/api/strategy/movers/positions

# Get performance metrics
GET http://localhost:8082/api/strategy/movers/performance

# Enable strategy
POST http://localhost:8082/api/strategy/movers/enable

# Disable strategy
POST http://localhost:8082/api/strategy/movers/disable

# Force close all positions
POST http://localhost:8082/api/strategy/movers/force-close
```

### Example Response
```json
{
  "success": true,
  "data": {
    "running": true,
    "enabled": true,
    "selected_api": "alpaca",
    "api_failures": 0,
    "active_positions": 0,
    "purchased_today": 0,
    "config": {
      "buy_threshold": 5.0,
      "sell_threshold": 4.5,
      "investment_amount": 1000,
      "check_interval": 10,
      "max_positions": 10
    },
    "market_hours": false,
    "before_cutoff": true,
    "near_close": false,
    "current_time": "2025-10-25 06:28:41"
  }
}
```

## 🛡️ Safety Features

### Risk Management
- ✅ Fixed $1,000 per trade
- ✅ Maximum 10 concurrent positions
- ✅ One position per symbol per day
- ✅ Automatic forced close at 3:50 PM CT
- ✅ Market hours validation

### Error Handling
- ✅ Automatic API failover (Alpaca ↔ Polygon)
- ✅ Connection retry logic
- ✅ Comprehensive error logging
- ✅ Real-time status monitoring

### Data Persistence
- ✅ **Redis**: Fast in-memory position tracking
- ✅ **PostgreSQL**: Complete audit trail
- ✅ **Kafka**: Event streaming for analytics

## 📱 Using the Control Panel

### 1. Enable/Disable Strategy
Click the toggle switch in the top right corner to enable or disable the strategy.

### 2. Monitor Active Positions
The "Active Positions" card shows:
- Symbol and quantity
- Purchase price and time
- Current value and P&L
- Profit percentage

### 3. View Performance
The "Performance Summary" shows:
- Total positions taken
- Positions purchased today
- API failure count

### 4. Emergency Stop
Click "Force Close All" to immediately close all open positions (requires confirmation).

### 5. Status Indicators
- **Running**: Strategy is actively monitoring
- **Enabled**: Strategy will execute trades
- **Market Hours**: Markets are open
- **Before 9 AM CT**: In buy window
- **Near Close**: Approaching forced close time

## 🔍 Monitoring Logs

### View Real-Time Logs
```bash
# Backend logs (Go API)
docker-compose logs -f hft-backend

# Engine logs (C++ Strategy)
docker-compose logs -f hft-engine

# Frontend logs
docker-compose logs -f hft-frontend
```

### Database Queries
```sql
-- View all positions
SELECT * FROM movers_positions ORDER BY created_at DESC;

-- View today's positions
SELECT * FROM movers_positions 
WHERE DATE(purchase_time) = CURRENT_DATE
ORDER BY purchase_time DESC;

-- Performance summary
SELECT 
    COUNT(*) as total_positions,
    SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_positions,
    SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_positions,
    AVG(profit_pct) as avg_profit_pct,
    SUM(profit_loss) as total_profit_loss
FROM movers_positions;
```

## 🐛 Troubleshooting

### Strategy Not Trading
1. Check if enabled: Toggle switch should be ON
2. Check market hours: Markets must be open
3. Check time: Must be before 9:00 AM CT for buying
4. Check positions: Must be under 10 concurrent positions
5. Check logs: `docker-compose logs hft-engine`

### Control Panel Not Loading
1. Check frontend: `docker-compose ps hft-frontend`
2. Restart if needed: `docker-compose restart hft-frontend`
3. Check logs: `docker-compose logs hft-frontend`

### API Errors
1. Check API credentials in `.env` file
2. Verify Alpaca connection: `curl http://localhost:8082/health`
3. Check API failures counter in control panel
4. System automatically switches to backup API

## 📊 Expected Behavior

### During Market Hours (8:30 AM - 4:00 PM CT)

#### Before 9:00 AM CT (Buy Window)
- Strategy checks movers every 10 seconds
- Buys stocks with 5%+ gains
- Up to 10 positions, $1,000 each

#### After 9:00 AM CT (Sell-Only Mode)
- No new purchases
- Monitors existing positions every 10 seconds
- Sells at 4.5% profit or 3:50 PM CT

#### After 4:00 PM CT (Market Closed)
- All positions force-closed at 3:50 PM
- Strategy pauses until next trading day
- Resets daily purchase tracking

## 🎯 Success Metrics

Monitor these KPIs in your control panel:
- **Win Rate**: Percentage of profitable trades
- **Average Profit**: Mean profit per closed position
- **Daily Volume**: Number of trades per day
- **API Reliability**: Low failure count
- **Execution Speed**: <100ms response time

## 🔐 Security Notes

- Control panel requires no authentication (internal network)
- API endpoints use optional authentication
- Database credentials stored in environment variables
- All trades logged for audit compliance

## 📞 Support

If you encounter issues:
1. Check logs: `docker-compose logs`
2. Restart services: `docker-compose restart`
3. View strategy status: API endpoint or control panel
4. Check database: Query `movers_positions` table

## 🚀 Next Steps

1. **Monitor**: Watch the control panel during market hours
2. **Analyze**: Review performance metrics daily
3. **Optimize**: Adjust thresholds based on results
4. **Scale**: Increase investment amounts if successful

---

**Strategy Status**: ✅ ENABLED & RUNNING
**Last Updated**: 2025-10-25
**Version**: 1.0.0
