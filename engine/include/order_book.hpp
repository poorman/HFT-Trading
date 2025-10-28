#ifndef ORDER_BOOK_HPP
#define ORDER_BOOK_HPP

#include <map>
#include <memory>
#include <string>
#include <chrono>
#include <atomic>
#include <unordered_map>
#include <vector>
#include <mutex>

namespace hft {

enum class Side {
    BUY,
    SELL
};

enum class OrderType {
    LIMIT,
    MARKET,
    STOP
};

enum class OrderStatus {
    NEW,
    PARTIALLY_FILLED,
    FILLED,
    REJECTED,
    CANCELED
};

struct Order {
    std::string client_order_id;
    std::string order_id;
    std::string symbol;
    Side side;
    double quantity;
    double price;
    OrderType order_type;
    double filled_qty = 0.0;
    OrderStatus status = OrderStatus::NEW;
    std::chrono::time_point<std::chrono::high_resolution_clock> timestamp;
};

struct ExecutionReport {
    std::string order_id;
    std::string client_order_id;
    std::string symbol;
    Side side;
    OrderStatus status;
    double fill_price;
    double fill_qty;
    double remaining_qty;
    std::chrono::time_point<std::chrono::high_resolution_clock> timestamp;
    std::string message;
};

class OrderBook {
public:
    OrderBook(const std::string& symbol);
    ~OrderBook() = default;

    // Add order to book
    ExecutionReport addOrder(const Order& order);
    
    // Match orders (for internal market simulation)
    std::vector<ExecutionReport> matchOrders();
    
    // Get best bid/ask
    double getBestBid() const;
    double getBestAsk() const;
    
    // Get order book depth
    size_t getBidDepth() const;
    size_t getAskDepth() const;
    
    // Cancel order
    bool cancelOrder(const std::string& order_id);

private:
    std::string symbol_;
    
    // Buy orders (price -> orders), sorted descending
    std::map<double, std::vector<std::shared_ptr<Order>>, std::greater<double>> bids_;
    
    // Sell orders (price -> orders), sorted ascending
    std::map<double, std::vector<std::shared_ptr<Order>>, std::less<double>> asks_;
    
    // Order lookup by ID
    std::unordered_map<std::string, std::shared_ptr<Order>> orders_;
    
    // Mutex for thread safety
    mutable std::mutex mutex_;
    
    // Order ID counter
    std::atomic<uint64_t> order_id_counter_{0};
    
    // Generate order ID
    std::string generateOrderId();
    
    // Execute trade
    ExecutionReport executeTrade(
        std::shared_ptr<Order> buy_order,
        std::shared_ptr<Order> sell_order,
        double price,
        double quantity
    );
};

} // namespace hft

#endif // ORDER_BOOK_HPP

