#include "alpaca_client.hpp"
#include <iostream>
#include <sstream>
#include <chrono>
#include <algorithm>
#include <numeric>
#include <cmath>

namespace hft {

AlpacaClient::AlpacaClient(const std::string& api_key, const std::string& api_secret, bool paper)
    : api_key_(api_key), api_secret_(api_secret) {
    
    base_url_ = paper ? "https://paper-api.alpaca.markets" : "https://api.alpaca.markets";
    
    curl_global_init(CURL_GLOBAL_DEFAULT);
    curl_ = curl_easy_init();
}

AlpacaClient::~AlpacaClient() {
    if (curl_) {
        curl_easy_cleanup(curl_);
    }
    curl_global_cleanup();
}

size_t AlpacaClient::writeCallback(void* contents, size_t size, size_t nmemb, void* userp) {
    ((std::string*)userp)->append((char*)contents, size * nmemb);
    return size * nmemb;
}

std::string AlpacaClient::httpGet(const std::string& endpoint) {
    if (!curl_) return "{}";
    
    std::string url = base_url_ + endpoint;
    std::string response;
    
    // Reset curl handle to default GET
    curl_easy_reset(curl_);
    
    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, ("APCA-API-KEY-ID: " + api_key_).c_str());
    headers = curl_slist_append(headers, ("APCA-API-SECRET-KEY: " + api_secret_).c_str());
    headers = curl_slist_append(headers, "Content-Type: application/json");
    
    curl_easy_setopt(curl_, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl_, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl_, CURLOPT_HTTPGET, 1L);  // Ensure GET method
    curl_easy_setopt(curl_, CURLOPT_WRITEFUNCTION, writeCallback);
    curl_easy_setopt(curl_, CURLOPT_WRITEDATA, &response);
    curl_easy_setopt(curl_, CURLOPT_TIMEOUT, 5L);
    curl_easy_setopt(curl_, CURLOPT_SSL_VERIFYPEER, 1L);
    curl_easy_setopt(curl_, CURLOPT_SSL_VERIFYHOST, 2L);
    
    CURLcode res = curl_easy_perform(curl_);
    curl_slist_free_all(headers);
    
    if (res != CURLE_OK) {
        std::cerr << "CURL GET error for " << endpoint << ": " << curl_easy_strerror(res) << std::endl;
        return "{}";
    }
    
    return response;
}

std::string AlpacaClient::httpPost(const std::string& endpoint, const std::string& data) {
    if (!curl_) return "{}";
    
    std::string url = base_url_ + endpoint;
    std::string response;
    
    // Reset curl handle
    curl_easy_reset(curl_);
    
    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, ("APCA-API-KEY-ID: " + api_key_).c_str());
    headers = curl_slist_append(headers, ("APCA-API-SECRET-KEY: " + api_secret_).c_str());
    headers = curl_slist_append(headers, "Content-Type: application/json");
    
    curl_easy_setopt(curl_, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl_, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl_, CURLOPT_POST, 1L);
    curl_easy_setopt(curl_, CURLOPT_POSTFIELDS, data.c_str());
    curl_easy_setopt(curl_, CURLOPT_WRITEFUNCTION, writeCallback);
    curl_easy_setopt(curl_, CURLOPT_WRITEDATA, &response);
    curl_easy_setopt(curl_, CURLOPT_TIMEOUT, 5L);
    curl_easy_setopt(curl_, CURLOPT_SSL_VERIFYPEER, 1L);
    curl_easy_setopt(curl_, CURLOPT_SSL_VERIFYHOST, 2L);
    
    CURLcode res = curl_easy_perform(curl_);
    curl_slist_free_all(headers);
    
    if (res != CURLE_OK) {
        std::cerr << "CURL POST error for " << endpoint << ": " << curl_easy_strerror(res) << std::endl;
        return "{}";
    }
    
    return response;
}

std::string AlpacaClient::httpDelete(const std::string& endpoint) {
    if (!curl_) return "{}";
    
    std::string url = base_url_ + endpoint;
    std::string response;
    
    // Reset curl handle
    curl_easy_reset(curl_);
    
    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, ("APCA-API-KEY-ID: " + api_key_).c_str());
    headers = curl_slist_append(headers, ("APCA-API-SECRET-KEY: " + api_secret_).c_str());
    
    curl_easy_setopt(curl_, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl_, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl_, CURLOPT_CUSTOMREQUEST, "DELETE");
    curl_easy_setopt(curl_, CURLOPT_WRITEFUNCTION, writeCallback);
    curl_easy_setopt(curl_, CURLOPT_WRITEDATA, &response);
    curl_easy_setopt(curl_, CURLOPT_TIMEOUT, 5L);
    curl_easy_setopt(curl_, CURLOPT_SSL_VERIFYPEER, 1L);
    curl_easy_setopt(curl_, CURLOPT_SSL_VERIFYHOST, 2L);
    
    CURLcode res = curl_easy_perform(curl_);
    curl_slist_free_all(headers);
    
    if (res != CURLE_OK) {
        std::cerr << "CURL DELETE error: " << curl_easy_strerror(res) << std::endl;
        return "{}";
    }
    
    return response;
}

