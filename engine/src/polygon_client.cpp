#include "polygon_client.hpp"
#include <algorithm>
#include <numeric>
#include <cmath>
#include <iostream>

namespace hft {

PolygonClient::PolygonClient(const std::string& api_key) 
    : api_key_(api_key), base_url_("https://api.polygon.io") {
    curl_ = curl_easy_init();
    if (!curl_) {
        throw std::runtime_error("Failed to initialize CURL");
    }
}

PolygonClient::~PolygonClient() {
    if (curl_) {
        curl_easy_cleanup(curl_);
    }
}

std::string PolygonClient::httpGet(const std::string& endpoint) {
    if (!curl_) {
        throw std::runtime_error("CURL not initialized");
    }
    
    curl_easy_reset(curl_);
    curl_easy_setopt(curl_, CURLOPT_SSL_VERIFYPEER, 1L);
    curl_easy_setopt(curl_, CURLOPT_SSL_VERIFYHOST, 2L);
    curl_easy_setopt(curl_, CURLOPT_WRITEFUNCTION, writeCallback);
    
    std::string response;
    curl_easy_setopt(curl_, CURLOPT_WRITEDATA, &response);
    
    std::string url = base_url_ + endpoint + "&apikey=" + api_key_;
    curl_easy_setopt(curl_, CURLOPT_URL, url.c_str());
    
    CURLcode res = curl_easy_perform(curl_);
    if (res != CURLE_OK) {
        throw std::runtime_error("CURL request failed: " + std::string(curl_easy_strerror(res)));
    }
    
    return response;
}

size_t PolygonClient::writeCallback(void* contents, size_t size, size_t nmemb, void* userp) {
    size_t total_size = size * nmemb;
    std::string* response = static_cast<std::string*>(userp);
    response->append(static_cast<char*>(contents), total_size);
    return total_size;
}

nlohmann::json PolygonClient::getMarketMovers() {
    try {
        std::string response = httpGet("/v2/snapshot/locale/us/markets/stocks/gainers?limit=20");
        return nlohmann::json::parse(response);
    } catch (const std::exception& e) {
        nlohmann::json error_response;
        error_response["error"] = "Failed to fetch market movers: " + std::string(e.what());
        return error_response;
    }
}

PerformanceMetrics PolygonClient::testPerformance(int iterations) {
    std::vector<double> times;
    int success_count = 0;
    int error_count = 0;
    size_t total_data_size = 0;
    
    for (int i = 0; i < iterations; i++) {
        auto start = std::chrono::high_resolution_clock::now();
        
        try {
            std::string response = httpGet("/v2/snapshot/locale/us/markets/stocks/gainers?limit=20");
            total_data_size += response.size();
            success_count++;
        } catch (const std::exception& e) {
            error_count++;
        }
        
        auto end = std::chrono::high_resolution_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
        times.push_back(duration.count() / 1000.0); // Convert to milliseconds
    }
    
    return calculateMetrics(times, success_count, error_count, total_data_size);
}

nlohmann::json PolygonClient::getDetailedPerformanceReport(int iterations) {
    auto metrics = testPerformance(iterations);
    
    nlohmann::json report;
    report["api_provider"] = "Polygon";
    report["iterations"] = iterations;
    report["total_time_ms"] = metrics.total_time_ms;
    report["avg_time_ms"] = metrics.avg_time_ms;
    report["min_time_ms"] = metrics.min_time_ms;
    report["max_time_ms"] = metrics.max_time_ms;
    report["p50_time_ms"] = metrics.p50_time_ms;
    report["p95_time_ms"] = metrics.p95_time_ms;
    report["p99_time_ms"] = metrics.p99_time_ms;
    report["success_count"] = metrics.success_count;
    report["error_count"] = metrics.error_count;
    report["success_rate"] = metrics.success_rate;
    report["data_size_bytes"] = metrics.data_size_bytes;
    report["throughput_mbps"] = metrics.throughput_mbps;
    
    return report;
}

PerformanceMetrics PolygonClient::calculateMetrics(const std::vector<double>& times, int success_count, int error_count, size_t data_size) {
    PerformanceMetrics metrics;
    
    if (times.empty()) {
        return metrics;
    }
    
    std::vector<double> sorted_times = times;
    std::sort(sorted_times.begin(), sorted_times.end());
    
    metrics.total_time_ms = std::accumulate(times.begin(), times.end(), 0.0);
    metrics.avg_time_ms = metrics.total_time_ms / times.size();
    metrics.min_time_ms = *std::min_element(times.begin(), times.end());
    metrics.max_time_ms = *std::max_element(times.begin(), times.end());
    metrics.success_count = success_count;
    metrics.error_count = error_count;
    metrics.success_rate = (double)success_count / (success_count + error_count) * 100.0;
    metrics.data_size_bytes = data_size;
    
    // Calculate percentiles
    auto percentiles = calculatePercentiles(sorted_times);
    metrics.p50_time_ms = percentiles[0];
    metrics.p95_time_ms = percentiles[1];
    metrics.p99_time_ms = percentiles[2];
    
    // Calculate throughput
    if (metrics.total_time_ms > 0) {
        double data_mb = data_size / (1024.0 * 1024.0);
        double time_seconds = metrics.total_time_ms / 1000.0;
        metrics.throughput_mbps = data_mb / time_seconds;
    }
    
    return metrics;
}

std::vector<double> PolygonClient::calculatePercentiles(const std::vector<double>& sorted_times) {
    std::vector<double> percentiles(3);
    
    if (sorted_times.empty()) return percentiles;
    
    // P50 (median)
    size_t p50_idx = sorted_times.size() * 0.5;
    percentiles[0] = sorted_times[p50_idx];
    
    // P95
    size_t p95_idx = sorted_times.size() * 0.95;
    percentiles[1] = sorted_times[p95_idx];
    
    // P99
    size_t p99_idx = sorted_times.size() * 0.99;
    percentiles[2] = sorted_times[p99_idx];
    
    return percentiles;
}

} // namespace hft
