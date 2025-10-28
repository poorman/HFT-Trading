#include "api_benchmark.hpp"
#include "alpaca_client.hpp"
#include "polygon_client.hpp"
#include <iostream>
#include <chrono>
#include <vector>
#include <algorithm>
#include <thread>

namespace hft {

ApiBenchmark::ApiBenchmark(const std::string& alpaca_key, const std::string& alpaca_secret, 
                          const std::string& polygon_key)
    : alpaca_client_(alpaca_key, alpaca_secret, true)
    , polygon_client_(polygon_key)
    , selected_api_("")
    , benchmark_complete_(false)
{
}

void ApiBenchmark::runBenchmark(int iterations) {
    std::cout << "🔍 Running API performance benchmark (" << iterations << " iterations)..." << std::endl;
    
    std::vector<double> alpaca_times;
    std::vector<double> polygon_times;
    
    // Benchmark Alpaca
    std::cout << "📊 Testing Alpaca API..." << std::endl;
    for (int i = 0; i < iterations; i++) {
        auto start = std::chrono::high_resolution_clock::now();
        try {
            auto movers = alpaca_client_.getMarketMovers();
            auto end = std::chrono::high_resolution_clock::now();
            auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
            alpaca_times.push_back(duration.count() / 1000.0); // Convert to milliseconds
        } catch (const std::exception& e) {
            std::cout << "⚠ Alpaca API error: " << e.what() << std::endl;
            alpaca_times.push_back(9999.0); // High penalty for errors
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(100)); // Rate limiting
    }
    
    // Benchmark Polygon
    std::cout << "📊 Testing Polygon API..." << std::endl;
    for (int i = 0; i < iterations; i++) {
        auto start = std::chrono::high_resolution_clock::now();
        try {
            auto movers = polygon_client_.getMarketMovers();
            auto end = std::chrono::high_resolution_clock::now();
            auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
            polygon_times.push_back(duration.count() / 1000.0); // Convert to milliseconds
        } catch (const std::exception& e) {
            std::cout << "⚠ Polygon API error: " << e.what() << std::endl;
            polygon_times.push_back(9999.0); // High penalty for errors
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(100)); // Rate limiting
    }
    
    // Calculate statistics
    auto alpaca_stats = calculateStats(alpaca_times);
    auto polygon_stats = calculateStats(polygon_times);
    
    // Select fastest API based on p50 latency
    if (alpaca_stats.p50_time_ms < polygon_stats.p50_time_ms) {
        selected_api_ = "alpaca";
        std::cout << "✅ Selected Alpaca API (p50: " << alpaca_stats.p50_time_ms << "ms vs " 
                  << polygon_stats.p50_time_ms << "ms)" << std::endl;
    } else {
        selected_api_ = "polygon";
        std::cout << "✅ Selected Polygon API (p50: " << polygon_stats.p50_time_ms << "ms vs " 
                  << alpaca_stats.p50_time_ms << "ms)" << std::endl;
    }
    
    benchmark_complete_ = true;
    
    // Print detailed results
    printResults("Alpaca", alpaca_stats);
    printResults("Polygon", polygon_stats);
}

ApiStats ApiBenchmark::calculateStats(const std::vector<double>& times) {
    ApiStats stats;
    
    if (times.empty()) {
        return stats;
    }
    
    std::vector<double> sorted_times = times;
    std::sort(sorted_times.begin(), sorted_times.end());
    
    stats.total_time_ms = std::accumulate(times.begin(), times.end(), 0.0);
    stats.avg_time_ms = stats.total_time_ms / times.size();
    stats.min_time_ms = *std::min_element(times.begin(), times.end());
    stats.max_time_ms = *std::max_element(times.begin(), times.end());
    
    // Calculate percentiles
    size_t size = sorted_times.size();
    stats.p50_time_ms = sorted_times[size * 0.5];
    stats.p95_time_ms = sorted_times[size * 0.95];
    stats.p99_time_ms = sorted_times[size * 0.99];
    
    // Count successes (times < 5000ms)
    stats.success_count = std::count_if(times.begin(), times.end(), 
                                        [](double t) { return t < 5000.0; });
    stats.error_count = times.size() - stats.success_count;
    stats.success_rate = (double)stats.success_count / times.size() * 100.0;
    
    return stats;
}

void ApiBenchmark::printResults(const std::string& api_name, const ApiStats& stats) {
    std::cout << "\n📈 " << api_name << " API Performance:" << std::endl;
    std::cout << "   Average: " << std::fixed << std::setprecision(2) << stats.avg_time_ms << "ms" << std::endl;
    std::cout << "   P50:     " << stats.p50_time_ms << "ms" << std::endl;
    std::cout << "   P95:     " << stats.p95_time_ms << "ms" << std::endl;
    std::cout << "   P99:     " << stats.p99_time_ms << "ms" << std::endl;
    std::cout << "   Success: " << stats.success_count << "/" << (stats.success_count + stats.error_count) 
              << " (" << std::fixed << std::setprecision(1) << stats.success_rate << "%)" << std::endl;
}

std::string ApiBenchmark::getSelectedApi() const {
    return selected_api_;
}

bool ApiBenchmark::isBenchmarkComplete() const {
    return benchmark_complete_;
}

nlohmann::json ApiBenchmark::getBenchmarkResults() const {
    nlohmann::json results;
    results["selected_api"] = selected_api_;
    results["benchmark_complete"] = benchmark_complete_;
    results["timestamp"] = std::chrono::duration_cast<std::chrono::seconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
    return results;
}

} // namespace hft
