# MyTrips Viewer UI - Real-time Location Tracking Dashboard

A modern, full-stack web application for real-time location tracking and route monitoring with an interactive Google Maps interface. Track users, view their current locations, and visualize their route history.

## ✨ Features

- 🗺️ **Interactive Google Maps** - Real-time location tracking with AdvancedMarkerElement
- 👥 **User Management** - View and track multiple users
- 📍 **Live Location** - Display current user positions on the map with live tracking toggle
- 🛣️ **Route History** - Visualize historical routes with flexible time range selection
- 🐛 **Debug Mode** - Built-in API debugging with CURL command generation and response logging
- 🔐 **Secure Authentication** - Integration with MyTrips API and Location API
- 🎨 **Modern UI** - Built with React, Tailwind CSS, and Radix UI components
- 🐳 **Docker Ready** - Easy deployment with Docker Compose
- 📱 **Responsive Design** - Works on desktop and mobile devices
- ⚡ **Smart Caching** - Intelligent endpoint selection for optimal performance

## 🏗️ Architecture

- **Frontend**: React 19 with Tailwind CSS, Google Maps JavaScript API
- **Backend**: FastAPI (Python 3.9+) with async HTTP client (optional - for local development)
- **Authentication**: Direct integration with MyTrips API (`https://mytrips-api.bahar.co.il`)
- **Location Data**: Direct integration with Location API (`https://www.bahar.co.il/location/api`)
- **Deployment**: Static hosting (Apache/Nginx) - no backend required for production

### API Architecture

The application uses **two separate APIs**:

1. **MyTrips API** (`https://mytrips-api.bahar.co.il`)
   - **Purpose**: User authentication
   - **Endpoint**: `/auth/app-login`
   - **Called by**: Frontend directly

2. **Location API** (`https://www.bahar.co.il/location/api`)
   - **Purpose**: User locations, route history, live tracking
   - **Endpoints**:
     - `/users.php` - Get list of users
     - `/live/latest.php` - Get latest location (with `all`, `max_age`, `include_inactive` params)
     - `/live/stream.php` - Stream location updates (cursor-based polling)
     - `/live/history.php` - Get cached location history (fast, for recent data)
     - `/locations.php` - Get location history from database (for date ranges)
   - **Authentication**: Both `Authorization: Bearer {LOC_API_TOKEN}` and `X-API-Token: {LOC_API_TOKEN}`
   - **Called by**: Frontend directly
   - **Documentation**: See [Location API OpenAPI Spec](docs/location-api-openapi.yaml) and [Swagger UI](docs/location-api-swagger.html)

**Note**: The backend (`backend/server.py`) is **optional** and only needed for local development. In production, the frontend calls both APIs directly.

## 📋 Prerequisites

