# HFT Trading System

Ultra-low-latency high-frequency trading platform with React/Next.js frontend, Go backend API, C++ trading engine, and full data pipeline.

## Architecture

```
┌─────────────┐     HTTP/WS      ┌──────────────┐    ZeroMQ    ┌─────────────────┐
│  Next.js    │ ◄──────────────► │   Go API     │ ◄──────────► │  C++ Engine     │
│  Frontend   │                  │   (Gin)      │              │  (Trading Core) │
└─────────────┘                  └──────────────┘              └─────────────────┘
                                        │                              │
                                        │                              │
                                        ▼                              ▼
                                 ┌──────────────┐              ┌──────────────┐
                                 │   Kafka      │              │   Alpaca     │
                                 │  (Events)    │              │ Paper Trading│
                                 └──────────────┘              └──────────────┘
                                        │
                                        ▼
                         ┌──────────────────────────────┐
                         │  TimescaleDB   │   Redis     │
                         │  (Historical)  │   (Cache)   │
                         └──────────────────────────────┘
```

## Components

### 1. **C++ Trading Engine** (`/engine`)
- Lock-free order book implementation
- ZeroMQ listener on port 5555
- Alpaca paper trading API integration
- Nanosecond-precision timestamps
- Event-driven architecture

### 2. **Go Backend API** (`/backend`)
- Gin framework with REST endpoints
- WebSocket server for real-time updates
- ZeroMQ client to C++ engine
- Kafka producer for event streaming
- Redis caching layer
- JWT authentication support

### 3. **Next.js Frontend** (`/frontend`)
- Trading terminal with order entry
- Real-time execution updates via WebSocket
- Position management dashboard
- Analytics and P&L visualization
- System monitoring

### 4. **Python Strategy** (`/strategy`)
- Backtesting framework with backtrader
- Data loader from TimescaleDB
- Signal generation pipeline
- Performance analytics

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Existing PostgreSQL container (`a39c456f9738_local_pgdb`)
- Existing Grafana and Prometheus (optional)

### Environment Variables

Create `.env` file in the root directory:

```bash
# Alpaca Paper Trading (optional)
ALPACA_API_KEY=your_api_key_here
ALPACA_API_SECRET=your_api_secret_here
```

### Build and Run

```bash
# Start all services
cd /home/pbieda/scripts/hft
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Access Points

- **Frontend**: http://localhost:3003
- **Backend API**: http://localhost:8080
- **C++ Engine**: tcp://localhost:5555 (ZeroMQ)
- **Kafka**: localhost:9092
- **Redis**: localhost:6380

## API Endpoints

### Orders
- `POST /api/order` - Submit new order
- `GET /api/orders` - List all orders
- `GET /api/orders/:id` - Get specific order

### Positions
- `GET /api/positions` - Get all positions

### Executions
- `GET /api/executions` - Get execution history

### WebSocket
- `GET /ws` - Real-time updates stream

## Database Schema

The system uses the existing PostgreSQL instance with these tables:

### orders
```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    client_order_id VARCHAR UNIQUE,
    order_id VARCHAR UNIQUE,
    symbol VARCHAR,
    side VARCHAR,
    quantity DECIMAL,
    price DECIMAL,
    order_type VARCHAR,
    status VARCHAR,
    filled_qty DECIMAL,
    remaining_qty DECIMAL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### executions
```sql
CREATE TABLE executions (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR,
    client_order_id VARCHAR,
    symbol VARCHAR,
    side VARCHAR,
    fill_price DECIMAL,
    fill_qty DECIMAL,
    timestamp TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Convert to hypertable for TimescaleDB
SELECT create_hypertable('executions', 'timestamp');
```

## Development

### C++ Engine
```bash
cd engine
mkdir build && cd build
cmake ..
make
./hft_engine
```

