.PHONY: help install install-backend install-frontend dev dev-backend dev-frontend build clean stop docker-build docker-up docker-down docker-logs prod-backend

# Default target
help:
	@echo "Available commands:"
	@echo ""
	@echo "Development:"
	@echo "  make install          - Install all dependencies (frontend + backend)"
	@echo "  make install-backend  - Install backend dependencies"
	@echo "  make install-frontend - Install frontend dependencies"
	@echo "  make dev              - Start both frontend and backend in development mode"
	@echo "  make dev-backend      - Start backend only"
	@echo "  make dev-frontend     - Start frontend only"
	@echo ""
	@echo "Production:"
	@echo "  make build            - Build frontend for production"
	@echo "  make prod-backend     - Run backend with Gunicorn (production)"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build     - Build Docker images"
	@echo "  make docker-up        - Start containers with Docker Compose"
	@echo "  make docker-down      - Stop and remove containers"
	@echo "  make docker-logs      - View container logs"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean            - Clean build artifacts and caches"
	@echo "  make stop             - Stop all running services"

# Install all dependencies
install: install-backend install-frontend
	@echo "✅ All dependencies installed!"

# Install backend dependencies
install-backend:
	@echo "📦 Installing backend dependencies..."
	@cd backend && python3 -m venv venv
	@cd backend && . venv/bin/activate && pip install -r requirements.txt
	@echo "✅ Backend dependencies installed!"

# Install frontend dependencies
install-frontend:
	@echo "📦 Installing frontend dependencies..."
	@bash -c "source ~/.zshrc 2>/dev/null || true; npm install --legacy-peer-deps"
	@echo "✅ Frontend dependencies installed!"

# Start both frontend and backend in development mode
dev:
	@echo "🚀 Starting development servers..."
	@echo "Backend will run on http://localhost:8000"
	@echo "Frontend will run on http://localhost:3000"
	@echo ""
	@echo "Press Ctrl+C to stop all services"
	@echo ""
	@trap 'kill 0' INT; \
	(cd backend && . venv/bin/activate && uvicorn server:app --reload --host 127.0.0.1 --port 8000) & \
	bash -c "source ~/.zshrc 2>/dev/null || true; npm start"

# Start backend only
dev-backend:
	@echo "🚀 Starting backend server on http://localhost:8000..."
	@cd backend && . venv/bin/activate && uvicorn server:app --reload --host 127.0.0.1 --port 8000

# Start frontend only
dev-frontend:
	@echo "🚀 Starting frontend server on http://localhost:3000..."
	@bash -c "source ~/.zshrc 2>/dev/null || true; npm start"

# Build frontend for production
build:
	@echo "🏗️  Building frontend for production..."
	@bash -c "source ~/.zshrc 2>/dev/null || true; npm run build"
	@echo "✅ Build complete! Files are in ./build/"

# Clean build artifacts and caches
clean:
	@echo "🧹 Cleaning build artifacts..."
	@rm -rf build/
	@rm -rf node_modules/.cache/
	@rm -rf backend/__pycache__/
	@rm -rf backend/*.pyc
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@echo "✅ Cleaned!"

# Stop all running services
stop:
	@echo "🛑 Stopping all services..."
	@pkill -f "uvicorn server:app" || true
	@pkill -f "gunicorn server:app" || true
	@pkill -f "react-scripts start" || true
	@pkill -f "node.*react-scripts" || true
	@echo "✅ All services stopped!"

# Run backend with Gunicorn (production)
prod-backend:
	@echo "🚀 Starting backend in production mode with Gunicorn..."
	@echo "Backend will run on http://0.0.0.0:8000"
	@echo ""
	@if ! command -v gunicorn &> /dev/null; then \
		echo "⚠️  Gunicorn not found. Installing..."; \
		cd backend && . venv/bin/activate && pip install gunicorn; \
	fi
	@cd backend && . venv/bin/activate && gunicorn server:app \
		--workers 4 \
		--worker-class uvicorn.workers.UvicornWorker \
		--bind 0.0.0.0:8000 \
		--access-logfile - \
		--error-logfile -

# Docker commands
docker-build:
	@echo "🐳 Building Docker images..."
	@docker-compose build
	@echo "✅ Docker images built!"

docker-up:
	@echo "🐳 Starting containers with Docker Compose..."
	@docker-compose up -d
	@echo "✅ Containers started!"
	@echo ""
	@echo "Frontend: http://localhost:80"
	@echo "Backend:  http://localhost:8000"
	@echo ""
	@echo "View logs: make docker-logs"

docker-down:
	@echo "🐳 Stopping and removing containers..."
	@docker-compose down
	@echo "✅ Containers stopped!"

docker-logs:
	@echo "📋 Viewing container logs (Ctrl+C to exit)..."
	@docker-compose logs -f

