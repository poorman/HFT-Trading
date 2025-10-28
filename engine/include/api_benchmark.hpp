#ifndef API_BENCHMARK_HPP
#define API_BENCHMARK_HPP

#include <string>
#include <vector>
#include <algorithm>
#include <numeric>
#include <iomanip>
#include <nlohmann/json.hpp>
#include "alpaca_client.hpp"
#include "polygon_client.hpp"

namespace hft {

struct ApiStats {
    double total_time_ms = 0.0;
    double avg_time_ms = 0.0;
    double min_time_ms = 0.0;
    double max_time_ms = 0.0;
    double p50_time_ms = 0.0;
    double p95_time_ms = 0.0;
    double p99_time_ms = 0.0;
    int success_count = 0;
    int error_count = 0;
    double success_rate = 0.0;
};

class ApiBenchmark {
public:
    ApiBenchmark(const std::string& alpaca_key, const std::string& alpaca_secret, 
                 const std::string& polygon_key);
    
    // Run performance benchmark between APIs
    void runBenchmark(int iterations = 10);
    
    // Get selected API name
    std::string getSelectedApi() const;
    
    // Check if benchmark is complete
    bool isBenchmarkComplete() const;
    
    // Get benchmark results as JSON
    nlohmann::json getBenchmarkResults() const;

private:
    AlpacaClient alpaca_client_;
    PolygonClient polygon_client_;
    std::string selected_api_;
    bool benchmark_complete_;
    
    // Calculate performance statistics
    ApiStats calculateStats(const std::vector<double>& times);
    
    // Print formatted results
    void printResults(const std::string& api_name, const ApiStats& stats);
};

} // namespace hft

#endif // API_BENCHMARK_HPP
