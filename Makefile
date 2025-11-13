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
	@echo "  make build            - Build frontend and create deployment package"
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
# Environment variables are embedded at build time
# Usage: make build GOOGLE_MAPS_API_KEY=xxx LOC_API_TOKEN=xxx
build:
	@echo "🏗️  Building frontend for production..."
	@echo "📋 Environment variables:"
	@echo "   REACT_APP_GOOGLE_MAPS_API_KEY: $${REACT_APP_GOOGLE_MAPS_API_KEY:-[not set]}"
	@echo "   REACT_APP_LOC_API_TOKEN: $${REACT_APP_LOC_API_TOKEN:-[not set]}"
	@echo "   REACT_APP_LOC_API_BASEURL: $${REACT_APP_LOC_API_BASEURL:-https://mytrips-api.bahar.co.il/location/api}"
	@echo "   REACT_APP_MYTRIPS_API_BASEURL: $${REACT_APP_MYTRIPS_API_BASEURL:-https://mytrips-api.bahar.co.il}"
	@echo ""
	@bash -c "source ~/.zshrc 2>/dev/null || true; \
		NODE_ENV=production \
		REACT_APP_LOC_API_BASEURL=$${REACT_APP_LOC_API_BASEURL:-https://mytrips-api.bahar.co.il/location/api} \
		REACT_APP_MYTRIPS_API_BASEURL=$${REACT_APP_MYTRIPS_API_BASEURL:-https://mytrips-api.bahar.co.il} \
		npm run build"
	@echo "📄 Copying .htaccess to build directory..."
	@cp .htaccess build/.htaccess
	@echo ""
	@echo "📦 Creating deployment package..."
	@TIMESTAMP=$$(date +%Y%m%d-%H%M%S); \
	PACKAGE_NAME="mytrips-viewer-$$TIMESTAMP.tar.gz"; \
	COPYFILE_DISABLE=1 tar --exclude='._*' --exclude='.DS_Store' --exclude='__MACOSX' --exclude='.Spotlight-V100' --exclude='.Trashes' -czf "$$PACKAGE_NAME" -C build . && \
	echo "✅ Build complete!" && \
	echo "" && \
	echo "📁 Build directory: ./build/" && \
	echo "📦 Deployment package: $$PACKAGE_NAME" && \
	echo "" && \
	echo "Package contents:" && \
	tar -tzf "$$PACKAGE_NAME" | head -20 && \
	if [ $$(tar -tzf "$$PACKAGE_NAME" | wc -l) -gt 20 ]; then \
		echo "... and $$(($$(tar -tzf "$$PACKAGE_NAME" | wc -l) - 20)) more files"; \
	fi && \
	echo "" && \
	PACKAGE_SIZE=$$(du -h "$$PACKAGE_NAME" | cut -f1) && \
	echo "📊 Package size: $$PACKAGE_SIZE" && \
	echo "" && \
	echo "🚀 Deploy with:" && \
	echo "   scp $$PACKAGE_NAME user@www.bahar.co.il:/tmp/" && \
	echo "   ssh user@www.bahar.co.il" && \
	echo "   cd /path/to/mytrips-viewer && tar -xzf /tmp/$$PACKAGE_NAME"

# Clean build artifacts and caches
clean:
	@echo "🧹 Cleaning build artifacts..."
	@rm -rf build/
	@rm -f mytrips-viewer-*.tar.gz
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

