-- Seed Risk Configuration Data
-- Migration: 004_seed_risk_config.sql
-- Description: Insert sensible default risk limits and position limits

-- Ensure we have at least one risk limits record
INSERT INTO risk_limits (
    max_position_size,
    max_order_size,
    daily_loss_limit,
    max_portfolio_concentration,
    max_leverage,
    max_orders_per_second,
    enabled
) VALUES (
    10000.00,    -- Max position size: $10,000 (conservative for paper trading)
    1000.00,     -- Max order size: $1,000 per order
    5000.00,     -- Daily loss limit: $5,000 (kill switch at -$5k)
    25.00,       -- Max concentration: 25% of portfolio per symbol
    2.00,        -- Max leverage: 2x (100% cash + 100% margin)
    10,          -- Max 10 orders per second
    true         -- Enabled by default
) ON CONFLICT (id) DO NOTHING;

-- Insert position limits for popular stocks
INSERT INTO position_limits (symbol, max_position, max_concentration_pct) VALUES
    -- Mega-cap tech (higher limits)
    ('AAPL', 5000.00, 15.00),
    ('MSFT', 5000.00, 15.00),
    ('GOOGL', 4000.00, 12.00),
    ('AMZN', 4000.00, 12.00),
    ('NVDA', 4000.00, 12.00),
    ('META', 3500.00, 11.00),
    ('TSLA', 3000.00, 10.00),
    
    -- Index ETFs (highest limits)
    ('SPY', 10000.00, 20.00),
    ('QQQ', 8000.00, 18.00),
    ('IWM', 6000.00, 15.00),
    ('DIA', 6000.00, 15.00),
    ('VTI', 8000.00, 18.00),
    
    -- Sector ETFs
    ('XLF', 5000.00, 12.00),
    ('XLE', 5000.00, 12.00),
    ('XLK', 5000.00, 12.00),
    
    -- Popular growth stocks (medium limits)
    ('AMD', 3000.00, 10.00),
    ('NFLX', 3000.00, 10.00),
    ('BABA', 2500.00, 8.00),
    ('DIS', 3500.00, 11.00),
    ('BA', 3000.00, 10.00),
    
    -- High volatility stocks (lower limits)
    ('GME', 1500.00, 5.00),
    ('AMC', 1500.00, 5.00),
    ('COIN', 2000.00, 7.00),
    ('RIOT', 1500.00, 5.00),
    ('PLTR', 2500.00, 8.00)
ON CONFLICT (symbol) DO UPDATE SET
    max_position = EXCLUDED.max_position,
    max_concentration_pct = EXCLUDED.max_concentration_pct,
    updated_at = NOW();

-- Insert today's P&L tracking record if not exists
INSERT INTO daily_pnl_tracking (date, realized_pnl, unrealized_pnl, total_pnl, circuit_breaker_triggered)
VALUES (CURRENT_DATE, 0, 0, 0, false)
ON CONFLICT (date) DO NOTHING;

-- Insert a test alert to verify the system
INSERT INTO risk_alerts (alert_type, severity, symbol, message, metadata)
VALUES (
    'SYSTEM_INITIALIZED',
    'INFO',
    NULL,
    'Risk management system initialized successfully',
    '{"version": "1.0"}'::jsonb
);

