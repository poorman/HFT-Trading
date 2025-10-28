#include "execution_engine.hpp"
#include <nlohmann/json.hpp>
#include <iostream>

namespace hft {

ExecutionEngine::ExecutionEngine(const std::string& zmq_address, bool use_paper_trading)
    : zmq_address_(zmq_address), use_paper_trading_(use_paper_trading) {
    
    zmq_context_ = std::make_unique<zmq::context_t>(1);
    zmq_socket_ = std::make_unique<zmq::socket_t>(*zmq_context_, zmq::socket_type::rep);
    
    if (use_paper_trading_) {
        const char* api_key = std::getenv("ALPACA_API_KEY");
        const char* api_secret = std::getenv("ALPACA_API_SECRET");
        
        if (api_key && api_secret) {
            alpaca_client_ = std::make_unique<AlpacaClient>(api_key, api_secret, true);
            std::cout << "✓ Alpaca paper trading enabled" << std::endl;
        } else {
            std::cerr << "⚠ ALPACA credentials not set. Using internal matching" << std::endl;
            use_paper_trading_ = false;
        }
    }
    
    // Initialize Polygon client
    const char* polygon_api_key = std::getenv("POLYGON_API_KEY");
    if (polygon_api_key) {
        polygon_client_ = std::make_unique<PolygonClient>(polygon_api_key);
        std::cout << "✓ Polygon API client enabled" << std::endl;
    } else {
        std::cerr << "⚠ POLYGON_API_KEY not set. Polygon features disabled" << std::endl;
    }
    
    // Initialize Redis client
    redis_client_ = std::make_unique<RedisClient>("hft-redis", 6379, 0);
    if (redis_client_->connect()) {
        std::cout << "✓ Redis client connected" << std::endl;
    } else {
        std::cerr << "⚠ Redis connection failed: " << redis_client_->getLastError() << std::endl;
    }
    
    // Initialize Movers Strategy
    const char* movers_enabled = std::getenv("MOVERS_STRATEGY_ENABLED");
    if (movers_enabled && std::string(movers_enabled) == "true") {
        MoversConfig config;
        config.enabled = true;
        
        // Load configuration from environment
        const char* buy_threshold = std::getenv("MOVERS_BUY_THRESHOLD");
        if (buy_threshold) config.buy_threshold = std::stod(buy_threshold);
        
        const char* sell_threshold = std::getenv("MOVERS_SELL_THRESHOLD");
        if (sell_threshold) config.sell_threshold = std::stod(sell_threshold);
        
        const char* investment_amount = std::getenv("MOVERS_INVESTMENT_AMOUNT");
        if (investment_amount) config.investment_amount = std::stod(investment_amount);
        
        const char* check_interval = std::getenv("MOVERS_CHECK_INTERVAL");
        if (check_interval) config.check_interval = std::stoi(check_interval);
        
        const char* alpaca_key = std::getenv("ALPACA_API_KEY");
        const char* alpaca_secret = std::getenv("ALPACA_API_SECRET");
        
        if (alpaca_key && alpaca_secret && polygon_api_key) {
            movers_strategy_ = std::make_unique<MoversStrategy>(
                alpaca_key, alpaca_secret, polygon_api_key, config);
            std::cout << "✓ Movers strategy initialized" << std::endl;
        } else {
            std::cerr << "⚠ Missing API credentials for Movers strategy" << std::endl;
        }
    }
}

ExecutionEngine::~ExecutionEngine() {
    stop();
}

void ExecutionEngine::start() {
    if (running_.exchange(true)) return;
    
    zmq_socket_->bind(zmq_address_);
    std::cout << "✓ Trading engine listening on " << zmq_address_ << std::endl;
    
    // Start movers strategy if enabled
    if (movers_strategy_) {
        movers_strategy_->start();
        std::cout << "✓ Movers strategy started" << std::endl;
    }
    
    processing_thread_ = std::make_unique<std::thread>(&ExecutionEngine::processOrders, this);
}

void ExecutionEngine::stop() {
    if (!running_.exchange(false)) return;
    
    // Stop movers strategy
    if (movers_strategy_) {
        movers_strategy_->stop();
        std::cout << "✓ Movers strategy stopped" << std::endl;
    }
    
    if (processing_thread_ && processing_thread_->joinable()) {
        processing_thread_->join();
    }
    
    std::cout << "✓ Trading engine stopped" << std::endl;
}

OrderBook* ExecutionEngine::getOrderBook(const std::string& symbol) {
    auto it = order_books_.find(symbol);
    if (it == order_books_.end()) {
        order_books_[symbol] = std::make_unique<OrderBook>(symbol);
        return order_books_[symbol].get();
    }
    return it->second.get();
}

std::string ExecutionEngine::handleOrderRequest(const std::string& request_json) {
    try {
        nlohmann::json request = nlohmann::json::parse(request_json);
        
        Order order;
        order.client_order_id = request["client_order_id"];
        order.symbol = request["symbol"];
        order.side = (request["side"] == "BUY") ? Side::BUY : Side::SELL;
        order.quantity = request["quantity"];
        order.price = request["price"];
        
        std::string order_type_str = request.value("order_type", "LIMIT");
        if (order_type_str == "MARKET") {
            order.order_type = OrderType::MARKET;
        } else if (order_type_str == "STOP") {
            order.order_type = OrderType::STOP;
        } else {
            order.order_type = OrderType::LIMIT;
        }
        
        ExecutionReport report;
        
        if (use_paper_trading_ && alpaca_client_) {
            report = alpaca_client_->submitOrder(order);
        } else {
            OrderBook* book = getOrderBook(order.symbol);
            report = book->addOrder(order);
            
            auto match_reports = book->matchOrders();
            if (!match_reports.empty()) {
                report = match_reports[0];
            }
        }
        
        nlohmann::json response;
        response["success"] = (report.status != OrderStatus::REJECTED);
        response["order_id"] = report.order_id;
        response["client_order_id"] = report.client_order_id;
        response["symbol"] = report.symbol;
        response["side"] = (report.side == Side::BUY) ? "BUY" : "SELL";
        
        switch (report.status) {
            case OrderStatus::NEW: response["status"] = "NEW"; break;
            case OrderStatus::PARTIALLY_FILLED: response["status"] = "PARTIALLY_FILLED"; break;
            case OrderStatus::FILLED: response["status"] = "FILLED"; break;
            case OrderStatus::REJECTED: response["status"] = "REJECTED"; break;
            case OrderStatus::CANCELED: response["status"] = "CANCELED"; break;
        }
        
        response["fill_price"] = report.fill_price;
        response["fill_qty"] = report.fill_qty;
        response["remaining_qty"] = report.remaining_qty;
        response["message"] = report.message;
        
        auto nanos = std::chrono::duration_cast<std::chrono::nanoseconds>(
            report.timestamp.time_since_epoch()
        ).count();
        response["timestamp"] = nanos;
        
        return response.dump();
        
    } catch (const std::exception& e) {
        nlohmann::json error_response;
        error_response["success"] = false;
        error_response["error"] = e.what();
        return error_response.dump();
    }
}

std::string ExecutionEngine::handlePositionRequest(const std::string& request_json) {
    try {
        if (use_paper_trading_ && alpaca_client_) {
            nlohmann::json positions = alpaca_client_->getPositions();
            
            nlohmann::json response;
            response["success"] = true;
            response["positions"] = positions;
            
            return response.dump();
        } else {
            nlohmann::json response;
            response["success"] = true;
            response["positions"] = nlohmann::json::array();
            return response.dump();
        }
    } catch (const std::exception& e) {
        nlohmann::json error_response;
        error_response["success"] = false;
        error_response["error"] = e.what();
        return error_response.dump();
    }
}

std::string ExecutionEngine::handleAccountRequest(const std::string& request_json) {
    try {
        if (use_paper_trading_ && alpaca_client_) {
            nlohmann::json account = alpaca_client_->getAccount();
            
            nlohmann::json response;
            response["success"] = true;
            response["account"] = account;
            
            return response.dump();
        } else {
            // Return simulated account for internal matching
            nlohmann::json account;
            account["cash"] = "100000.00";
            account["equity"] = "100000.00";
            account["buying_power"] = "100000.00";
            account["currency"] = "USD";
            account["status"] = "ACTIVE";
            
            nlohmann::json response;
            response["success"] = true;
            response["account"] = account;
            
            return response.dump();
        }
    } catch (const std::exception& e) {
        nlohmann::json error_response;
        error_response["success"] = false;
        error_response["error"] = e.what();
        return error_response.dump();
    }
}

std::string ExecutionEngine::handleOpenOrdersRequest(const std::string& request_json) {
    try {
        if (use_paper_trading_ && alpaca_client_) {
            nlohmann::json orders = alpaca_client_->getOpenOrders();
            
            nlohmann::json response;
            response["success"] = true;
            response["orders"] = orders;
            
            return response.dump();
        } else {
            // Return empty array for internal matching
            nlohmann::json response;
            response["success"] = true;
            response["orders"] = nlohmann::json::array();
            
            return response.dump();
        }
    } catch (const std::exception& e) {
        nlohmann::json error_response;
        error_response["success"] = false;
        error_response["error"] = e.what();
        return error_response.dump();
    }
}

std::string ExecutionEngine::handleAllOrdersRequest(const std::string& request_json) {
    try {
        if (use_paper_trading_ && alpaca_client_) {
            nlohmann::json orders = alpaca_client_->getAllOrders();
            
            // Filter to only show filled orders for executions
            nlohmann::json filled_orders = nlohmann::json::array();
            for (const auto& order : orders) {
                if (order.contains("status")) {
                    std::string status = order["status"];
                    if (status == "filled" || status == "partially_filled") {
                        filled_orders.push_back(order);
                    }
                }
            }
            
            nlohmann::json response;
            response["success"] = true;
            response["orders"] = filled_orders;
            response["all_orders"] = orders;  // Also include all orders for debugging
            
            return response.dump();
        } else {
            // Return empty array for internal matching
            nlohmann::json response;
            response["success"] = true;
            response["orders"] = nlohmann::json::array();
            
            return response.dump();
        }
    } catch (const std::exception& e) {
        nlohmann::json error_response;
        error_response["success"] = false;
        error_response["error"] = e.what();
        return error_response.dump();
    }
}

std::string ExecutionEngine::handleCancelOrderRequest(const std::string& request_json) {
    try {
        nlohmann::json request = nlohmann::json::parse(request_json);
        std::string order_id = request.value("order_id", "");
        
        if (order_id.empty()) {
            nlohmann::json error_response;
            error_response["success"] = false;
            error_response["error"] = "Missing order_id";
            return error_response.dump();
        }
        
        if (use_paper_trading_ && alpaca_client_) {
            bool cancelled = alpaca_client_->cancelOrder(order_id);
            
            nlohmann::json response;
            response["success"] = cancelled;
            response["message"] = cancelled ? "Order cancelled successfully" : "Failed to cancel order";
            response["order_id"] = order_id;
            
            return response.dump();
        } else {
            // For internal matching, return not implemented
            nlohmann::json response;
            response["success"] = false;
            response["message"] = "Cancel order not implemented for internal matching";
            response["order_id"] = order_id;
            
            return response.dump();
        }
    } catch (const std::exception& e) {
        nlohmann::json error_response;
        error_response["success"] = false;
        error_response["error"] = e.what();
        return error_response.dump();
    }
}

std::string ExecutionEngine::handleMarketMoversRequest(const std::string& request_json) {
    try {
        if (use_paper_trading_ && alpaca_client_) {
            nlohmann::json movers = alpaca_client_->getMarketMovers();
            
            nlohmann::json response;
            response["success"] = true;
            response["movers"] = movers;
            
            return response.dump();
        } else {
            // Return empty movers for internal matching
            nlohmann::json movers;
            movers["gainers"] = nlohmann::json::array();
            movers["losers"] = nlohmann::json::array();
            
            nlohmann::json response;
            response["success"] = true;
            response["movers"] = movers;
            
            return response.dump();
        }
    } catch (const std::exception& e) {
        nlohmann::json error_response;
        error_response["success"] = false;
        error_response["error"] = e.what();
        return error_response.dump();
    }
}

void ExecutionEngine::processOrders() {
    std::cout << "✓ Order processing thread started" << std::endl;
    
    while (running_) {
        try {
            zmq::message_t request;
            auto result = zmq_socket_->recv(request, zmq::recv_flags::dontwait);
            
            if (result) {
                std::string request_str(static_cast<char*>(request.data()), request.size());
                
                nlohmann::json request_json = nlohmann::json::parse(request_str);
                std::string request_type = request_json.value("type", "order");
                
                std::string response_str;
                
                if (request_type == "order") {
                    response_str = handleOrderRequest(request_str);
                } else if (request_type == "positions") {
                    response_str = handlePositionRequest(request_str);
                } else if (request_type == "account") {
                    response_str = handleAccountRequest(request_str);
                } else if (request_type == "GET_OPEN_ORDERS") {
                    response_str = handleOpenOrdersRequest(request_str);
                } else if (request_type == "GET_ALL_ORDERS") {
                    response_str = handleAllOrdersRequest(request_str);
                } else if (request_type == "CANCEL_ORDER") {
                    response_str = handleCancelOrderRequest(request_str);
                } else if (request_type == "movers") {
                    response_str = handleMarketMoversRequest(request_str);
                } else if (request_type == "alpaca_performance") {
                    response_str = handleAlpacaPerformanceTest(request_str);
                } else if (request_type == "polygon_performance") {
                    response_str = handlePolygonPerformanceTest(request_str);
                } else if (request_type == "movers_strategy") {
                    response_str = handleMoversStrategyRequest(request_str);
                } else {
                    nlohmann::json error_response;
                    error_response["success"] = false;
                    error_response["error"] = "Unknown request type";
                    response_str = error_response.dump();
                }
                
                zmq::message_t response(response_str.size());
                memcpy(response.data(), response_str.data(), response_str.size());
                zmq_socket_->send(response, zmq::send_flags::none);
            } else {
                std::this_thread::sleep_for(std::chrono::microseconds(100));
            }
        } catch (const std::exception& e) {
            std::cerr << "Error processing order: " << e.what() << std::endl;
        }
    }
}

std::string ExecutionEngine::handleAlpacaPerformanceTest(const std::string& request_json) {
    try {
        nlohmann::json request = nlohmann::json::parse(request_json);
        int iterations = request.value("iterations", 10);
        
        if (!alpaca_client_) {
            nlohmann::json error_response;
            error_response["success"] = false;
            error_response["error"] = "Alpaca client not initialized";
            return error_response.dump();
        }
        
        auto performance_report = alpaca_client_->testAlpacaPerformance(iterations);
        return performance_report.dump();
        
    } catch (const std::exception& e) {
        nlohmann::json error_response;
        error_response["success"] = false;
        error_response["error"] = "Performance test failed: " + std::string(e.what());
        return error_response.dump();
    }
}

std::string ExecutionEngine::handlePolygonPerformanceTest(const std::string& request_json) {
    try {
        nlohmann::json request = nlohmann::json::parse(request_json);
        int iterations = request.value("iterations", 10);
        
        if (!polygon_client_) {
            nlohmann::json error_response;
            error_response["success"] = false;
            error_response["error"] = "Polygon client not initialized";
            return error_response.dump();
        }
        
        auto performance_report = polygon_client_->getDetailedPerformanceReport(iterations);
        return performance_report.dump();
        
    } catch (const std::exception& e) {
        nlohmann::json error_response;
        error_response["success"] = false;
        error_response["error"] = "Performance test failed: " + std::string(e.what());
        return error_response.dump();
    }
}

std::string ExecutionEngine::handleMoversStrategyRequest(const std::string& request_json) {
    try {
        nlohmann::json request = nlohmann::json::parse(request_json);
        std::string action = request.value("action", "status");
        
        if (!movers_strategy_) {
            nlohmann::json error_response;
            error_response["success"] = false;
            error_response["error"] = "Movers strategy not initialized";
            return error_response.dump();
        }
        
        nlohmann::json response;
        response["success"] = true;
        
        if (action == "status") {
            response["data"] = movers_strategy_->getStatus();
        } else if (action == "positions") {
            response["data"] = movers_strategy_->getPositions();
        } else if (action == "performance") {
            response["data"] = movers_strategy_->getPerformance();
        } else if (action == "enable") {
            movers_strategy_->enable();
            response["message"] = "Movers strategy enabled";
        } else if (action == "disable") {
            movers_strategy_->disable();
            response["message"] = "Movers strategy disabled";
        } else if (action == "force_close") {
            movers_strategy_->forceCloseAll();
            response["message"] = "All positions force closed";
        } else {
            response["success"] = false;
            response["error"] = "Unknown action: " + action;
        }
        
        return response.dump();
        
    } catch (const std::exception& e) {
        nlohmann::json error_response;
        error_response["success"] = false;
        error_response["error"] = "Movers strategy request failed: " + std::string(e.what());
        return error_response.dump();
    }
}

} // namespace hft
