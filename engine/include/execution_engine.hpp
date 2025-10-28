#ifndef EXECUTION_ENGINE_HPP
#define EXECUTION_ENGINE_HPP

#include <string>
#include <unordered_map>
#include <memory>
#include <atomic>
#include <thread>
#include <zmq.hpp>
#include "order_book.hpp"
#include "alpaca_client.hpp"
#include "polygon_client.hpp"
#include "movers_strategy.hpp"
#include "redis_client.hpp"

namespace hft {

class ExecutionEngine {
public:
    ExecutionEngine(const std::string& zmq_address, bool use_paper_trading = true);
    ~ExecutionEngine();

    // Start the engine
    void start();
    
    // Stop the engine
    void stop();
    
    // Process incoming orders
    void processOrders();

private:
    std::string zmq_address_;
    bool use_paper_trading_;
    std::atomic<bool> running_{false};
    
    // ZeroMQ context and socket
    std::unique_ptr<zmq::context_t> zmq_context_;
    std::unique_ptr<zmq::socket_t> zmq_socket_;
    
    // Order books per symbol
    std::unordered_map<std::string, std::unique_ptr<OrderBook>> order_books_;
    
    // Alpaca client for paper trading
    std::unique_ptr<AlpacaClient> alpaca_client_;
    
    // Polygon client for market data
    std::unique_ptr<PolygonClient> polygon_client_;
    
    // Movers strategy
    std::unique_ptr<MoversStrategy> movers_strategy_;
    
    // Redis client for position tracking
    std::unique_ptr<RedisClient> redis_client_;
    
    // Processing thread
    std::unique_ptr<std::thread> processing_thread_;
    
    // Get or create order book for symbol
    OrderBook* getOrderBook(const std::string& symbol);
    
    // Handle order request
    std::string handleOrderRequest(const std::string& request_json);
    
    // Handle position request
    std::string handlePositionRequest(const std::string& request_json);
    
    // Handle account request
    std::string handleAccountRequest(const std::string& request_json);
    
    // Handle open orders request
    std::string handleOpenOrdersRequest(const std::string& request_json);
    
    // Handle all orders request (including filled)
    std::string handleAllOrdersRequest(const std::string& request_json);
    
    // Handle cancel order request
    std::string handleCancelOrderRequest(const std::string& request_json);
    
    // Handle market movers request
    std::string handleMarketMoversRequest(const std::string& request_json);
    
    // Handle performance test requests
    std::string handleAlpacaPerformanceTest(const std::string& request_json);
    std::string handlePolygonPerformanceTest(const std::string& request_json);
    
    // Handle movers strategy requests
    std::string handleMoversStrategyRequest(const std::string& request_json);
};

} // namespace hft

#endif // EXECUTION_ENGINE_HPP