nlohmann::json AlpacaClient::orderToAlpacaJson(const Order& order) {
    nlohmann::json j;
    j["symbol"] = order.symbol;
    j["qty"] = std::to_string(static_cast<int>(order.quantity));
    j["side"] = (order.side == Side::BUY) ? "buy" : "sell";
    j["type"] = "limit";
    j["time_in_force"] = "day";
    j["limit_price"] = std::to_string(order.price);
    j["client_order_id"] = order.client_order_id;
    
    return j;
}

ExecutionReport AlpacaClient::alpacaJsonToExecutionReport(const nlohmann::json& alpaca_order) {
    ExecutionReport report;
    
    report.order_id = alpaca_order.value("id", "");
    report.client_order_id = alpaca_order.value("client_order_id", "");
    report.symbol = alpaca_order.value("symbol", "");
    
    std::string side_str = alpaca_order.value("side", "buy");
    report.side = (side_str == "buy") ? Side::BUY : Side::SELL;
    
    std::string status_str = alpaca_order.value("status", "new");
    if (status_str == "filled") {
        report.status = OrderStatus::FILLED;
    } else if (status_str == "partially_filled") {
        report.status = OrderStatus::PARTIALLY_FILLED;
    } else if (status_str == "rejected" || status_str == "canceled") {
        report.status = OrderStatus::REJECTED;
    } else {
        report.status = OrderStatus::NEW;
    }
    
    // Handle potentially null numeric fields
    std::string fill_price_str = "0";
    std::string filled_qty_str = "0";
    std::string qty_str = "0";
    
    if (alpaca_order.contains("filled_avg_price") && !alpaca_order["filled_avg_price"].is_null()) {
        if (alpaca_order["filled_avg_price"].is_string()) {
            fill_price_str = alpaca_order["filled_avg_price"];
        } else if (alpaca_order["filled_avg_price"].is_number()) {
            fill_price_str = std::to_string(alpaca_order["filled_avg_price"].get<double>());
        }
    }
    
    if (alpaca_order.contains("filled_qty") && !alpaca_order["filled_qty"].is_null()) {
        if (alpaca_order["filled_qty"].is_string()) {
            filled_qty_str = alpaca_order["filled_qty"];
        } else if (alpaca_order["filled_qty"].is_number()) {
            filled_qty_str = std::to_string(alpaca_order["filled_qty"].get<double>());
        }
    }
    
    if (alpaca_order.contains("qty") && !alpaca_order["qty"].is_null()) {
        if (alpaca_order["qty"].is_string()) {
            qty_str = alpaca_order["qty"];
        } else if (alpaca_order["qty"].is_number()) {
            qty_str = std::to_string(alpaca_order["qty"].get<double>());
        }
    }
    
    report.fill_price = std::stod(fill_price_str);
    report.fill_qty = std::stod(filled_qty_str);
    report.remaining_qty = std::stod(qty_str) - report.fill_qty;
    
    report.timestamp = std::chrono::high_resolution_clock::now();
    report.message = "Order submitted to Alpaca";
    
    return report;
}

ExecutionReport AlpacaClient::submitOrder(const Order& order) {
    nlohmann::json order_json = orderToAlpacaJson(order);
    std::string response = httpPost("/v2/orders", order_json.dump());
    
    try {
        nlohmann::json response_json = nlohmann::json::parse(response);
        
        // Check for error response
        if (response_json.contains("message")) {
            ExecutionReport report;
            report.order_id = "";
            report.client_order_id = order.client_order_id;
            report.symbol = order.symbol;
            report.side = order.side;
            report.status = OrderStatus::REJECTED;
            report.fill_price = 0.0;
            report.fill_qty = 0.0;
            report.remaining_qty = order.quantity;
            report.timestamp = std::chrono::high_resolution_clock::now();
            report.message = response_json.value("message", "Order rejected");
            return report;
        }
        
        return alpacaJsonToExecutionReport(response_json);
    } catch (const std::exception& e) {
        std::cerr << "Error parsing Alpaca response: " << e.what() << std::endl;
        
        ExecutionReport report;
        report.order_id = "";
        report.client_order_id = order.client_order_id;
        report.symbol = order.symbol;
        report.side = order.side;
        report.status = OrderStatus::REJECTED;
        report.fill_price = 0.0;
        report.fill_qty = 0.0;
        report.remaining_qty = order.quantity;
        report.timestamp = std::chrono::high_resolution_clock::now();
        report.message = std::string("API error: ") + e.what();
        
        return report;
    }
}

nlohmann::json AlpacaClient::getAccount() {
    std::string response = httpGet("/v2/account");
    try {
        auto parsed = nlohmann::json::parse(response);
        std::cout << "✓ Account data retrieved successfully" << std::endl;
        return parsed;
    } catch (const std::exception& e) {
        std::cerr << "Error parsing account response: " << e.what() << std::endl;
        std::cerr << "Raw response: " << response.substr(0, 200) << std::endl;
        return nlohmann::json::object();
    }
}