- **Node.js** 18+ and npm/yarn
- **Python** 3.9+
- **Google Maps API Key** - [Get one here](https://console.cloud.google.com/apis/credentials)
- **Make** (optional - for using Makefile commands)
- **Docker** (optional - for containerized deployment)

## 🚀 Quick Start (Development)

### Option 1: Using Make (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/AdarBahar/mytrips-viewer-ui.git
cd mytrips-viewer-ui

# 2. Install all dependencies
make install

# 3. Configure environment (first time only)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit .env files with your API keys and configuration

# 4. Start both frontend and backend
make dev
```

That's it! The application will start:
- **Backend API**: http://localhost:8000
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs

**Available Make commands:**
```bash
make help              # Show all available commands
make install           # Install all dependencies
make dev               # Start both frontend and backend
make dev-backend       # Start backend only
make dev-frontend      # Start frontend only
make build             # Build frontend for production
make prod-backend      # Run backend with Gunicorn (production)
make docker-build      # Build Docker images
make docker-up         # Start with Docker Compose
make docker-down       # Stop Docker containers
make clean             # Clean build artifacts
make stop              # Stop all services
```

### Option 2: Manual Setup

#### Step 1: Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Start backend server
uvicorn server:app --reload --host 127.0.0.1 --port 8000
```

#### Step 2: Frontend Setup (in a new terminal)

```bash
# From project root
npm install

# Configure environment
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your configuration

# Start development server
npm start
```

### 🎯 Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### 🔑 Authentication

The application integrates with **MyTrips API** for authentication:

- **Production**: Uses real MyTrips API credentials
- **Development**: Can use mock mode for testing

**Mock Mode Login** (when `MOCK_AUTH_ENABLED="true"`):
- **Email**: `adar.bahar@gmail.com`
- **Password**: `admin123`

> 📖 **Full Documentation**: See [AUTHENTICATION.md](./AUTHENTICATION.md) for complete authentication guide.

## 🐛 Debug Mode

The application includes a built-in debug mode for troubleshooting API calls:

1. **Enable Debug Mode**: Toggle the debug switch in the Route Tracker card (next to the user info)
2. **View API Calls**: Open browser console (F12) to see detailed logs
3. **CURL Commands**: Each API call logs an executable CURL command for testing
4. **Response Data**: Full API responses are logged with status codes and data

**Debug Output Example**:
```
🌐 API Call: Initialize Live Tracking
  📤 CURL Command:
  curl -X GET 'https://www.bahar.co.il/location/api/live/latest.php?user=Adar&all=false&max_age=3600&include_inactive=false' \
    -H 'Authorization: Bearer {token}' \
    -H 'X-API-Token: {token}' \
    -H 'Accept: application/json'

🌐 API Response: Initialize Live Tracking
  📥 Status: 200
  📥 Response Data: {status: "success", data: {...}}
  📊 Locations Count: 1
  📍 Latest Location: {...}
```

**Debugged API Calls**:
- Fetch Users (`/users.php`)
- Initialize Live Tracking (`/live/latest.php`)
- Poll Live Stream (`/live/stream.php`)
- Fetch Route History - Cache (`/live/history.php`)
- Fetch Route History - Database (`/locations.php`)

## 🔐 Security Configuration

### ⚠️ IMPORTANT: Before Deployment

1. **JWT Secret**: Generate a strong secret key
   ```bash
   openssl rand -hex 32
   ```
   Add this to `backend/.env` as `JWT_SECRET`

2. **Location API Token**:
   - Obtain your token from the Location API provider
   - Add to `backend/.env` as `LOC_API_TOKEN`

3. **Google Maps API Key**:
   - Get your key at: https://console.cloud.google.com/apis/credentials
   - Enable **Maps JavaScript API**
   - **Restrict the key** to your domain in Google Cloud Console
   - Add to `frontend/.env` as `REACT_APP_GOOGLE_MAPS_API_KEY`

4. **CORS Origins**:
   - In production, set `CORS_ORIGINS` to your specific domain(s)
   - Example: `CORS_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"`

5. **Mock Authentication**:
   - Set `MOCK_AUTH_ENABLED="false"` in production
   - Set `MOCK_AUTH_ENABLED="true"` for development/testing

6. **Environment Files**:
   - ⚠️ **NEVER commit `.env` files to version control**
   - Use `.env.example` files as templates
   - All `.env` files are in `.gitignore` for safety

> 📖 **Security Guide**: See [SECURITY.md](./SECURITY.md) for detailed security best practices.

## 🛠️ Development Workflow

### Starting Services

```bash
# Start both frontend and backend
make dev

# Or start individually
make dev-backend    # Backend only
make dev-frontend   # Frontend only
```

### Making Changes

The development servers support hot reload:
- **Frontend**: Changes to React components will auto-refresh
- **Backend**: Changes to Python files will auto-restart the server

### Stopping Services

```bash
# Stop all services
make stop

# Or press Ctrl+C in the terminal running `make dev`
```

### Building for Production

```bash
# Build frontend and create deployment package
make build
```

This will:
- Set `NODE_ENV=production` to load `.env.production`
- Build the optimized production bundle
- Copy `.htaccess` file to build directory
- Create a timestamped `.tar.gz` deployment package
- Display deployment instructions

**Output:**
```
✅ Build complete!
📁 Build directory: ./build/
📦 Deployment package: mytrips-viewer-20251027-175614.tar.gz
📊 Package size: 1.6M
```

**Deploy the package:**
```bash
# Upload to server
scp mytrips-viewer-*.tar.gz user@www.bahar.co.il:/tmp/

# SSH and extract
ssh user@www.bahar.co.il
cd /var/www/bahar.co.il/mytrips-viewer
tar -xzf /tmp/mytrips-viewer-*.tar.gz
```

**Important Notes:**
- ✅ **No backend required** for production - frontend calls external APIs directly
- ✅ `.htaccess` file is automatically included in the build
- ✅ Environment variables from `.env.production` are embedded at build time
- ✅ Package excludes macOS metadata files (`._*`, `.DS_Store`)

**For local development with backend:**
```bash
make prod-backend  # Run backend with Gunicorn (optional)
```

**Or use Docker:**
```bash
make docker-build
make docker-up
```

> 📖 **Deployment Guide**: See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete production deployment instructions
> 📖 **Bahar.co.il Deployment**: See [DEPLOYMENT_BAHAR.md](./DEPLOYMENT_BAHAR.md) for www.bahar.co.il specific instructions

## 📁 Project Structure

```
mytrips-viewer-ui/
├── frontend/                      # React frontend application
│   ├── src/
│   │   ├── components/           # React components
│   │   │   ├── Login.js         # Authentication UI
│   │   │   └── MapDashboard.js  # Main map interface
│   │   ├── services/            # API services
│   │   ├── hooks/               # Custom React hooks
│   │   ├── App.js
│   │   └── index.js
│   ├── public/
│   │   └── vendor/              # Local fonts and assets
│   ├── Dockerfile               # Frontend Docker image
│   ├── nginx.conf               # Nginx configuration
│   ├── .env.example             # Frontend environment template
│   └── package.json
├── backend/                      # FastAPI backend
│   ├── server.py                # Main server file
│   ├── Dockerfile               # Backend Docker image
│   ├── .env.example             # Backend environment template
│   ├── .env.production.example  # Production env template
│   ├── requirements.txt         # Python dependencies
│   ├── test_location_api.py     # Location API tests
│   └── venv/                    # Virtual environment (created on install)
├── build/                        # Production build output (gitignored)
├── docker-compose.yml            # Docker orchestration
├── Makefile                      # Development & deployment commands
├── craco.config.js               # Create React App configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── package.json                  # Root package.json
├── .gitignore                    # Git ignore rules (protects secrets)
├── README.md                     # This file
├── DEPLOYMENT.md                 # Production deployment guide
├── DEPLOYMENT_CHECKLIST.md       # Deployment checklist
├── AUTHENTICATION.md             # Authentication documentation
├── SECURITY.md                   # Security guidelines
└── CLEANUP_SUMMARY.md            # Cleanup changelog
```

## 🌐 API Endpoints

### Production APIs (called by frontend directly)

#### MyTrips API (`https://mytrips-api.bahar.co.il`)
- `POST /auth/app-login` - Authenticate user with email/password

#### Location API (`https://www.bahar.co.il/location/api`)
- `GET /users.php` - Get list of users with location data
- `GET /locations.php` - Get location history for a user
- `GET /driving-records.php` - Get driving records

### Local Development Backend (optional)

The backend (`backend/server.py`) is only used for local development:

- `POST /auth/app-login` - Proxy to MyTrips API for authentication
- `GET /users` - Proxy to Location API for users
- `GET /location/{user_id}` - Proxy to Location API for user location
- `GET /history/{user_id}` - Proxy to Location API for location history
- `GET /health` - Health check endpoint

### Users
- `GET /api/users` - Get all users with location data (from Location API)

### Location Tracking
- `GET /api/location/{user_id}` - Get user's current location
- `GET /api/history/{user_id}` - Get user's route history
  - Query params: `limit`, `date_from`, `date_to`

### External API Integrations
- **MyTrips API** - User authentication
- **Location API** - User locations, history, and driving records

> 📖 **API Documentation**: Visit http://localhost:8000/docs when running the backend

## 🐛 Troubleshooting

### Services won't start

**Backend errors:**
```bash
# Check if virtual environment is activated
cd backend
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

**Frontend errors:**
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
```

### CORS Errors
- Check `CORS_ORIGINS` in `backend/.env`
- Ensure it includes `http://localhost:3000` for development

### Google Maps Not Loading
- Verify `REACT_APP_GOOGLE_MAPS_API_KEY` is set in `frontend/.env`
- Check API key is valid in Google Cloud Console
- Ensure Maps JavaScript API is enabled

### Authentication Errors
- Check `JWT_SECRET` is set in `backend/.env`
- Verify `MOCK_AUTH_ENABLED="true"` for development
- Clear browser localStorage and try again

### Port Already in Use

**Backend (port 8000):**
```bash
# Find and kill process using port 8000
lsof -ti:8000 | xargs kill -9
```

**Frontend (port 3000):**
```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

Or use:
```bash
make stop
```

## 📚 Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete production deployment guide
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Step-by-step deployment checklist
- **[AUTHENTICATION.md](AUTHENTICATION.md)** - Authentication system documentation
- **[SECURITY.md](SECURITY.md)** - Security guidelines and best practices
- **[CLEANUP_SUMMARY.md](CLEANUP_SUMMARY.md)** - Detailed changelog of cleanup work
- **Backend API Docs** - http://localhost:8000/docs (interactive API documentation)

## 🚀 Deployment

This application is production-ready and can be deployed using:

- **Docker** - Containerized deployment with Docker Compose
- **Static Hosting** - Frontend on Netlify/Vercel + Backend on VPS
- **VPS** - Traditional server deployment with Nginx
- **Cloud Platforms** - AWS, Google Cloud, Azure, etc.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📖 API Documentation

### Location API

The Location API provides real-time location tracking and historical route data.

**OpenAPI Specification**:
- **YAML**: [docs/location-api-openapi.yaml](docs/location-api-openapi.yaml)
- **JSON**: [docs/location-api-openapi.json](docs/location-api-openapi.json)
- **Swagger UI**: [docs/location-api-swagger.html](docs/location-api-swagger.html)

**Key Endpoints**:

| Endpoint | Method | Description | Parameters |
|----------|--------|-------------|------------|
| `/users.php` | GET | Get list of users | `with_location_data`, `include_counts`, `include_metadata` |
| `/live/latest.php` | GET | Get latest location | `user`, `all`, `max_age`, `include_inactive` |
| `/live/stream.php` | GET | Stream location updates | `user`, `since` |
| `/live/history.php` | GET | Get cached history (fast) | `user`, `duration`, `limit`, `offset` |
| `/locations.php` | GET | Get database history | `user`, `date_from`, `date_to`, `limit`, `offset` |

**Authentication**: All endpoints require both headers:
- `Authorization: Bearer {LOC_API_TOKEN}`
- `X-API-Token: {LOC_API_TOKEN}`

**Recent Changes** (v1.0.0):
- ✨ Added `all` parameter to `/live/latest.php` (default: `false`)
- ✨ Added `include_inactive` parameter to `/live/latest.php` (default: `false`)
- 🐛 Added debug mode with CURL command generation
- ⚡ Improved endpoint selection logic for optimal performance

## 📄 License

This project is private and proprietary.

## 🙏 Acknowledgments

- Built with [React](https://react.dev/)
- Powered by [FastAPI](https://fastapi.tiangolo.com/)
- Maps by [Google Maps Platform](https://developers.google.com/maps)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)

---

**Last Updated:** 2025-10-27
**Version:** 1.0.0

**Note**: This application has been cleaned and optimized for security. All third-party tracking and analytics have been removed.
