#include "redis_client.hpp"
#include <iostream>
#include <sstream>
#include <cstring>
#include <hiredis/hiredis.h>

namespace hft {

RedisClient::RedisClient(const std::string& host, int port, int db)
    : host_(host), port_(port), db_(db), redis_context_(nullptr) {
}

RedisClient::~RedisClient() {
    disconnect();
}

bool RedisClient::connect() {
    disconnect();
    
    redis_context_ = redisConnect(host_.c_str(), port_);
    if (redis_context_ == nullptr || redis_context_->err) {
        if (redis_context_) {
            last_error_ = redis_context_->errstr;
            redisFree(redis_context_);
            redis_context_ = nullptr;
        } else {
            last_error_ = "Failed to allocate Redis context";
        }
        return false;
    }
    
    // Select database
    if (db_ != 0) {
        void* reply = redisCommand(redis_context_, "SELECT %d", db_);
        if (reply == nullptr) {
            last_error_ = "Failed to select database";
            redisFree(redis_context_);
            redis_context_ = nullptr;
            return false;
        }
        freeReplyObject(reply);
    }
    
    return true;
}

void RedisClient::disconnect() {
    if (redis_context_) {
        redisFree(redis_context_);
        redis_context_ = nullptr;
    }
}

bool RedisClient::isConnected() const {
    return redis_context_ != nullptr && !redis_context_->err;
}

bool RedisClient::set(const std::string& key, const std::string& value, int ttl_seconds) {
    if (!isConnected()) return false;
    
    void* reply;
    if (ttl_seconds > 0) {
        reply = redisCommand(redis_context_, "SETEX %s %d %s", key.c_str(), ttl_seconds, value.c_str());
    } else {
        reply = redisCommand(redis_context_, "SET %s %s", key.c_str(), value.c_str());
    }
    
    if (reply == nullptr) {
        handleError();
        return false;
    }
    
    bool success = (strcmp(((redisReply*)reply)->str, "OK") == 0);
    freeReplyObject(reply);
    return success;
}

std::string RedisClient::get(const std::string& key) {
    if (!isConnected()) return "";
    
    void* reply = redisCommand(redis_context_, "GET %s", key.c_str());
    if (reply == nullptr) {
        handleError();
        return "";
    }
    
    std::string result;
    if (((redisReply*)reply)->type == REDIS_REPLY_STRING) {
        result = ((redisReply*)reply)->str;
    }
    
    freeReplyObject(reply);
    return result;
}

bool RedisClient::del(const std::string& key) {
    if (!isConnected()) return false;
    
    void* reply = redisCommand(redis_context_, "DEL %s", key.c_str());
    if (reply == nullptr) {
        handleError();
        return false;
    }
    
    bool success = ((redisReply*)reply)->integer > 0;
    freeReplyObject(reply);
    return success;
}

bool RedisClient::exists(const std::string& key) {
    if (!isConnected()) return false;
    
    void* reply = redisCommand(redis_context_, "EXISTS %s", key.c_str());
    if (reply == nullptr) {
        handleError();
        return false;
    }
    
    bool exists = ((redisReply*)reply)->integer > 0;
    freeReplyObject(reply);
    return exists;
}

bool RedisClient::hset(const std::string& key, const std::string& field, const std::string& value) {
    if (!isConnected()) return false;
    
    void* reply = redisCommand(redis_context_, "HSET %s %s %s", key.c_str(), field.c_str(), value.c_str());
    if (reply == nullptr) {
        handleError();
        return false;
    }
    
    bool success = ((redisReply*)reply)->integer >= 0;
    freeReplyObject(reply);
    return success;
}

std::string RedisClient::hget(const std::string& key, const std::string& field) {
    if (!isConnected()) return "";
    
    void* reply = redisCommand(redis_context_, "HGET %s %s", key.c_str(), field.c_str());
    if (reply == nullptr) {
        handleError();
        return "";
    }
    
    std::string result;
    if (((redisReply*)reply)->type == REDIS_REPLY_STRING) {
        result = ((redisReply*)reply)->str;
    }
    
    freeReplyObject(reply);
    return result;
}

std::map<std::string, std::string> RedisClient::hgetall(const std::string& key) {
    std::map<std::string, std::string> result;
    if (!isConnected()) return result;
    
    void* reply = redisCommand(redis_context_, "HGETALL %s", key.c_str());
    if (reply == nullptr) {
        handleError();
        return result;
    }
    
    if (((redisReply*)reply)->type == REDIS_REPLY_ARRAY) {
        redisReply* array = (redisReply*)reply;
        for (size_t i = 0; i < array->elements; i += 2) {
            if (i + 1 < array->elements) {
                result[array->element[i]->str] = array->element[i + 1]->str;
            }
        }
    }
    
    freeReplyObject(reply);
    return result;
}

bool RedisClient::hdel(const std::string& key, const std::string& field) {
    if (!isConnected()) return false;
    
    void* reply = redisCommand(redis_context_, "HDEL %s %s", key.c_str(), field.c_str());
    if (reply == nullptr) {
        handleError();
        return false;
    }
    
    bool success = ((redisReply*)reply)->integer > 0;
    freeReplyObject(reply);
    return success;
}

bool RedisClient::sadd(const std::string& key, const std::string& member) {
    if (!isConnected()) return false;
    
    void* reply = redisCommand(redis_context_, "SADD %s %s", key.c_str(), member.c_str());
    if (reply == nullptr) {
        handleError();
        return false;
    }
    
    bool success = ((redisReply*)reply)->integer > 0;
    freeReplyObject(reply);
    return success;
}

bool RedisClient::srem(const std::string& key, const std::string& member) {
    if (!isConnected()) return false;
    
    void* reply = redisCommand(redis_context_, "SREM %s %s", key.c_str(), member.c_str());
    if (reply == nullptr) {
        handleError();
        return false;
    }
    
    bool success = ((redisReply*)reply)->integer > 0;
    freeReplyObject(reply);
    return success;
}

std::vector<std::string> RedisClient::smembers(const std::string& key) {
    std::vector<std::string> result;
    if (!isConnected()) return result;
    
    void* reply = redisCommand(redis_context_, "SMEMBERS %s", key.c_str());
    if (reply == nullptr) {
        handleError();
        return result;
    }
    
    if (((redisReply*)reply)->type == REDIS_REPLY_ARRAY) {
        redisReply* array = (redisReply*)reply;
        for (size_t i = 0; i < array->elements; i++) {
            result.push_back(array->element[i]->str);
        }
    }
    
    freeReplyObject(reply);
    return result;
}

bool RedisClient::sismember(const std::string& key, const std::string& member) {
    if (!isConnected()) return false;
    
    void* reply = redisCommand(redis_context_, "SISMEMBER %s %s", key.c_str(), member.c_str());
    if (reply == nullptr) {
        handleError();
        return false;
    }
    
    bool is_member = ((redisReply*)reply)->integer > 0;
    freeReplyObject(reply);
    return is_member;
}

bool RedisClient::lpush(const std::string& key, const std::string& value) {
    if (!isConnected()) return false;
    
    void* reply = redisCommand(redis_context_, "LPUSH %s %s", key.c_str(), value.c_str());
    if (reply == nullptr) {
        handleError();
        return false;
    }
    
    bool success = ((redisReply*)reply)->integer > 0;
    freeReplyObject(reply);
    return success;
}

std::string RedisClient::rpop(const std::string& key) {
    if (!isConnected()) return "";
    
    void* reply = redisCommand(redis_context_, "RPOP %s", key.c_str());
    if (reply == nullptr) {
        handleError();
        return "";
    }
    
    std::string result;
    if (((redisReply*)reply)->type == REDIS_REPLY_STRING) {
        result = ((redisReply*)reply)->str;
    }
    
    freeReplyObject(reply);
    return result;
}

std::vector<std::string> RedisClient::lrange(const std::string& key, int start, int stop) {
    std::vector<std::string> result;
    if (!isConnected()) return result;
    
    void* reply = redisCommand(redis_context_, "LRANGE %s %d %d", key.c_str(), start, stop);
    if (reply == nullptr) {
        handleError();
        return result;
    }
    
    if (((redisReply*)reply)->type == REDIS_REPLY_ARRAY) {
        redisReply* array = (redisReply*)reply;
        for (size_t i = 0; i < array->elements; i++) {
            result.push_back(array->element[i]->str);
        }
    }
    
    freeReplyObject(reply);
    return result;
}

bool RedisClient::expire(const std::string& key, int seconds) {
    if (!isConnected()) return false;
    
    void* reply = redisCommand(redis_context_, "EXPIRE %s %d", key.c_str(), seconds);
    if (reply == nullptr) {
        handleError();
        return false;
    }
    
    bool success = ((redisReply*)reply)->integer > 0;
    freeReplyObject(reply);
    return success;
}

bool RedisClient::expireat(const std::string& key, int64_t timestamp) {
    if (!isConnected()) return false;
    
    void* reply = redisCommand(redis_context_, "EXPIREAT %s %lld", key.c_str(), timestamp);
    if (reply == nullptr) {
        handleError();
        return false;
    }
    
    bool success = ((redisReply*)reply)->integer > 0;
    freeReplyObject(reply);
    return success;
}

bool RedisClient::setJson(const std::string& key, const nlohmann::json& value, int ttl_seconds) {
    return set(key, value.dump(), ttl_seconds);
}

nlohmann::json RedisClient::getJson(const std::string& key) {
    std::string value = get(key);
    if (value.empty()) {
        return nlohmann::json();
    }
    
    try {
        return nlohmann::json::parse(value);
    } catch (const std::exception& e) {
        last_error_ = "JSON parse error: " + std::string(e.what());
        return nlohmann::json();
    }
}

// Movers strategy specific methods
bool RedisClient::addActivePosition(const std::string& symbol, const nlohmann::json& position_data) {
    std::string key = "movers:position:" + symbol;
    std::string set_key = "movers:positions:active";
    
    // Store position data
    if (!setJson(key, position_data)) {
        return false;
    }
    
    // Add to active positions set
    return sadd(set_key, symbol);
}

bool RedisClient::removeActivePosition(const std::string& symbol) {
    std::string key = "movers:position:" + symbol;
    std::string set_key = "movers:positions:active";
    
    // Remove from active positions set
    srem(set_key, symbol);
    
    // Delete position data
    return del(key);
}

std::vector<std::string> RedisClient::getActivePositions() {
    return smembers("movers:positions:active");
}

nlohmann::json RedisClient::getPositionData(const std::string& symbol) {
    std::string key = "movers:position:" + symbol;
    return getJson(key);
}

bool RedisClient::addPurchasedToday(const std::string& symbol) {
    std::string key = "movers:purchased_today";
    
    // Add to set and set expiration for end of day (4 PM CT + 1 hour)
    bool success = sadd(key, symbol);
    if (success) {
        // Set expiration to end of trading day
        auto now = std::chrono::system_clock::now();
        auto end_of_day = now + std::chrono::hours(8); // 8 hours from now (roughly end of day)
        auto timestamp = std::chrono::duration_cast<std::chrono::seconds>(end_of_day.time_since_epoch()).count();
        expireat(key, timestamp);
    }
    
    return success;
}

bool RedisClient::isPurchasedToday(const std::string& symbol) {
    return sismember("movers:purchased_today", symbol);
}

void RedisClient::clearPurchasedToday() {
    del("movers:purchased_today");
}

bool RedisClient::setApiSelection(const std::string& api_name) {
    return set("movers:api_selected", api_name, 3600); // 1 hour TTL
}

std::string RedisClient::getApiSelection() {
    return get("movers:api_selected");
}

std::string RedisClient::getLastError() const {
    return last_error_;
}

void RedisClient::clearError() {
    last_error_.clear();
}

void RedisClient::handleError() {
    if (redis_context_ && redis_context_->err) {
        last_error_ = redis_context_->errstr;
    } else {
        last_error_ = "Unknown Redis error";
    }
}

} // namespace hft