### Go Backend
```bash
cd backend
go mod download
go run main.go
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Python Strategy
```bash
cd strategy
pip install -r requirements.txt
python backtest.py
```

## Performance Optimization

### Kernel Tuning (Production)
```bash
# Disable CPU frequency scaling
sudo cpupower frequency-set -g performance

# Set scheduler latency
sudo sysctl -w kernel.sched_latency_ns=1000000
sudo sysctl -w kernel.sched_min_granularity_ns=100000

# Enable huge pages
sudo sysctl -w vm.nr_hugepages=1024

# TCP tuning
sudo sysctl -w net.core.rmem_max=134217728
sudo sysctl -w net.core.wmem_max=134217728
```

### CPU Pinning
```bash
# Pin C++ engine to specific cores
taskset -c 0,1 ./hft_engine
```

## Monitoring

- **Grafana**: http://178.128.15.57:3002
- **Prometheus**: http://178.128.15.57:9090

Custom dashboards will be created for:
- Order flow metrics
- Latency distribution (p50, p95, p99)
- Position tracking
- System health

## Security

- All inter-service communication over private Docker network
- JWT tokens for API authentication
- TLS for production deployment
- API keys stored in environment variables
- Audit logging for compliance

## Deployment

### Development
```bash
docker-compose up -d
```

### Production (Bare-Metal)
1. Install dependencies on host
2. Configure kernel parameters
3. Pin processes to CPU cores
4. Enable NUMA awareness
5. Deploy monitoring stack

## Troubleshooting

### Engine won't start
- Check ZeroMQ port 5555 is not in use
- Verify Alpaca credentials if using paper trading

### Backend connection errors
- Ensure engine is running first
- Check network connectivity between containers

### Frontend can't connect
- Verify API_URL environment variable
- Check CORS configuration

## Integrations

### Linear Integration
The system integrates with [Linear](https://linear.app/) for project management and issue tracking:

- **Automatic Issue Creation**: Bugs, features, and performance issues are automatically created in Linear
- **Component-based Organization**: Issues are organized by component (Engine, Backend, Frontend, Risk)
- **Priority Management**: High-priority issues are automatically flagged
- **MCP Support**: Compatible with Linear's Model Context Protocol for AI assistants

**Setup:**
1. Create a Linear workspace
2. Generate API keys in Linear settings
3. Configure environment variables:
   ```bash
   LINEAR_API_KEY=your_linear_api_key
   LINEAR_TEAM_ID=your_team_id
   LINEAR_PROJECT_ID=your_project_id
   ```

### Slack Integration
Real-time notifications and alerts via Slack:

- **Trading Alerts**: Order executions and position changes
- **Risk Management**: Risk threshold breaches and circuit breaker activations
- **System Status**: Health monitoring and performance alerts
- **Daily Summaries**: End-of-day trading reports

**Setup:**
1. Create a Slack app and webhook
2. Configure environment variables:
   ```bash
   SLACK_WEBHOOK_URL=your_slack_webhook_url
   SLACK_CHANNEL=#trading-alerts
   ```

### GitHub Integration
The repository is designed for seamless GitHub integration:

- **CI/CD Pipeline**: Automated testing and deployment
- **Issue Tracking**: Integration with Linear for issue management
- **Code Quality**: Automated linting and testing
- **Documentation**: Comprehensive README and API documentation

## Environment Configuration

Copy `env.template` to `.env` and configure your environment:

```bash
cp env.template .env
# Edit .env with your actual values
```

Required environment variables:
- `ALPACA_API_KEY` - Alpaca trading API key
- `ALPACA_API_SECRET` - Alpaca trading API secret
- `POLYGON_API_KEY` - Polygon market data API key
- `DATABASE_URL` - PostgreSQL connection string
- `LINEAR_API_KEY` - Linear API key (optional)
- `SLACK_WEBHOOK_URL` - Slack webhook URL (optional)

## License

Proprietary - All rights reserved

## Support

For questions or issues, contact the development team or create an issue in Linear.

