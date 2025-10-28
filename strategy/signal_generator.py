"""
Real-time signal generation and publishing to Kafka
"""

import json
import time
import pandas as pd
import numpy as np
from kafka import KafkaProducer
from redis import Redis
import os
from dotenv import load_dotenv

load_dotenv()

class SignalGenerator:
    """Generate trading signals and publish to Kafka"""
    
    def __init__(self):
        kafka_brokers = os.getenv('KAFKA_BROKERS', 'localhost:9092')
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6380')
        
        # Initialize Kafka producer
        try:
            self.producer = KafkaProducer(
                bootstrap_servers=kafka_brokers.split(','),
                value_serializer=lambda v: json.dumps(v).encode('utf-8')
            )
            print(f"✓ Connected to Kafka at {kafka_brokers}")
        except Exception as e:
            print(f"⚠ Kafka connection failed: {e}")
            self.producer = None
        
        # Initialize Redis client
        try:
            self.redis_client = Redis.from_url(redis_url, decode_responses=True)
            self.redis_client.ping()
            print(f"✓ Connected to Redis at {redis_url}")
        except Exception as e:
            print(f"⚠ Redis connection failed: {e}")
            self.redis_client = None
        
        # Signal parameters
        self.symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA']
        self.window_size = 20
        self.price_history = {symbol: [] for symbol in self.symbols}
    
    def fetch_market_data(self, symbol):
        """Fetch latest market data from Redis"""
        if not self.redis_client:
            # Return mock data for testing
            return {
                'symbol': symbol,
                'bid': 150.0 + np.random.randn(),
                'ask': 150.1 + np.random.randn(),
                'last': 150.05 + np.random.randn(),
                'volume': np.random.randint(1000, 10000)
            }
        
        key = f"marketdata:{symbol}"
        data = self.redis_client.get(key)
        
        if data:
            return json.loads(data)
        else:
            # Return mock data if not in cache
            return {
                'symbol': symbol,
                'bid': 150.0,
                'ask': 150.1,
                'last': 150.05,
                'volume': 5000
            }
    
    def calculate_signals(self, symbol):
        """Calculate trading signals based on price action"""
        market_data = self.fetch_market_data(symbol)
        current_price = market_data['last']
        
        # Add to price history
        self.price_history[symbol].append(current_price)
        if len(self.price_history[symbol]) > self.window_size:
            self.price_history[symbol].pop(0)
        
        # Need enough data for signal
        if len(self.price_history[symbol]) < self.window_size:
            return None
        
        prices = np.array(self.price_history[symbol])
        
        # Simple moving average crossover
        fast_ma = np.mean(prices[-10:])
        slow_ma = np.mean(prices[-20:])
        
        # Generate signal
        if fast_ma > slow_ma * 1.001:  # Fast MA > Slow MA by 0.1%
            return {
                'symbol': symbol,
                'signal': 'BUY',
                'confidence': 0.7,
                'price': current_price,
                'quantity': 100,
                'reason': f'Fast MA ({fast_ma:.2f}) crossed above Slow MA ({slow_ma:.2f})'
            }
        elif fast_ma < slow_ma * 0.999:  # Fast MA < Slow MA by 0.1%
            return {
                'symbol': symbol,
                'signal': 'SELL',
                'confidence': 0.7,
                'price': current_price,
                'quantity': 100,
                'reason': f'Fast MA ({fast_ma:.2f}) crossed below Slow MA ({slow_ma:.2f})'
            }
        
        return None
    
    def publish_signal(self, signal):
        """Publish signal to Kafka"""
        if not self.producer:
            print(f"⚠ Cannot publish signal (Kafka not connected): {signal}")
            return
        
        try:
            self.producer.send('strategy-signals', value=signal)
            self.producer.flush()
            print(f"✓ Signal published: {signal['signal']} {signal['symbol']} @ ${signal['price']:.2f}")
        except Exception as e:
            print(f"✗ Failed to publish signal: {e}")
    
    def run(self, interval=5):
        """Run signal generation loop"""
        print(f"\n✓ Signal generator started (interval: {interval}s)")
        print(f"✓ Monitoring symbols: {', '.join(self.symbols)}\n")
        
        try:
            while True:
                for symbol in self.symbols:
                    signal = self.calculate_signals(symbol)
                    
                    if signal:
                        print(f"\n🔔 SIGNAL DETECTED:")
                        print(f"   {signal['signal']} {signal['symbol']}")
                        print(f"   Price: ${signal['price']:.2f}")
                        print(f"   Quantity: {signal['quantity']}")
                        print(f"   Reason: {signal['reason']}")
                        print(f"   Confidence: {signal['confidence']*100:.0f}%\n")
                        
                        self.publish_signal(signal)
                
                time.sleep(interval)
        
        except KeyboardInterrupt:
            print("\n\n✓ Signal generator stopped")
            if self.producer:
                self.producer.close()


if __name__ == '__main__':
    generator = SignalGenerator()
    generator.run(interval=5)

