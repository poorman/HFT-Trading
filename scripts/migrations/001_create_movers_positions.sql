-- Migration: Create movers_positions table for daily movers strategy
-- Created: $(date)
-- Purpose: Track positions for momentum trading strategy

CREATE TABLE IF NOT EXISTS movers_positions (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    purchase_price DECIMAL(10,4) NOT NULL,
    purchase_quantity DECIMAL(10,4) NOT NULL,
    purchase_time TIMESTAMP NOT NULL,
    purchase_order_id VARCHAR(50),
    sell_price DECIMAL(10,4),
    sell_quantity DECIMAL(10,4),
    sell_time TIMESTAMP,
    sell_order_id VARCHAR(50),
    profit_loss DECIMAL(10,4),
    profit_pct DECIMAL(6,3),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'error')),
    strategy_type VARCHAR(50) DEFAULT 'daily_movers',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_movers_positions_status ON movers_positions(status);
CREATE INDEX IF NOT EXISTS idx_movers_positions_symbol ON movers_positions(symbol);
CREATE INDEX IF NOT EXISTS idx_movers_positions_purchase_time ON movers_positions(purchase_time);
CREATE INDEX IF NOT EXISTS idx_movers_positions_strategy_type ON movers_positions(strategy_type);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_movers_positions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_movers_positions_updated_at
    BEFORE UPDATE ON movers_positions
    FOR EACH ROW
    EXECUTE FUNCTION update_movers_positions_updated_at();

-- Add comments
COMMENT ON TABLE movers_positions IS 'Tracks positions for daily movers momentum trading strategy';
COMMENT ON COLUMN movers_positions.symbol IS 'Stock symbol (e.g., AAPL)';
COMMENT ON COLUMN movers_positions.purchase_price IS 'Price per share when purchased';
COMMENT ON COLUMN movers_positions.purchase_quantity IS 'Number of shares purchased';
COMMENT ON COLUMN movers_positions.profit_pct IS 'Profit percentage from purchase price';
COMMENT ON COLUMN movers_positions.status IS 'Position status: open, closed, error';
