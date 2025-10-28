#include <iostream>
#include <csignal>
#include <atomic>
#include "execution_engine.hpp"

std::atomic<bool> shutdown_requested(false);

void signalHandler(int signal) {
    std::cout << "\n⚠ Shutdown signal received: " << signal << std::endl;
    shutdown_requested = true;
}

int main(int argc, char* argv[]) {
    std::cout << "╔═══════════════════════════════════════╗" << std::endl;
    std::cout << "║   HFT Trading Engine v1.0             ║" << std::endl;
    std::cout << "║   Ultra-Low-Latency Execution Core    ║" << std::endl;
    std::cout << "╚═══════════════════════════════════════╝" << std::endl;
    std::cout << std::endl;
    
    std::signal(SIGINT, signalHandler);
    std::signal(SIGTERM, signalHandler);
    
    std::string zmq_address = "tcp://0.0.0.0:5555";
    bool use_paper_trading = true;
    
    for (int i = 1; i < argc; i++) {
        std::string arg = argv[i];
        if (arg == "--internal") {
            use_paper_trading = false;
            std::cout << "⚙ Using internal order matching" << std::endl;
        } else if (arg == "--zmq" && i + 1 < argc) {
            zmq_address = argv[++i];
        }
    }
    
    if (use_paper_trading) {
        const char* api_key = std::getenv("ALPACA_API_KEY");
        const char* api_secret = std::getenv("ALPACA_API_SECRET");
        
        if (!api_key || !api_secret) {
            std::cout << "⚠ ALPACA credentials not set" << std::endl;
            std::cout << "⚙ Falling back to internal order matching" << std::endl;
            use_paper_trading = false;
        }
    }
    
    hft::ExecutionEngine engine(zmq_address, use_paper_trading);
    engine.start();
    
    std::cout << std::endl;
    std::cout << "✓ Engine running. Press Ctrl+C to stop." << std::endl;
    std::cout << std::endl;
    
    while (!shutdown_requested) {
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
    
    std::cout << "⚙ Shutting down engine..." << std::endl;
    engine.stop();
    
    std::cout << "✓ Engine stopped. Goodbye!" << std::endl;
    return 0;
}
