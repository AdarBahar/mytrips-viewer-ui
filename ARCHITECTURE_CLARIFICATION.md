# Architecture Clarification - Single MyTrips API Server

## 🏗️ Updated Architecture

All APIs have been **consolidated into a single MyTrips API server** at:
```
https://mytrips-api.bahar.co.il
```

---

## 📋 API Structure

### **1. Authentication Endpoints**
**Base URL:** `https://mytrips-api.bahar.co.il`

```
POST   /auth/app-login      - Email-based login
POST   /auth/login          - JWT login
POST   /auth/register       - User registration
GET    /auth/me             - Get current user
```

### **2. Location API Endpoints** (Migrated from Backend Proxy)
**Base URL:** `https://mytrips-api.bahar.co.il/location`

```
GET    /getloc              - Get location data
GET    /driving             - Get driving records
POST   /batch-sync          - Batch sync locations
GET    /api/users           - Get users list
GET    /api/stats           - Get statistics
GET    /api/locations       - Get location history
POST   /api/live/session    - Create live session
DELETE /api/live/session    - Revoke session
GET    /api/live/latest     - Get latest location
GET    /api/live/history    - Get cached history
GET    /api/stream-sse      - SSE stream for live updates
```

---

## 🔗 API Documentation

**Interactive Swagger UI:**
```
https://mytrips-api.bahar.co.il/docs
```

**OpenAPI Schema (JSON):**
```
https://mytrips-api.bahar.co.il/openapi.json
```

---

## 📝 Frontend Configuration

### **Environment Variables** (`.env.production`)

```bash
# Authentication API (no /api prefix)
REACT_APP_MYTRIPS_API_BASEURL=https://mytrips-api.bahar.co.il

# Location API (includes /api prefix)
REACT_APP_LOC_API_BASEURL=https://mytrips-api.bahar.co.il/location/api

# Google Maps
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyAso37mBqnBKwDqQacmx99WgfkW-M9uwLQ

# Backend Proxy (legacy, may be deprecated)
REACT_APP_BACKEND_URL=https://www.bahar.co.il/mytrips-viewer-api
```

---

## 🔐 Authentication Flow

### **App Login (Email-based)**

**Request:**
```bash
curl -X POST https://mytrips-api.bahar.co.il/auth/app-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "adar.bahar@gmail.com",
    "password": "admin123"
  }'
```

**Response:**
```json
{
  "authenticated": true,
  "user_id": "01K5P68329YFSCTV777EB4GM9P",
  "message": "Authentication successful"
}
```

**Token Format:**
```
app-login:{user_id}
```

---

## 📍 Location API Usage

### **Get Users List**
```bash
curl -X GET "https://mytrips-api.bahar.co.il/location/api/users" \
  -H "Authorization: Bearer {token}"
```

### **Create Live Session**
```bash
curl -X POST "https://mytrips-api.bahar.co.il/location/api/live/session" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "user_id": "123",
    "device_ids": [],
    "duration": 3600
  }'
```

### **Get Latest Location**
```bash
curl -X GET "https://mytrips-api.bahar.co.il/location/api/live/latest" \
  -H "Authorization: Bearer {token}"
```

### **SSE Stream for Live Updates**
```bash
curl -X GET "https://mytrips-api.bahar.co.il/location/api/stream-sse" \
  -H "Authorization: Bearer {token}"
```

---

## ✅ Frontend Implementation

### **Authentication Service** (`authService.js`)
```javascript
const MYTRIPS_API_BASEURL = process.env.REACT_APP_MYTRIPS_API_BASEURL;
const API = MYTRIPS_API_BASEURL;

// Endpoints:
// POST ${API}/auth/app-login
// POST ${API}/auth/login
// POST ${API}/auth/register
// GET  ${API}/auth/me
```

### **Location API Client** (`LocationApiClient.js`)
```javascript
const baseUrl = 'https://mytrips-api.bahar.co.il/location/api';

// Endpoints:
// POST ${baseUrl}/live/session
// GET  ${baseUrl}/live/latest
// GET  ${baseUrl}/stream-sse
// etc.
```

---

## 🎯 Key Points

✅ **Single Server** - All APIs at `https://mytrips-api.bahar.co.il`
✅ **Authentication** - Direct endpoints (no `/api` prefix)
✅ **Location API** - Under `/location` path with `/api` prefix
✅ **Complete Documentation** - Available at `/docs` and `/openapi.json`
✅ **Bearer Token Authentication** - Used for all endpoints
✅ **No Backend Proxy Needed** - Direct calls to MyTrips API

---

## 📚 References

- **API Docs:** https://mytrips-api.bahar.co.il/docs
- **OpenAPI Schema:** https://mytrips-api.bahar.co.il/openapi.json
- **Frontend Config:** `.env.production`
- **Auth Service:** `frontend/src/services/authService.js`
- **Location Client:** `frontend/src/services/LocationApiClient.js`

---

**Version:** 1.0
**Date:** November 10, 2025
**Status:** ✅ CLARIFIED

