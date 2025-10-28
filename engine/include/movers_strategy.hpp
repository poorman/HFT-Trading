#ifndef MOVERS_STRATEGY_HPP
#define MOVERS_STRATEGY_HPP

#include <string>
#include <thread>
#include <atomic>
#include <mutex>
#include <chrono>
#include <set>
#include <vector>
#include <nlohmann/json.hpp>
#include "alpaca_client.hpp"
#include "polygon_client.hpp"
#include "api_benchmark.hpp"

namespace hft {

struct MoversConfig {
    bool enabled = true;
    double buy_threshold = 5.0;      // 5% gain required
    double sell_threshold = 4.5;     // 4.5% profit target
    double investment_amount = 1000.0; // $1000 per trade
    int check_interval = 10;          // 10 seconds
    std::string timezone = "America/Chicago";
    int max_positions = 10;            // Maximum concurrent positions
};

struct Position {
    std::string symbol;
    double purchase_price;
    double quantity;
    std::chrono::system_clock::time_point purchase_time;
    std::string order_id;
    bool is_active;
};

class MoversStrategy {
public:
    MoversStrategy(const std::string& alpaca_key, const std::string& alpaca_secret,
                   const std::string& polygon_key, const MoversConfig& config);
    ~MoversStrategy();
    
    // Start/stop strategy
    void start();
    void stop();
    bool isRunning() const;
    
    // Configuration
    void updateConfig(const MoversConfig& config);
    MoversConfig getConfig() const;
    
    // Status and monitoring
    nlohmann::json getStatus() const;
    nlohmann::json getPositions() const;
    nlohmann::json getPerformance() const;
    
    // Manual control
    void enable();
    void disable();
    void forceCloseAll();

private:
    // Core components
    AlpacaClient alpaca_client_;
    PolygonClient polygon_client_;
    ApiBenchmark api_benchmark_;
    MoversConfig config_;
    
    // Threading
    std::thread buy_monitor_thread_;
    std::thread sell_monitor_thread_;
    std::atomic<bool> running_;
    std::atomic<bool> enabled_;
    mutable std::mutex positions_mutex_;
    
    // Position tracking
    std::vector<Position> active_positions_;
    std::set<std::string> purchased_today_;
    
    // API selection
    std::string selected_api_;
    std::atomic<int> api_failures_;
    
    // Thread functions
    void buyMonitorLoop();
    void sellMonitorLoop();
    
    // Market data and trading
    nlohmann::json getMarketMovers();
    std::vector<nlohmann::json> filterMovers(const nlohmann::json& movers);
    bool shouldBuy(const std::string& symbol, double gain_pct);
    bool shouldSell(const Position& position);
    bool isMarketHours() const;
    bool isBeforeCutoff() const; // Before 9 AM CT
    bool isNearClose() const;    // After 3:50 PM CT
    
    // Position management
    bool createPosition(const std::string& symbol, double price, double quantity, const std::string& order_id);
    bool closePosition(Position& position, double sell_price, const std::string& order_id);
    void updatePositionStats();
    
    // Utility functions
    double calculateProfitPct(double purchase_price, double current_price);
    std::string getCurrentTimeString() const;
    void logTrade(const std::string& action, const std::string& symbol, double price, double quantity);
};

} // namespace hft

#endif // MOVERS_STRATEGY_HPP
