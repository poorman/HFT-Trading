# Multi-stage build for Go backend
FROM golang:1.21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git gcc musl-dev zeromq-dev

WORKDIR /app

# Copy source code first
COPY . .

# Initialize go modules
RUN go mod tidy && go mod download

# Build
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o hft-api .

# Runtime stage
FROM alpine:latest

# Install runtime dependencies
RUN apk add --no-cache ca-certificates zeromq

WORKDIR /root/

# Copy binary
COPY --from=builder /app/hft-api .

# Expose API port
EXPOSE 8080

# Run
CMD ["./hft-api"]

