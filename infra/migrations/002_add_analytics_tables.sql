-- Migration: 002_add_analytics_tables
-- Description: Add tables for analytics and P&L tracking
-- Date: 2025-10-24

BEGIN;

-- Positions table for current positions
CREATE TABLE IF NOT EXISTS positions (
    symbol VARCHAR(20) PRIMARY KEY,
    quantity DECIMAL(20, 8) NOT NULL DEFAULT 0,
    avg_price DECIMAL(20, 8) NOT NULL DEFAULT 0,
    realized_pnl DECIMAL(20, 8) DEFAULT 0,
    unrealized_pnl DECIMAL(20, 8) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily P&L summary
CREATE TABLE IF NOT EXISTS daily_pnl (
    date DATE PRIMARY KEY,
    total_pnl DECIMAL(20, 8) NOT NULL,
    total_trades INTEGER NOT NULL DEFAULT 0,
    winning_trades INTEGER NOT NULL DEFAULT 0,
    losing_trades INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trade statistics
CREATE TABLE IF NOT EXISTS trade_stats (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    total_trades INTEGER NOT NULL DEFAULT 0,
    total_volume DECIMAL(20, 8) NOT NULL DEFAULT 0,
    avg_trade_size DECIMAL(20, 8) NOT NULL DEFAULT 0,
    win_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
    total_pnl DECIMAL(20, 8) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_stats_symbol ON trade_stats(symbol);

COMMIT;