nlohmann::json AlpacaClient::getPositions() {
    std::string response = httpGet("/v2/positions");
    try {
        return nlohmann::json::parse(response);
    } catch (const std::exception& e) {
        return nlohmann::json::array();
    }
}

nlohmann::json AlpacaClient::getOpenOrders() {
    std::string response = httpGet("/v2/orders?status=open");
    try {
        auto orders = nlohmann::json::parse(response);
        std::cout << "✓ Retrieved " << orders.size() << " open orders from Alpaca" << std::endl;
        return orders;
    } catch (const std::exception& e) {
        std::cerr << "Error parsing open orders: " << e.what() << std::endl;
        return nlohmann::json::array();
    }
}

nlohmann::json AlpacaClient::getAllOrders() {
    // Get all orders from today (filled, canceled, etc.)
    std::string response = httpGet("/v2/orders?limit=100");
    try {
        auto orders = nlohmann::json::parse(response);
        std::cout << "✓ Retrieved " << orders.size() << " total orders from Alpaca" << std::endl;
        return orders;
    } catch (const std::exception& e) {
        std::cerr << "Error parsing all orders: " << e.what() << std::endl;
        return nlohmann::json::array();
    }
}

nlohmann::json AlpacaClient::getMarketMovers() {
    // Fetch market movers from Alpaca Data API (different base URL)
    // Temporarily save base URL and switch to data API
    std::string original_base = base_url_;
    base_url_ = "https://data.alpaca.markets";
    
    std::string response = httpGet("/v1beta1/screener/stocks/movers?top=20");
    
    // Restore original base URL
    base_url_ = original_base;
    
    try {
        auto parsed = nlohmann::json::parse(response);
        
        // Alpaca returns: {"gainers": [...], "losers": [...]}
        std::cout << "✓ Market movers retrieved successfully" << std::endl;
        return parsed;
    } catch (const std::exception& e) {
        std::cerr << "Error parsing market movers: " << e.what() << std::endl;
        std::cerr << "Raw response: " << response.substr(0, 200) << std::endl;
        nlohmann::json result;
        result["gainers"] = nlohmann::json::array();
        result["losers"] = nlohmann::json::array();
        return result;
    }
}

bool AlpacaClient::cancelOrder(const std::string& order_id) {
    std::string endpoint = "/v2/orders/" + order_id;
    std::string response = httpDelete(endpoint);
    return !response.empty();
}

nlohmann::json AlpacaClient::testAlpacaPerformance(int iterations) {
    std::vector<double> times;
    int success_count = 0;
    int error_count = 0;
    size_t total_data_size = 0;
    
    for (int i = 0; i < iterations; i++) {
        auto start = std::chrono::high_resolution_clock::now();
        
        try {
            std::string response = httpGet("/v2/account");
            total_data_size += response.size();
            success_count++;
        } catch (const std::exception& e) {
            error_count++;
        }
        
        auto end = std::chrono::high_resolution_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
        times.push_back(duration.count() / 1000.0); // Convert to milliseconds
    }
    
    // Calculate metrics
    std::vector<double> sorted_times = times;
    std::sort(sorted_times.begin(), sorted_times.end());
    
    double total_time = std::accumulate(times.begin(), times.end(), 0.0);
    double avg_time = total_time / times.size();
    double min_time = *std::min_element(times.begin(), times.end());
    double max_time = *std::max_element(times.begin(), times.end());
    double success_rate = (double)success_count / (success_count + error_count) * 100.0;
    
    // Calculate percentiles
    double p50 = sorted_times[sorted_times.size() * 0.5];
    double p95 = sorted_times[sorted_times.size() * 0.95];
    double p99 = sorted_times[sorted_times.size() * 0.99];
    
    // Calculate throughput
    double data_mb = total_data_size / (1024.0 * 1024.0);
    double time_seconds = total_time / 1000.0;
    double throughput_mbps = data_mb / time_seconds;
    
    nlohmann::json report;
    report["api_provider"] = "Alpaca";
    report["iterations"] = iterations;
    report["total_time_ms"] = total_time;
    report["avg_time_ms"] = avg_time;
    report["min_time_ms"] = min_time;
    report["max_time_ms"] = max_time;
    report["p50_time_ms"] = p50;
    report["p95_time_ms"] = p95;
    report["p99_time_ms"] = p99;
    report["success_count"] = success_count;
    report["error_count"] = error_count;
    report["success_rate"] = success_rate;
    report["data_size_bytes"] = total_data_size;
    report["throughput_mbps"] = throughput_mbps;
    
    return report;
}

nlohmann::json AlpacaClient::testPolygonPerformance(int iterations) {
    // This method will be implemented to test Polygon API through Alpaca client
    // For now, return a placeholder
    nlohmann::json report;
    report["api_provider"] = "Polygon (via Alpaca)";
    report["iterations"] = iterations;
    report["error"] = "Polygon testing not implemented in Alpaca client";
    return report;
}

} // namespace hft
