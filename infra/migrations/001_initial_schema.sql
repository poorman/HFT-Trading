-- Migration: 001_initial_schema
-- Description: Initial schema for HFT trading system
-- Date: 2025-10-24

BEGIN;

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

CREATE INDEX IF NOT EXISTS idx_orders_symbol ON orders(symbol);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Executions table
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

CREATE INDEX IF NOT EXISTS idx_executions_order_id ON executions(order_id);
CREATE INDEX IF NOT EXISTS idx_executions_symbol ON executions(symbol);
CREATE INDEX IF NOT EXISTS idx_executions_timestamp ON executions(timestamp);

COMMIT;

