-- Risk Management System Database Schema
-- Migration: 003_risk_management.sql
-- Description: Add tables for risk limits, position tracking, alerts, and circuit breakers

-- Global Risk Limits Configuration
CREATE TABLE IF NOT EXISTS risk_limits (
    id SERIAL PRIMARY KEY,
    max_position_size DECIMAL(20,8) NOT NULL DEFAULT 10000.00,
    max_order_size DECIMAL(20,8) NOT NULL DEFAULT 1000.00,
    daily_loss_limit DECIMAL(20,8) NOT NULL DEFAULT 5000.00,
    max_portfolio_concentration DECIMAL(5,2) NOT NULL DEFAULT 25.00,
    max_leverage DECIMAL(5,2) NOT NULL DEFAULT 2.00,
    max_orders_per_second INTEGER NOT NULL DEFAULT 10,
    enabled BOOLEAN DEFAULT true,
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Per-Symbol Position Limits
CREATE TABLE IF NOT EXISTS position_limits (
    symbol VARCHAR(20) PRIMARY KEY,
    max_position DECIMAL(20,8) NOT NULL,
    max_concentration_pct DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Risk Alert Log
CREATE TABLE IF NOT EXISTS risk_alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    symbol VARCHAR(20),
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index on alert_type and severity for fast querying
CREATE INDEX IF NOT EXISTS idx_risk_alerts_type ON risk_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_severity ON risk_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_created_at ON risk_alerts(created_at DESC);

-- Daily P&L Tracking
CREATE TABLE IF NOT EXISTS daily_pnl_tracking (
    date DATE PRIMARY KEY,
    realized_pnl DECIMAL(20,8) DEFAULT 0,
    unrealized_pnl DECIMAL(20,8) DEFAULT 0,
    total_pnl DECIMAL(20,8) DEFAULT 0,
    circuit_breaker_triggered BOOLEAN DEFAULT false,
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Circuit Breaker Events
CREATE TABLE IF NOT EXISTS circuit_breaker_events (
    id SERIAL PRIMARY KEY,
    trigger_type VARCHAR(50) NOT NULL,
    trigger_value DECIMAL(20,8),
    threshold DECIMAL(20,8),
    duration_seconds INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    reset_at TIMESTAMP,
    active BOOLEAN DEFAULT true
);

-- Create index for active circuit breakers
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_active ON circuit_breaker_events(active, created_at DESC);

-- Insert default risk limits
INSERT INTO risk_limits (
    max_position_size,
    max_order_size,
    daily_loss_limit,
    max_portfolio_concentration,
    max_leverage,
    max_orders_per_second,
    enabled
) VALUES (
    10000.00,    -- Max position size: $10,000
    1000.00,     -- Max order size: $1,000
    5000.00,     -- Daily loss limit: $5,000
    25.00,       -- Max concentration: 25% per symbol
    2.00,        -- Max leverage: 2x
    10,          -- Max 10 orders per second
    true
) ON CONFLICT (id) DO NOTHING;

-- Insert today's P&L tracking record
INSERT INTO daily_pnl_tracking (date, realized_pnl, unrealized_pnl, total_pnl)
VALUES (CURRENT_DATE, 0, 0, 0)
ON CONFLICT (date) DO NOTHING;

-- Insert some default position limits for common symbols
INSERT INTO position_limits (symbol, max_position, max_concentration_pct) VALUES
    ('AAPL', 5000.00, 15.00),
    ('TSLA', 3000.00, 10.00),
    ('SPY', 10000.00, 20.00),
    ('QQQ', 8000.00, 18.00),
    ('NVDA', 4000.00, 12.00)
ON CONFLICT (symbol) DO UPDATE SET
    max_position = EXCLUDED.max_position,
    max_concentration_pct = EXCLUDED.max_concentration_pct,
    updated_at = NOW();

-- Add comments for documentation
COMMENT ON TABLE risk_limits IS 'Global risk management parameters and limits';
COMMENT ON TABLE position_limits IS 'Per-symbol position size limits and concentration rules';
COMMENT ON TABLE risk_alerts IS 'Log of all risk management alerts and violations';
COMMENT ON TABLE daily_pnl_tracking IS 'Daily profit and loss tracking with circuit breaker status';
COMMENT ON TABLE circuit_breaker_events IS 'Circuit breaker activation and reset events';

