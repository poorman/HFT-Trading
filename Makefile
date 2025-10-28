.PHONY: help build up down restart logs ps clean test backup restore health

# Default target
help:
	@echo "HFT Trading System - Make Commands"
	@echo "===================================="
	@echo ""
	@echo "  make build       - Build all Docker images"
	@echo "  make up          - Start all services"
	@echo "  make down        - Stop all services"
	@echo "  make restart     - Restart all services"
	@echo "  make logs        - View logs (all services)"
	@echo "  make logs-engine - View engine logs"
	@echo "  make logs-backend- View backend logs"
	@echo "  make logs-frontend - View frontend logs"
	@echo "  make ps          - Show running containers"
	@echo "  make clean       - Remove all containers and volumes"
	@echo "  make test        - Run tests"
	@echo "  make backup      - Backup database"
	@echo "  make restore     - Restore database from backup"
	@echo "  make health      - Check system health"
	@echo "  make metrics     - View Prometheus metrics"
	@echo "  make grafana     - Open Grafana dashboard"
	@echo ""

# Build all images
build:
	@echo "Building Docker images..."
	docker-compose build

# Start services
up:
	@echo "Starting HFT services..."
	docker-compose up -d
	@echo "Waiting for services to be ready..."
	@sleep 5
	@make health

# Stop services
down:
	@echo "Stopping HFT services..."
	docker-compose down

# Restart services
restart:
	@echo "Restarting HFT services..."
	docker-compose restart
	@make health

# View logs
logs:
	docker-compose logs -f

logs-engine:
	docker logs -f hft-engine

logs-backend:
	docker logs -f hft-backend

logs-frontend:
	docker logs -f hft-frontend

# Show running containers
ps:
	docker-compose ps

# Clean up
clean:
	@echo "Removing all HFT containers and volumes..."
	@read -p "Are you sure? This will delete all data! (y/N): " confirm && \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		docker-compose down -v; \
		echo "Cleanup complete."; \
	else \
		echo "Cleanup cancelled."; \
	fi

# Run tests (placeholder - implement actual tests)
test:
	@echo "Running tests..."
	@echo "Backend tests:"
	cd backend && go test ./... -v || true
	@echo "Frontend tests:"
	cd frontend && npm test || true

# Backup database
backup:
	@echo "Backing up HFT database..."
	@mkdir -p backups
	@timestamp=$$(date +%Y%m%d_%H%M%S); \
	docker exec a39c456f9738_local_pgdb pg_dump -U pbieda hft_trading > backups/hft_trading_$$timestamp.sql && \
	echo "Backup created: backups/hft_trading_$$timestamp.sql"

# Restore database (use: make restore FILE=backup_file.sql)
restore:
	@if [ -z "$(FILE)" ]; then \
		echo "Usage: make restore FILE=backups/hft_trading_YYYYMMDD_HHMMSS.sql"; \
		exit 1; \
	fi
	@echo "Restoring database from $(FILE)..."
	@read -p "This will overwrite current data. Continue? (y/N): " confirm && \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		docker exec -i a39c456f9738_local_pgdb psql -U pbieda hft_trading < $(FILE) && \
		echo "Database restored successfully."; \
	else \
		echo "Restore cancelled."; \
	fi

# Check health
health:
	@echo "Checking system health..."
	@curl -s http://localhost:8082/health | python3 -m json.tool || echo "Backend not responding"
	@echo ""
	@echo "Service status:"
	@docker ps --filter "name=hft-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# View Prometheus metrics
metrics:
	@echo "Opening Prometheus metrics..."
	@curl -s http://localhost:8082/metrics | grep "^hft_" || echo "Metrics not available"

# Open Grafana
grafana:
	@echo "Opening Grafana dashboard..."
	@echo "URL: http://178.128.15.57:3002"
	@echo "Dashboard: HFT Trading System"

# Development: rebuild and restart specific service
rebuild-engine:
	docker-compose build hft-engine
	docker-compose up -d hft-engine

rebuild-backend:
	docker-compose build hft-backend
	docker-compose up -d hft-backend

rebuild-frontend:
	docker-compose build hft-frontend
	docker-compose up -d hft-frontend

# Production deployment
deploy:
	@echo "Deploying HFT system to production..."
	@echo "1. Building images..."
	@make build
	@echo "2. Stopping old containers..."
	@docker-compose stop
	@echo "3. Starting new containers..."
	@docker-compose up -d
	@echo "4. Waiting for startup..."
	@sleep 10
	@echo "5. Health check..."
	@make health
	@echo "Deployment complete!"

# Monitor logs in real-time
monitor:
	@echo "Monitoring HFT system logs..."
	docker-compose logs -f --tail=100

# Database shell
db-shell:
	docker exec -it a39c456f9738_local_pgdb psql -U pbieda -d hft_trading

# Redis shell
redis-shell:
	docker exec -it hft-redis redis-cli

# Generate dependency files
deps:
	@echo "Generating dependency lock files..."
	cd backend && go mod tidy && go mod verify
	cd frontend && npm install
	@echo "Dependencies updated."

# Check for security vulnerabilities
security-scan:
	@echo "Scanning for security vulnerabilities..."
	cd frontend && npm audit
	@echo "Note: Run 'npm audit fix' to fix vulnerabilities"

