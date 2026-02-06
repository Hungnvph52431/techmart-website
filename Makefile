# Makefile for TechMart Docker Management

.PHONY: help dev prod down logs clean build restart

# Default target
help:
	@echo "TechMart Docker Commands:"
	@echo "  make dev        - Start development environment"
	@echo "  make prod       - Start production environment"
	@echo "  make down       - Stop all services"
	@echo "  make logs       - View all logs"
	@echo "  make clean      - Remove all containers and volumes"
	@echo "  make build      - Rebuild all containers"
	@echo "  make restart    - Restart all services"
	@echo "  make status     - Show services status"
	@echo "  make db-shell   - Access MySQL shell"
	@echo "  make db-backup  - Backup database"

# Development
dev:
	@echo "🚀 Starting development environment..."
	docker compose up -d
	@echo "✅ Services started!"
	@echo "📱 Frontend: http://localhost:5173"
	@echo "🔧 Backend: http://localhost:5001"
	@echo "💾 MySQL: localhost:3306"

# Production
prod:
	@echo "🚀 Starting production environment..."
	docker compose -f docker-compose.prod.yml up -d
	@echo "✅ Production services started!"

# Stop services
down:
	@echo "⏸️  Stopping services..."
	docker compose down

# View logs
logs:
	docker compose logs -f

# View logs for specific service
logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

logs-mysql:
	docker compose logs -f mysql

# Clean everything
clean:
	@echo "🧹 Cleaning up..."
	docker compose down -v
	@echo "✅ Cleanup complete!"

# Rebuild containers
build:
	@echo "🔨 Rebuilding containers..."
	docker compose up -d --build
	@echo "✅ Rebuild complete!"

# Restart services
restart:
	@echo "🔄 Restarting services..."
	docker compose restart
	@echo "✅ Services restarted!"

# Restart specific service
restart-backend:
	docker compose restart backend

restart-frontend:
	docker compose restart frontend

restart-mysql:
	docker compose restart mysql

# Show status
status:
	docker compose ps

# Database shell
db-shell:
	docker compose exec mysql mysql -u techmart_user -ptechmart123 techmart_db

# Database backup
db-backup:
	@echo "💾 Backing up database..."
	docker compose exec mysql mysqldump -u techmart_user -ptechmart123 techmart_db > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup complete!"

# Install dependencies
install:
	cd backend && npm install
	cd frontend && npm install

# Development without Docker
dev-local:
	@echo "🚀 Starting local development..."
	@echo "Starting backend in background..."
	cd backend && npm run dev &
	@echo "Starting frontend..."
	cd frontend && npm run dev
