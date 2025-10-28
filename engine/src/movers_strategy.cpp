#include "movers_strategy.hpp"
#include <iostream>
#include <iomanip>
#include <sstream>
#include <algorithm>
#include <cmath>

namespace hft {

MoversStrategy::MoversStrategy(const std::string& alpaca_key, const std::string& alpaca_secret,
                             const std::string& polygon_key, const MoversConfig& config)
    : alpaca_client_(alpaca_key, alpaca_secret, true)
    , polygon_client_(polygon_key)
    , api_benchmark_(alpaca_key, alpaca_secret, polygon_key)
    , config_(config)
    , running_(false)
    , enabled_(config.enabled)
    , selected_api_("")
    , api_failures_(0)
{
    std::cout << "🚀 Initializing MoversStrategy..." << std::endl;
    std::cout << "   Buy threshold: " << config_.buy_threshold << "%" << std::endl;
    std::cout << "   Sell threshold: " << config_.sell_threshold << "%" << std::endl;
    std::cout << "   Investment amount: $" << config_.investment_amount << std::endl;
    std::cout << "   Check interval: " << config_.check_interval << "s" << std::endl;
}

MoversStrategy::~MoversStrategy() {
    stop();
}

void MoversStrategy::start() {
    if (running_) {
        std::cout << "⚠ MoversStrategy already running" << std::endl;
        return;
    }
    
    std::cout << "🔄 Starting MoversStrategy..." << std::endl;
    
    // Run API benchmark to select fastest API
    std::cout << "🔍 Running API benchmark..." << std::endl;
    api_benchmark_.runBenchmark(10);
    selected_api_ = api_benchmark_.getSelectedApi();
    
    if (selected_api_.empty()) {
        std::cout << "❌ Failed to select API, disabling strategy" << std::endl;
        enabled_ = false;
        return;
    }
    
    std::cout << "✅ Selected API: " << selected_api_ << std::endl;
    
    running_ = true;
    enabled_ = config_.enabled;
    
    // Start monitoring threads
    buy_monitor_thread_ = std::thread(&MoversStrategy::buyMonitorLoop, this);
    sell_monitor_thread_ = std::thread(&MoversStrategy::sellMonitorLoop, this);
    
    std::cout << "✅ MoversStrategy started successfully" << std::endl;
}

void MoversStrategy::stop() {
    if (!running_) {
        return;
    }
    
    std::cout << "🛑 Stopping MoversStrategy..." << std::endl;
    
    running_ = false;
    
    // Wait for threads to finish
    if (buy_monitor_thread_.joinable()) {
        buy_monitor_thread_.join();
    }
    if (sell_monitor_thread_.joinable()) {
        sell_monitor_thread_.join();
    }
    
    std::cout << "✅ MoversStrategy stopped" << std::endl;
}

bool MoversStrategy::isRunning() const {
    return running_;
}

void MoversStrategy::updateConfig(const MoversConfig& config) {
    std::lock_guard<std::mutex> lock(positions_mutex_);
    config_ = config;
    enabled_ = config.enabled;
}

MoversConfig MoversStrategy::getConfig() const {
    std::lock_guard<std::mutex> lock(positions_mutex_);
    return config_;
}

nlohmann::json MoversStrategy::getStatus() const {
    std::lock_guard<std::mutex> lock(positions_mutex_);
    
    nlohmann::json status;
    status["running"] = running_.load();
    status["enabled"] = enabled_.load();
    status["selected_api"] = selected_api_;
    status["api_failures"] = api_failures_.load();
    status["active_positions"] = active_positions_.size();
    status["purchased_today"] = purchased_today_.size();
    status["config"] = {
        {"buy_threshold", config_.buy_threshold},
        {"sell_threshold", config_.sell_threshold},
        {"investment_amount", config_.investment_amount},
        {"check_interval", config_.check_interval},
        {"max_positions", config_.max_positions}
    };
    status["market_hours"] = isMarketHours();
    status["before_cutoff"] = isBeforeCutoff();
    status["near_close"] = isNearClose();
    status["current_time"] = getCurrentTimeString();
    
    return status;
}

nlohmann::json MoversStrategy::getPositions() const {
    std::lock_guard<std::mutex> lock(positions_mutex_);
    
    nlohmann::json positions = nlohmann::json::array();
    for (const auto& pos : active_positions_) {
        nlohmann::json pos_json;
        pos_json["symbol"] = pos.symbol;
        pos_json["purchase_price"] = pos.purchase_price;
        pos_json["quantity"] = pos.quantity;
        pos_json["purchase_time"] = std::chrono::duration_cast<std::chrono::seconds>(
            pos.purchase_time.time_since_epoch()).count();
        pos_json["order_id"] = pos.order_id;
        pos_json["is_active"] = pos.is_active;
        positions.push_back(pos_json);
    }
    
    return positions;
}

nlohmann::json MoversStrategy::getPerformance() const {
    std::lock_guard<std::mutex> lock(positions_mutex_);
    
    nlohmann::json performance;
    performance["total_positions"] = active_positions_.size();
    performance["purchased_today"] = purchased_today_.size();
    performance["api_failures"] = api_failures_.load();
    performance["selected_api"] = selected_api_;
    
    return performance;
}

void MoversStrategy::enable() {
    std::lock_guard<std::mutex> lock(positions_mutex_);
    enabled_ = true;
    std::cout << "✅ MoversStrategy enabled" << std::endl;
}

void MoversStrategy::disable() {
    std::lock_guard<std::mutex> lock(positions_mutex_);
    enabled_ = false;
    std::cout << "⏸ MoversStrategy disabled" << std::endl;
}

void MoversStrategy::forceCloseAll() {
    std::lock_guard<std::mutex> lock(positions_mutex_);
    
    std::cout << "🔄 Force closing all positions..." << std::endl;
    for (auto& pos : active_positions_) {
        if (pos.is_active) {
            try {
                // Get current price and close position
                // This would need to be implemented with actual API calls
                std::cout << "📤 Closing position: " << pos.symbol << std::endl;
                pos.is_active = false;
            } catch (const std::exception& e) {
                std::cout << "❌ Error closing position " << pos.symbol << ": " << e.what() << std::endl;
            }
        }
    }
    std::cout << "✅ Force close completed" << std::endl;
}

void MoversStrategy::buyMonitorLoop() {
    std::cout << "🛒 Buy monitor started" << std::endl;
    
    while (running_) {
        try {
            if (enabled_ && isMarketHours() && isBeforeCutoff()) {
                auto movers = getMarketMovers();
                if (!movers.empty()) {
                    auto filtered_movers = filterMovers(movers);
                    
                    for (const auto& mover : filtered_movers) {
                        std::string symbol = mover["symbol"];
                        double gain_pct = mover["change_percent"];
                        
                        if (shouldBuy(symbol, gain_pct)) {
                            // Create position
                            double price = mover["price"];
                            double quantity = config_.investment_amount / price;
                            
                            // Generate order ID
                            std::string order_id = "MOVERS_" + std::to_string(
                                std::chrono::duration_cast<std::chrono::milliseconds>(
                                    std::chrono::system_clock::now().time_since_epoch()).count());
                            
                            if (createPosition(symbol, price, quantity, order_id)) {
                                logTrade("BUY", symbol, price, quantity);
                            }
                        }
                    }
                }
            }
            
            std::this_thread::sleep_for(std::chrono::seconds(config_.check_interval));
        } catch (const std::exception& e) {
            std::cout << "❌ Buy monitor error: " << e.what() << std::endl;
            api_failures_++;
            std::this_thread::sleep_for(std::chrono::seconds(5));
        }
    }
    
    std::cout << "🛒 Buy monitor stopped" << std::endl;
}

void MoversStrategy::sellMonitorLoop() {
    std::cout << "💰 Sell monitor started" << std::endl;
    
    while (running_) {
        try {
            if (enabled_ && isMarketHours()) {
                std::lock_guard<std::mutex> lock(positions_mutex_);
                
                for (auto& pos : active_positions_) {
                    if (pos.is_active && shouldSell(pos)) {
                        // Get current price and close position
                        // This would need actual API implementation
                        double current_price = pos.purchase_price * 1.05; // Mock price
                        std::string sell_order_id = "SELL_" + std::to_string(
                            std::chrono::duration_cast<std::chrono::milliseconds>(
                                std::chrono::system_clock::now().time_since_epoch()).count());
                        
                        if (closePosition(pos, current_price, sell_order_id)) {
                            logTrade("SELL", pos.symbol, current_price, pos.quantity);
                        }
                    }
                }
            }
            
            std::this_thread::sleep_for(std::chrono::seconds(config_.check_interval));
        } catch (const std::exception& e) {
            std::cout << "❌ Sell monitor error: " << e.what() << std::endl;
            api_failures_++;
            std::this_thread::sleep_for(std::chrono::seconds(5));
        }
    }
    
    std::cout << "💰 Sell monitor stopped" << std::endl;
}

nlohmann::json MoversStrategy::getMarketMovers() {
    try {
        if (selected_api_ == "alpaca") {
            return alpaca_client_.getMarketMovers();
        } else if (selected_api_ == "polygon") {
            return polygon_client_.getMarketMovers();
        }
    } catch (const std::exception& e) {
        std::cout << "❌ API error: " << e.what() << std::endl;
        api_failures_++;
    }
    
    return nlohmann::json::array();
}

std::vector<nlohmann::json> MoversStrategy::filterMovers(const nlohmann::json& movers) {
    std::vector<nlohmann::json> filtered;
    
    if (movers.is_array()) {
        for (const auto& mover : movers) {
            if (mover.contains("change_percent") && mover.contains("symbol")) {
                double change_pct = mover["change_percent"];
                std::string symbol = mover["symbol"];
                
                // Filter for gainers with 5%+ increase
                if (change_pct >= config_.buy_threshold) {
                    // Check if we haven't already purchased this symbol today
                    if (purchased_today_.find(symbol) == purchased_today_.end()) {
                        filtered.push_back(mover);
                    }
                }
            }
        }
    }
    
    return filtered;
}

bool MoversStrategy::shouldBuy(const std::string& symbol, double gain_pct) {
    std::lock_guard<std::mutex> lock(positions_mutex_);
    
    // Check if we already have this position
    for (const auto& pos : active_positions_) {
        if (pos.symbol == symbol && pos.is_active) {
            return false;
        }
    }
    
    // Check if we've reached max positions
    if (active_positions_.size() >= config_.max_positions) {
        return false;
    }
    
    // Check if we already purchased this symbol today
    if (purchased_today_.find(symbol) != purchased_today_.end()) {
        return false;
    }
    
    return gain_pct >= config_.buy_threshold;
}

bool MoversStrategy::shouldSell(const Position& position) {
    // Check if it's near market close (3:50 PM CT)
    if (isNearClose()) {
        return true;
    }
    
    // Check profit percentage
    // This would need actual current price calculation
    double current_price = position.purchase_price * 1.05; // Mock for now
    double profit_pct = calculateProfitPct(position.purchase_price, current_price);
    
    return profit_pct >= config_.sell_threshold;
}

bool MoversStrategy::isMarketHours() const {
    // This would need proper timezone handling
    // For now, return true during business hours
    auto now = std::chrono::system_clock::now();
    auto time_t = std::chrono::system_clock::to_time_t(now);
    auto tm = *std::localtime(&time_t);
    
    int hour = tm.tm_hour;
    int minute = tm.tm_min;
    
    // Market hours: 8:30 AM - 4:00 PM CT
    if (hour < 8 || (hour == 8 && minute < 30)) return false;
    if (hour >= 16) return false;
    
    return true;
}

bool MoversStrategy::isBeforeCutoff() const {
    // Check if it's before 9:00 AM CT
    auto now = std::chrono::system_clock::now();
    auto time_t = std::chrono::system_clock::to_time_t(now);
    auto tm = *std::localtime(&time_t);
    
    int hour = tm.tm_hour;
    int minute = tm.tm_min;
    
    return hour < 9 || (hour == 9 && minute == 0);
}

bool MoversStrategy::isNearClose() const {
    // Check if it's after 3:50 PM CT
    auto now = std::chrono::system_clock::now();
    auto time_t = std::chrono::system_clock::to_time_t(now);
    auto tm = *std::localtime(&time_t);
    
    int hour = tm.tm_hour;
    int minute = tm.tm_min;
    
    return hour > 15 || (hour == 15 && minute >= 50);
}

bool MoversStrategy::createPosition(const std::string& symbol, double price, double quantity, const std::string& order_id) {
    std::lock_guard<std::mutex> lock(positions_mutex_);
    
    Position pos;
    pos.symbol = symbol;
    pos.purchase_price = price;
    pos.quantity = quantity;
    pos.purchase_time = std::chrono::system_clock::now();
    pos.order_id = order_id;
    pos.is_active = true;
    
    active_positions_.push_back(pos);
    purchased_today_.insert(symbol);
    
    return true;
}

bool MoversStrategy::closePosition(Position& position, double sell_price, const std::string& order_id) {
    position.is_active = false;
    // Additional logic for closing position would go here
    return true;
}

double MoversStrategy::calculateProfitPct(double purchase_price, double current_price) {
    return ((current_price - purchase_price) / purchase_price) * 100.0;
}

std::string MoversStrategy::getCurrentTimeString() const {
    auto now = std::chrono::system_clock::now();
    auto time_t = std::chrono::system_clock::to_time_t(now);
    auto tm = *std::localtime(&time_t);
    
    std::ostringstream oss;
    oss << std::put_time(&tm, "%Y-%m-%d %H:%M:%S");
    return oss.str();
}

void MoversStrategy::logTrade(const std::string& action, const std::string& symbol, double price, double quantity) {
    std::cout << "📊 " << action << " " << symbol << " @ $" << std::fixed << std::setprecision(2) 
              << price << " x " << quantity << " shares" << std::endl;
}

} // namespace hft
