-- Create database
CREATE DATABASE IF NOT EXISTS hft_trading;

-- Connect to database
\c hft_trading;

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    client_order_id VARCHAR(255) UNIQUE NOT NULL,
    order_id VARCHAR(255) UNIQUE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    quantity DECIMAL(20, 8) NOT NULL,
    price DECIMAL(20, 8) NOT NULL,
    order_type VARCHAR(20) NOT NULL,
    status VARCHAR(50) NOT NULL,
    filled_qty DECIMAL(20, 8) DEFAULT 0,
    remaining_qty DECIMAL(20, 8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_orders_symbol ON orders(symbol);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Executions table (hypertable for time-series)
CREATE TABLE IF NOT EXISTS executions (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL,
    client_order_id VARCHAR(255) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    fill_price DECIMAL(20, 8) NOT NULL,
    fill_qty DECIMAL(20, 8) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Convert to hypertable
SELECT create_hypertable('executions', 'timestamp', if_not_exists => TRUE);

CREATE INDEX idx_executions_order_id ON executions(order_id);
CREATE INDEX idx_executions_symbol ON executions(symbol);

-- Market data ticks table (hypertable)
CREATE TABLE IF NOT EXISTS market_data_ticks (
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    bid DECIMAL(20, 8),
    ask DECIMAL(20, 8),
    last DECIMAL(20, 8),
    volume BIGINT,
    PRIMARY KEY (timestamp, symbol)
);

-- Convert to hypertable
SELECT create_hypertable('market_data_ticks', 'timestamp', if_not_exists => TRUE);

-- Position snapshots (for historical tracking)
CREATE TABLE IF NOT EXISTS position_snapshots (
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    symbol VARCHAR(20) NOT NULL,
    quantity DECIMAL(20, 8) NOT NULL,
    avg_price DECIMAL(20, 8) NOT NULL,
    unrealized_pnl DECIMAL(20, 8) DEFAULT 0,
    realized_pnl DECIMAL(20, 8) DEFAULT 0
);

SELECT create_hypertable('position_snapshots', 'timestamp', if_not_exists => TRUE);

-- Create continuous aggregate for hourly PnL
CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_pnl
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', timestamp) AS hour,
    symbol,
    SUM(fill_qty * fill_price * CASE WHEN side = 'SELL' THEN 1 ELSE -1 END) as realized_pnl
FROM executions
GROUP BY hour, symbol;

-- Refresh policy for continuous aggregate
SELECT add_continuous_aggregate_policy('hourly_pnl',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE);

-- Grants (adjust as needed)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pbieda;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO pbieda;

COMMENT ON TABLE orders IS 'All trading orders submitted to the system';
COMMENT ON TABLE executions IS 'Trade execution records with nanosecond timestamps';
COMMENT ON TABLE market_data_ticks IS 'Real-time market data ticks';
COMMENT ON TABLE position_snapshots IS 'Historical position snapshots';

