"""
Backtesting framework for HFT strategies
"""

import pandas as pd
import numpy as np
import backtrader as bt
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv

load_dotenv()

class SimpleMAStrategy(bt.Strategy):
    """Simple Moving Average Crossover Strategy"""
    
    params = (
        ('fast_period', 10),
        ('slow_period', 30),
    )

    def __init__(self):
        self.fast_ma = bt.indicators.SMA(self.data.close, period=self.params.fast_period)
        self.slow_ma = bt.indicators.SMA(self.data.close, period=self.params.slow_period)
        self.crossover = bt.indicators.CrossOver(self.fast_ma, self.slow_ma)

    def next(self):
        if not self.position:
            if self.crossover > 0:  # Fast MA crosses above Slow MA
                self.buy()
        else:
            if self.crossover < 0:  # Fast MA crosses below Slow MA
                self.sell()


class DataLoader:
    """Load historical data from TimescaleDB"""
    
    def __init__(self, db_url=None):
        self.db_url = db_url or os.getenv('DATABASE_URL')
        self.engine = create_engine(self.db_url) if self.db_url else None
    
    def load_market_data(self, symbol, start_date, end_date):
        """Load market data for a symbol"""
        if not self.engine:
            # Return sample data for testing
            dates = pd.date_range(start=start_date, end=end_date, freq='1min')
            return pd.DataFrame({
                'timestamp': dates,
                'symbol': symbol,
                'open': 150.0 + np.random.randn(len(dates)),
                'high': 151.0 + np.random.randn(len(dates)),
                'low': 149.0 + np.random.randn(len(dates)),
                'close': 150.0 + np.random.randn(len(dates)),
                'volume': np.random.randint(1000, 10000, len(dates))
            })
        
        query = f"""
        SELECT timestamp, symbol, open, high, low, close, volume
        FROM market_data_ticks
        WHERE symbol = '{symbol}'
          AND timestamp BETWEEN '{start_date}' AND '{end_date}'
        ORDER BY timestamp ASC
        """
        
        return pd.read_sql(query, self.engine)


def run_backtest(symbol='AAPL', start_date='2024-01-01', end_date='2024-12-31'):
    """Run backtest for a given symbol and date range"""
    
    # Load data
    loader = DataLoader()
    data = loader.load_market_data(symbol, start_date, end_date)
    
    if data.empty:
        print(f"No data found for {symbol}")
        return None
    
    # Convert to backtrader format
    bt_data = bt.feeds.PandasData(
        dataname=data,
        datetime='timestamp',
        open='open',
        high='high',
        low='low',
        close='close',
        volume='volume',
        openinterest=-1
    )
    
    # Initialize Cerebro
    cerebro = bt.Cerebro()
    cerebro.addstrategy(SimpleMAStrategy)
    cerebro.adddata(bt_data)
    cerebro.broker.setcash(100000.0)  # Starting capital
    cerebro.broker.setcommission(commission=0.001)  # 0.1% commission
    
    # Run backtest
    print(f"Starting Portfolio Value: ${cerebro.broker.getvalue():.2f}")
    results = cerebro.run()
    print(f"Final Portfolio Value: ${cerebro.broker.getvalue():.2f}")
    
    # Calculate metrics
    pnl = cerebro.broker.getvalue() - 100000.0
    returns = (pnl / 100000.0) * 100
    
    print(f"\nBacktest Results:")
    print(f"Total P&L: ${pnl:.2f}")
    print(f"Returns: {returns:.2f}%")
    
    return results


if __name__ == '__main__':
    run_backtest()

