cmake_minimum_required(VERSION 3.15)
project(hft_engine)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3 -march=native -Wall -Wextra -pthread")

# Find required packages
find_package(PkgConfig REQUIRED)
pkg_check_modules(ZMQ REQUIRED libzmq)
find_package(Threads REQUIRED)
find_package(CURL REQUIRED)

# Find hiredis for Redis support
find_library(HIREDIS_LIB hiredis)
if(NOT HIREDIS_LIB)
    message(FATAL_ERROR "hiredis library not found. Please install libhiredis-dev")
endif()

# Include nlohmann/json header-only library
include(FetchContent)
FetchContent_Declare(json URL https://github.com/nlohmann/json/releases/download/v3.11.3/json.tar.xz)
FetchContent_MakeAvailable(json)

# Include directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${ZMQ_INCLUDE_DIRS}
    ${CURL_INCLUDE_DIRS}
)

# Source files
set(SOURCES
    src/main.cpp
    src/order_book.cpp
    src/execution_engine.cpp
    src/alpaca_client.cpp
    src/polygon_client.cpp
    src/movers_strategy.cpp
    src/api_benchmark.cpp
    src/redis_client.cpp
)

# Executable
add_executable(hft_engine ${SOURCES})

# Link libraries
target_link_libraries(hft_engine
    ${ZMQ_LIBRARIES}
    ${CMAKE_THREAD_LIBS_INIT}
    ${CURL_LIBRARIES}
    ${HIREDIS_LIB}
    nlohmann_json::nlohmann_json
)

