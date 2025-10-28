#include "order_book.hpp"
#include <sstream>
#include <iomanip>
#include <algorithm>

namespace hft {

OrderBook::OrderBook(const std::string& symbol) : symbol_(symbol) {}

std::string OrderBook::generateOrderId() {
    auto now = std::chrono::high_resolution_clock::now();
    auto nanos = std::chrono::duration_cast<std::chrono::nanoseconds>(now.time_since_epoch()).count();
    uint64_t counter = order_id_counter_.fetch_add(1);
    
    std::stringstream ss;
    ss << "ORD" << std::setfill('0') << std::setw(16) << nanos << "_" << counter;
    return ss.str();
}

ExecutionReport OrderBook::addOrder(const Order& order) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    auto new_order = std::make_shared<Order>(order);
    new_order->order_id = generateOrderId();
    new_order->timestamp = std::chrono::high_resolution_clock::now();
    
    orders_[new_order->order_id] = new_order;
    
    if (new_order->side == Side::BUY) {
        bids_[new_order->price].push_back(new_order);
    } else {
        asks_[new_order->price].push_back(new_order);
    }
    
    ExecutionReport report;
    report.order_id = new_order->order_id;
    report.client_order_id = new_order->client_order_id;
    report.symbol = new_order->symbol;
    report.side = new_order->side;
    report.status = OrderStatus::NEW;
    report.fill_price = 0.0;
    report.fill_qty = 0.0;
    report.remaining_qty = new_order->quantity;
    report.timestamp = new_order->timestamp;
    report.message = "Order accepted";
    
    return report;
}

std::vector<ExecutionReport> OrderBook::matchOrders() {
    std::lock_guard<std::mutex> lock(mutex_);
    std::vector<ExecutionReport> reports;
    
    while (!bids_.empty() && !asks_.empty()) {
        double best_bid = bids_.begin()->first;
        double best_ask = asks_.begin()->first;
        
        if (best_bid < best_ask) break;
        
        auto& bid_orders = bids_.begin()->second;
        auto& ask_orders = asks_.begin()->second;
        
        if (bid_orders.empty() || ask_orders.empty()) {
            if (bid_orders.empty()) bids_.erase(bids_.begin());
            if (ask_orders.empty()) asks_.erase(asks_.begin());
            continue;
        }
        
        auto buy_order = bid_orders.front();
        auto sell_order = ask_orders.front();
        
        double fill_price = best_ask;
        double fill_qty = std::min(
            buy_order->quantity - buy_order->filled_qty,
            sell_order->quantity - sell_order->filled_qty
        );
        
        ExecutionReport report = executeTrade(buy_order, sell_order, fill_price, fill_qty);
        reports.push_back(report);
        
        if (buy_order->filled_qty >= buy_order->quantity) {
            bid_orders.erase(bid_orders.begin());
        }
        if (sell_order->filled_qty >= sell_order->quantity) {
            ask_orders.erase(ask_orders.begin());
        }
        
        if (bid_orders.empty()) bids_.erase(bids_.begin());
        if (ask_orders.empty()) asks_.erase(asks_.begin());
    }
    
    return reports;
}

ExecutionReport OrderBook::executeTrade(
    std::shared_ptr<Order> buy_order,
    std::shared_ptr<Order> sell_order,
    double price,
    double quantity
) {
    buy_order->filled_qty += quantity;
    sell_order->filled_qty += quantity;
    
    if (buy_order->filled_qty >= buy_order->quantity) {
        buy_order->status = OrderStatus::FILLED;
    } else {
        buy_order->status = OrderStatus::PARTIALLY_FILLED;
    }
    
    if (sell_order->filled_qty >= sell_order->quantity) {
        sell_order->status = OrderStatus::FILLED;
    } else {
        sell_order->status = OrderStatus::PARTIALLY_FILLED;
    }
    
    ExecutionReport report;
    report.order_id = buy_order->order_id;
    report.client_order_id = buy_order->client_order_id;
    report.symbol = buy_order->symbol;
    report.side = buy_order->side;
    report.status = buy_order->status;
    report.fill_price = price;
    report.fill_qty = quantity;
    report.remaining_qty = buy_order->quantity - buy_order->filled_qty;
    report.timestamp = std::chrono::high_resolution_clock::now();
    report.message = "Trade executed";
    
    return report;
}

double OrderBook::getBestBid() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return bids_.empty() ? 0.0 : bids_.begin()->first;
}

double OrderBook::getBestAsk() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return asks_.empty() ? 0.0 : asks_.begin()->first;
}

size_t OrderBook::getBidDepth() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return bids_.size();
}

size_t OrderBook::getAskDepth() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return asks_.size();
}

bool OrderBook::cancelOrder(const std::string& order_id) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    auto it = orders_.find(order_id);
    if (it == orders_.end()) return false;
    
    auto order = it->second;
    order->status = OrderStatus::CANCELED;
    orders_.erase(it);
    
    return true;
}

} // namespace hft
