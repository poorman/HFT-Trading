#ifndef REDIS_CLIENT_HPP
#define REDIS_CLIENT_HPP

#include <string>
#include <vector>
#include <map>
#include <nlohmann/json.hpp>

// Forward declaration
struct redisContext;

namespace hft {

class RedisClient {
public:
    RedisClient(const std::string& host = "localhost", int port = 6379, int db = 0);
    ~RedisClient();
    
    // Connection management
    bool connect();
    void disconnect();
    bool isConnected() const;
    
    // String operations
    bool set(const std::string& key, const std::string& value, int ttl_seconds = -1);
    std::string get(const std::string& key);
    bool del(const std::string& key);
    bool exists(const std::string& key);
    
    // Hash operations
    bool hset(const std::string& key, const std::string& field, const std::string& value);
    std::string hget(const std::string& key, const std::string& field);
    std::map<std::string, std::string> hgetall(const std::string& key);
    bool hdel(const std::string& key, const std::string& field);
    
    // Set operations
    bool sadd(const std::string& key, const std::string& member);
    bool srem(const std::string& key, const std::string& member);
    std::vector<std::string> smembers(const std::string& key);
    bool sismember(const std::string& key, const std::string& member);
    
    // List operations
    bool lpush(const std::string& key, const std::string& value);
    std::string rpop(const std::string& key);
    std::vector<std::string> lrange(const std::string& key, int start, int stop);
    
    // Expiration
    bool expire(const std::string& key, int seconds);
    bool expireat(const std::string& key, int64_t timestamp);
    
    // JSON helpers
    bool setJson(const std::string& key, const nlohmann::json& value, int ttl_seconds = -1);
    nlohmann::json getJson(const std::string& key);
    
    // Movers strategy specific methods
    bool addActivePosition(const std::string& symbol, const nlohmann::json& position_data);
    bool removeActivePosition(const std::string& symbol);
    std::vector<std::string> getActivePositions();
    nlohmann::json getPositionData(const std::string& symbol);
    
    bool addPurchasedToday(const std::string& symbol);
    bool isPurchasedToday(const std::string& symbol);
    void clearPurchasedToday();
    
    bool setApiSelection(const std::string& api_name);
    std::string getApiSelection();
    
    // Error handling
    std::string getLastError() const;
    void clearError();

private:
    std::string host_;
    int port_;
    int db_;
    redisContext* redis_context_;
    mutable std::string last_error_;
    
    // Internal helpers
    void* executeCommand(const std::string& command);
    std::vector<std::string> parseArray(void* reply);
    std::string parseString(void* reply);
    void handleError();
};

} // namespace hft

#endif // REDIS_CLIENT_HPP
