# MyTrips Viewer UI - Project Context

**Repository:** [AdarBahar/mytrips-viewer-ui](https://github.com/AdarBahar/mytrips-viewer-ui)  
**URL:** https://github.com/AdarBahar/mytrips-viewer-ui

---

## 📋 Project Overview

MyTrips Viewer UI is a real-time location tracking and route visualization application built with React and FastAPI. It displays live location updates via Server-Sent Events (SSE) and provides fallback to last known location when live data is unavailable.

**Key Features:**
- 🗺️ Real-time location tracking with Google Maps
- 📡 SSE (Server-Sent Events) for live updates
- 🔄 Automatic fallback to last known location
- 🔐 JWT-based authentication
- 🎨 Responsive UI with Tailwind CSS
- 📊 Route history visualization

---

## 🏗️ Architecture

### Frontend Stack
- **Framework:** React 19 with Create React App
- **Styling:** Tailwind CSS + custom CSS
- **Maps:** Google Maps JavaScript API
- **HTTP Client:** Axios
- **Notifications:** Sonner (toast library)
- **Icons:** Lucide React

### Backend Stack (Optional for Production)
- **Framework:** FastAPI (Python 3.9+)
- **Server:** Uvicorn (dev) / Gunicorn (prod)
- **Database:** MongoDB (optional, with Motor async driver)
- **Authentication:** JWT tokens with bcrypt password hashing
- **HTTP Client:** httpx (async)

### External APIs
- **MyTrips API:** `https://mytrips-api.bahar.co.il` - Authentication & user management
- **Location API:** `https://www.bahar.co.il/location/api` - Location data & history

---

## 🔄 Recent Work (PR #5)

### Last Known Location Feature
**Status:** ✅ Completed & Merged (PR #5)

**What was implemented:**
1. **Automatic Fallback Logic**
   - When SSE stops sending current location (20-second grace period)
   - App fetches last known location with `include_inactive: true`
   - Displays with visual distinction (gray marker vs red)

2. **UI Enhancements**
   - "Live Location - Not Available" header when showing last known
   - "Last Known Location" badge with timestamp
   - "Last seen X minutes ago" indicator
   - Pulsing animation for live markers only

3. **Bug Fixes**
   - Fixed React error #185 (missing useCallback dependencies)
   - Created `getLocationApiHeaders()` helper function
   - Proper timer cleanup on unmount

**Files Modified:**
- `frontend/src/components/MapDashboard.js` (194 insertions, 25 deletions)
- `frontend/src/components/MapDashboard.css` (pulse animation)

---

## 🚀 Build & Deployment

### Build Process
```bash
# Development
npm install
npm start

# Production
make build  # Reads from frontend/.env.production
```

**Key Points:**
- Environment variables embedded at build time (not runtime)
- Build output: `./build/` directory
- Deployment package: `mytrips-viewer-*.tar.gz`

### Production Environments

**Frontend Deployment:**
- Static hosting (Apache/Nginx) - no backend required
- Deployed to: `https://www.bahar.co.il/mytrips-viewer/`
- Environment: `frontend/.env.production`

**Backend Deployment (Optional):**
- Docker container or systemd service
- Gunicorn with 4 workers
- Port: 8000
- Health check: Every 30 seconds

**Deployment Guides:**
- See `docs/DEPLOYMENT.md` - General deployment guide
- See `docs/DEPLOYMENT_BAHAR.md` - www.bahar.co.il specific
- See `DEPLOYMENT_CHECKLIST.md` - Pre-deployment checklist

---

## 📚 Key Documentation References

### Architecture & Design
- `README.md` - Project overview & quick start
- `ARCHITECTURE_SUMMARY.md` - System architecture
- `API_ARCHITECTURE_UPDATED.md` - API integration details
- `SSE_ARCHITECTURE.md` - SSE implementation details

### Implementation Guides
- `BACKEND_SSE_ENDPOINT_SPEC.md` - SSE proxy endpoint specification
- `LOGIN_FLOW_DOCUMENTATION.md` - Authentication flow
- `TIMESTAMP_UTILITIES_USAGE.md` - Timestamp handling
- `CONSOLE_LOG_REFERENCE.md` - Debug logging guide

### Deployment & Operations
- `docs/DEPLOYMENT.md` - Complete deployment guide
- `docs/DEPLOYMENT_BAHAR.md` - Bahar.co.il deployment
- `BUILD_PROCESS_DOCUMENTATION.md` - Build process details
- `SECURITY.md` - Security guidelines

---

## 📝 Tasks Completed

✅ **Phase 1: Core Setup**
- React + Tailwind CSS setup
- Google Maps integration
- Authentication system (JWT)

✅ **Phase 2: SSE Implementation**
- SSE proxy endpoint in backend
- Live location streaming
- Real-time marker updates

✅ **Phase 3: Last Known Location**
- Fallback logic when SSE unavailable
- Visual distinction (red vs gray)
- Timestamp & time-ago display
- React hook dependency fixes

✅ **Phase 4: Security & Cleanup**
- Removed hardcoded secrets from git history
- Configured CORS properly
- Environment variable management

---

## 🔮 Tasks Remaining

### High Priority
- [ ] Add unit tests for MapDashboard component
- [ ] Add integration tests for SSE connection
- [ ] Performance optimization for large location datasets
- [ ] Implement location history caching

### Medium Priority
- [ ] Add user preferences (map style, update frequency)
- [ ] Implement location sharing features
- [ ] Add offline mode support
- [ ] Enhance error handling & retry logic

### Low Priority
- [ ] Dark mode support
- [ ] Mobile app version (React Native)
- [ ] Advanced analytics dashboard
- [ ] Multi-language support

---

## 🔗 Related Documentation

**Quick References:**
- `API_QUICK_REFERENCE.md` - API endpoints summary
- `QUICK_REFERENCE.md` - Common commands
- `DEVELOPER_QUICK_START.md` - Dev setup guide

**Troubleshooting:**
- `SSE_DEBUGGING_GUIDE.md` - SSE issues
- `DEBUGGING_QUICK_START.md` - General debugging
- `SECURITY_INCIDENT_REMEDIATION.md` - Security fixes

---

## 🛠️ Development Workflow

### Local Development
```bash
# Backend
cd backend && python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload

# Frontend (new terminal)
npm install
npm start
```

### Testing
```bash
npm test              # Frontend tests
pytest backend/       # Backend tests
```

### Deployment
```bash
make build            # Build production bundle
make docker-build     # Build Docker image
make docker-up        # Run Docker container
```

---

## 📊 Current Status

- **Branch:** `code-review/non-backend-fixes`
- **Latest PR:** #5 - Last known location feature
- **Build Status:** ✅ Passing
- **Production:** ✅ Deployed to www.bahar.co.il

---

**Last Updated:** 2025-12-14  
**Maintained by:** Adar Bahar

