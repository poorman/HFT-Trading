# Multi-stage build for C++ engine
FROM ubuntu:22.04 AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libzmq3-dev \
    libcurl4-openssl-dev \
    libhiredis-dev \
    pkg-config \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy source files
COPY CMakeLists.txt /app/
COPY include/ /app/include/
COPY src/ /app/src/

# Build
RUN mkdir build && cd build && \
    cmake .. && \
    make -j$(nproc)

# Runtime stage
FROM ubuntu:22.04

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libzmq5 \
    libcurl4 \
    libhiredis0.14 \
    && rm -rf /var/lib/apt/lists/*

# Copy built executable
COPY --from=builder /app/build/hft_engine /usr/local/bin/

# Expose ZeroMQ port
EXPOSE 5555

# Run engine
CMD ["hft_engine"]

