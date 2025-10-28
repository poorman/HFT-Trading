#ifndef POLYGON_CLIENT_HPP
#define POLYGON_CLIENT_HPP

#include <string>
#include <curl/curl.h>
#include <nlohmann/json.hpp>
#include <chrono>
#include <vector>

namespace hft {

struct PerformanceMetrics {
    double total_time_ms;
    double avg_time_ms;
    double min_time_ms;
    double max_time_ms;
    double p50_time_ms;
    double p95_time_ms;
    double p99_time_ms;
    int success_count;
    int error_count;
    double success_rate;
    size_t data_size_bytes;
    double throughput_mbps;
};

class PolygonClient {
public:
    PolygonClient(const std::string& api_key);
    ~PolygonClient();
    
    // Get market movers from Polygon
    nlohmann::json getMarketMovers();
    
    // Performance testing
    PerformanceMetrics testPerformance(int iterations = 10);
    nlohmann::json getDetailedPerformanceReport(int iterations = 10);

private:
    std::string api_key_;
    std::string base_url_;
    CURL* curl_;
    
    // HTTP request helpers
    std::string httpGet(const std::string& endpoint);
    static size_t writeCallback(void* contents, size_t size, size_t nmemb, void* userp);
    
    // Performance calculation helpers
    PerformanceMetrics calculateMetrics(const std::vector<double>& times, int success_count, int error_count, size_t data_size);
    std::vector<double> calculatePercentiles(const std::vector<double>& times);
};

} // namespace hft

#endif // POLYGON_CLIENT_HPP
