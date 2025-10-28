# HFT Trading System - Quick Start Guide

## System Status ✓

All services are running and connected:

- ✅ **C++ Trading Engine** - Running on port 5555 (ZeroMQ)
- ✅ **Go Backend API** - Running on port 8082
- ✅ **Next.js Frontend** - Running on port 3003
- ✅ **Redis Cache** - Running on port 6380
- ✅ **Kafka/Redpanda** - Running on ports 9092, 29092
- ✅ **PostgreSQL** - Connected to existing database (hft_trading)

## Access Points

### Frontend Application
**http://localhost:3003**

Pages available:
- `/trading` - Order submission terminal
- `/positions` - Real-time positions view
- `/executions` - Execution history
- `/analytics` - P&L analytics (coming soon)
- `/monitoring` - System metrics

### Backend API
**http://localhost:8082**

Endpoints:
- `GET /health` - Health check
- `POST /api/order` - Submit order
- `GET /api/orders` - List orders
- `GET /api/positions` - Get positions
- `GET /api/executions` - Get executions
- `GET /ws` - WebSocket for real-time updates

### Infrastructure
- **PostgreSQL**: a39c456f9738_local_pgdb:5432 (database: hft_trading)
- **Redis**: hft-redis:6379 (internal)
- **Kafka**: hft-kafka:9092 (internal)
- **Grafana**: http://178.128.15.57:3002 (existing)
- **Prometheus**: http://178.128.15.57:9090 (existing)

## Testing the System

### 1. Check Health
```bash
curl http://localhost:8082/health
# Expected: {"status":"ok"}
```

### 2. Submit Test Order
```bash
curl -X POST http://localhost:8082/api/order \
  -H "Content-Type: application/json" \
  -d '{
    "client_order_id": "TEST001",
    "symbol": "AAPL",
    "side": "BUY",
    "quantity": 100,
    "price": 150.50,
    "order_type": "LIMIT"
  }'
```

### 3. View Positions
```bash
curl http://localhost:8082/api/positions
```

### 4. View Executions
```bash
curl http://localhost:8082/api/executions
```

## Managing the System

### Start All Services
```bash
cd /home/pbieda/scripts/hft
docker-compose up -d
```

### Stop All Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f hft-engine
docker-compose logs -f hft-backend
docker-compose logs -f hft-frontend
```

### Restart Service
```bash
docker-compose restart hft-backend
```

## Configuration

### Alpaca Paper Trading (Optional)

To enable live paper trading with Alpaca:

1. Get API credentials from https://alpaca.markets/
2. Edit `/home/pbieda/scripts/hft/.env`:
```bash
ALPACA_API_KEY=your_api_key_here
ALPACA_API_SECRET=your_api_secret_here
```

3. Restart the engine:
```bash
docker-compose restart hft-engine
```

Without Alpaca credentials, the system uses internal order matching.

## Architecture

```
Browser (localhost:3003)
    ↓
Next.js Frontend
    ↓ HTTP/WebSocket
Go Backend API (port 8082)
    ↓ ZeroMQ
C++ Trading Engine (port 5555)
    ↓ HTTP
Alpaca Paper Trading API (optional)
```

Data Flow:
- Orders: Frontend → Backend → Engine → Alpaca/Internal → Backend → Database/Kafka
- Positions: Engine → Backend → Frontend (via WebSocket)
- Market Data: Alpaca → Redis → Frontend

## Database Tables

Created in `hft_trading` database:
- `orders` - All submitted orders
- `executions` - Trade execution records

To view data:
```bash
docker exec -it a39c456f9738_local_pgdb psql -U pbieda -d hft_trading -c "SELECT * FROM orders LIMIT 10;"
```

## Next Steps

1. **Test the UI**: Open http://localhost:3003/trading
2. **Submit an order**: Fill the form and click "Submit Order"
3. **Monitor executions**: Check the execution table updates
4. **View positions**: Navigate to http://localhost:3003/positions
5. **Configure Alpaca**: Add API keys to test real paper trading

## Troubleshooting

### Frontend can't connect to backend
- Check backend logs: `docker logs hft-backend`
- Verify backend is running: `curl http://localhost:8082/health`

### Engine not responding
- Check engine logs: `docker logs hft-engine`
- Test ZeroMQ connection from backend logs

### Database connection errors
- Ensure PostgreSQL container is running
- Check database exists: `docker exec a39c456f9738_local_pgdb psql -U pbieda -l | grep hft_trading`

## Performance Notes

Current configuration is optimized for development. For production:

1. **Kernel tuning**: Apply sysctl parameters in README.md
2. **CPU pinning**: Pin C++ engine to dedicated cores
3. **Network optimization**: Use kernel bypass (DPDK) for ultra-low latency
4. **Memory**: Configure huge pages
5. **Monitoring**: Set up Prometheus scraping for metrics

## Support

For issues or questions:
- Check logs: `docker-compose logs`
- Review README.md for detailed documentation
- Inspect container status: `docker-compose ps`

