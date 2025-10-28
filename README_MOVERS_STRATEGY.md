# Daily Movers Momentum Trading Strategy

## Overview

The Daily Movers Strategy is an automated trading system that monitors top daily movers and executes momentum trades based on predefined criteria. The strategy runs two parallel monitoring loops every 10 seconds to capture momentum opportunities.

## Strategy Logic

### Buy Conditions
- **Time Window**: Market open until 9:00 AM CT
- **Gain Threshold**: Stock must have gained 5% or more since market open
- **Investment Amount**: $1,000 per position
- **Max Positions**: 10 concurrent positions
- **Duplicate Prevention**: Only one position per symbol per day

### Sell Conditions
- **Profit Target**: 4.5% profit from purchase price, OR
- **Time-based**: 10 minutes before market close (3:50 PM CT)
- **Automatic**: All positions are force-closed at market close

## Architecture

### C++ Engine Components
- **ApiBenchmark**: Automatically selects fastest API (Alpaca vs Polygon)
- **MoversStrategy**: Core strategy logic with buy/sell monitoring threads
- **RedisClient**: High-performance position tracking with TTL
- **ExecutionEngine**: Integrates strategy with ZeroMQ communication

### Go Backend API
- **Strategy Control**: Enable/disable, force close, status monitoring
- **Position Tracking**: Real-time position management
- **Performance Metrics**: P&L tracking and analytics

### Database Schema
- **movers_positions**: Complete audit trail of all positions
- **Indexes**: Optimized for symbol and status queries
- **Triggers**: Automatic timestamp updates

## API Endpoints

### Strategy Control
- `GET /api/strategy/movers/status` - Strategy status and configuration
- `GET /api/strategy/movers/positions` - Active positions
- `GET /api/strategy/movers/performance` - Performance metrics
- `POST /api/strategy/movers/enable` - Enable strategy
- `POST /api/strategy/movers/disable` - Disable strategy
- `POST /api/strategy/movers/force-close` - Force close all positions

### Market Data
- `GET /api/movers` - Top daily movers
- `GET /api/performance/alpaca` - Alpaca API performance
- `GET /api/performance/polygon` - Polygon API performance

## Configuration

### Environment Variables
```bash
# Strategy Configuration
MOVERS_STRATEGY_ENABLED=true
MOVERS_BUY_THRESHOLD=5.0
MOVERS_SELL_THRESHOLD=4.5
MOVERS_INVESTMENT_AMOUNT=1000
MOVERS_CHECK_INTERVAL=10

# Timezone
TZ=America/Chicago

# API Credentials
ALPACA_API_KEY=your_key_here
ALPACA_API_SECRET=your_secret_here
POLYGON_API_KEY=your_key_here
```

### Redis Keys
- `movers:positions:active` - Set of active position symbols
- `movers:position:{SYMBOL}` - Hash with position details
- `movers:api_selected` - Current fastest API selection
- `movers:purchased_today` - Set of symbols purchased today (expires at 4 PM CT)

## Safety Features

### Risk Management
- **Position Limits**: Maximum 10 concurrent positions
- **Daily Limits**: One position per symbol per day
- **Investment Limits**: Fixed $1,000 per trade
- **Time Limits**: No new positions after 9:00 AM CT

### Error Handling
- **API Failures**: Automatic fallback to alternate API
- **Connection Issues**: Graceful degradation with retry logic
- **Market Hours**: Automatic validation of trading hours
- **Force Close**: Emergency position closure capability

### Monitoring
- **Real-time Status**: Live strategy status via API
- **Performance Tracking**: P&L and success rate metrics
- **Error Logging**: Comprehensive error tracking
- **Health Checks**: System health monitoring

## Usage

### Starting the Strategy
```bash
# Start all services
cd /home/pbieda/scripts/hft
docker-compose up -d

# Check strategy status
curl http://localhost:8082/api/strategy/movers/status
```

### Monitoring
```bash
# View active positions
curl http://localhost:8082/api/strategy/movers/positions

# Check performance
curl http://localhost:8082/api/strategy/movers/performance

# View logs
docker-compose logs -f hft-engine
```

### Control
```bash
# Enable strategy
curl -X POST http://localhost:8082/api/strategy/movers/enable

# Disable strategy
curl -X POST http://localhost:8082/api/strategy/movers/disable

# Force close all positions
curl -X POST http://localhost:8082/api/strategy/movers/force-close
```

## Performance Optimization

### Latency Optimization
- **API Benchmarking**: Automatic selection of fastest data source
- **Redis Caching**: Sub-millisecond position lookups
- **ZeroMQ Communication**: Ultra-low latency engine communication
- **C++ Implementation**: Maximum performance for 10-second polling

### Scalability
- **Thread-based Architecture**: Parallel buy/sell monitoring
- **Connection Pooling**: Efficient API connection management
- **Memory Optimization**: Minimal memory footprint
- **Database Indexing**: Optimized queries for large datasets

## Troubleshooting

### Common Issues
1. **Strategy not starting**: Check API credentials and Redis connection
2. **No positions created**: Verify market hours and gain thresholds
3. **API errors**: Check network connectivity and API limits
4. **Database errors**: Verify PostgreSQL connection and schema

### Debug Commands
```bash
# Check engine logs
docker-compose logs hft-engine

# Check backend logs
docker-compose logs hft-backend

# Test API connectivity
curl http://localhost:8082/health

# Check Redis connection
docker exec hft-redis redis-cli ping
```

## Development

### Building
```bash
# Build C++ engine
cd engine && mkdir build && cd build
cmake .. && make

# Build Go backend
cd backend && go build

# Build frontend
cd frontend && npm run build
```

### Testing
```bash
# Run strategy tests
cd engine && ./test_movers_strategy

# Run API tests
cd backend && go test ./...

# Integration tests
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

## License

Proprietary - All rights reserved
