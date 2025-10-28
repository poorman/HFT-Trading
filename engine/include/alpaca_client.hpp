#ifndef ALPACA_CLIENT_HPP
#define ALPACA_CLIENT_HPP

#include <string>
#include <curl/curl.h>
#include <nlohmann/json.hpp>
#include "order_book.hpp"

namespace hft {

class AlpacaClient {
public:
    AlpacaClient(const std::string& api_key, const std::string& api_secret, bool paper = true);
    ~AlpacaClient();

    // Submit order to Alpaca paper trading API
    ExecutionReport submitOrder(const Order& order);
    
    // Get account information
    nlohmann::json getAccount();
    
    // Get positions
    nlohmann::json getPositions();
    
    // Get open orders
    nlohmann::json getOpenOrders();
    
    // Get all orders (including filled)
    nlohmann::json getAllOrders();
    
    // Get market movers (top gainers/losers)
    nlohmann::json getMarketMovers();
    
    // Cancel order
    bool cancelOrder(const std::string& order_id);
    
    // Performance testing methods
    nlohmann::json testAlpacaPerformance(int iterations = 10);
    nlohmann::json testPolygonPerformance(int iterations = 10);

private:
    std::string api_key_;
    std::string api_secret_;
    std::string base_url_;
    CURL* curl_;
    
    // HTTP request helpers
    std::string httpGet(const std::string& endpoint);
    std::string httpPost(const std::string& endpoint, const std::string& data);
    std::string httpDelete(const std::string& endpoint);
    
    // Callback for CURL
    static size_t writeCallback(void* contents, size_t size, size_t nmemb, void* userp);
    
    // Convert Order to Alpaca format
    nlohmann::json orderToAlpacaJson(const Order& order);
    
    // Convert Alpaca response to ExecutionReport
    ExecutionReport alpacaJsonToExecutionReport(const nlohmann::json& alpaca_order);
};

} // namespace hft

#endif // ALPACA_CLIENT_HPP

