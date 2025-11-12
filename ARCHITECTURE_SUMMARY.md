# Architecture Summary - MyTrips API Consolidation

## 🎯 Overview

All APIs have been **consolidated into a single MyTrips API server** at `https://mytrips-api.bahar.co.il`

---

## 📊 API Endpoints

### **Authentication** (No `/api` prefix)
```
https://mytrips-api.bahar.co.il/auth/app-login
https://mytrips-api.bahar.co.il/auth/login
https://mytrips-api.bahar.co.il/auth/register
https://mytrips-api.bahar.co.il/auth/me
```

### **Location API** (Under `/location` path)
```
https://mytrips-api.bahar.co.il/location/getloc
https://mytrips-api.bahar.co.il/location/driving
https://mytrips-api.bahar.co.il/location/batch-sync
https://mytrips-api.bahar.co.il/location/api/users
https://mytrips-api.bahar.co.il/location/api/stats
https://mytrips-api.bahar.co.il/location/api/locations
https://mytrips-api.bahar.co.il/location/api/live/session
https://mytrips-api.bahar.co.il/location/api/live/latest
https://mytrips-api.bahar.co.il/location/api/live/history
https://mytrips-api.bahar.co.il/location/api/stream-sse
```

---

## 🔗 Complete API Documentation

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
# Authentication API (direct, no /api prefix)
REACT_APP_MYTRIPS_API_BASEURL=https://mytrips-api.bahar.co.il

# Location API (includes /api prefix)
REACT_APP_LOC_API_BASEURL=https://mytrips-api.bahar.co.il/location/api

# Google Maps API Key
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyAso37mBqnBKwDqQacmx99WgfkW-M9uwLQ

# Backend Proxy (legacy, may be deprecated)
REACT_APP_BACKEND_URL=https://www.bahar.co.il/mytrips-viewer-api
```

---

## 🔐 Authentication

### **App Login (Email-based)**

**Endpoint:**
```
POST https://mytrips-api.bahar.co.il/auth/app-login
```

**Request:**
```json
{
  "email": "adar.bahar@gmail.com",
  "password": "admin123"
}
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

## 📍 Location API

### **Create Live Session**

**Endpoint:**
```
POST https://mytrips-api.bahar.co.il/location/api/live/session
```

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request:**
```json
{
  "user_id": "123",
  "device_ids": [],
  "duration": 3600
}
```

### **Get Latest Location**

**Endpoint:**
```
GET https://mytrips-api.bahar.co.il/location/api/live/latest
```

**Headers:**
```
Authorization: Bearer {token}
```

### **SSE Stream for Live Updates**

**Endpoint:**
```
GET https://mytrips-api.bahar.co.il/location/api/stream-sse
```

**Headers:**
```
Authorization: Bearer {token}
Accept: text/event-stream
```

---

## ✅ Frontend Services

### **Authentication Service** (`authService.js`)
- Uses: `REACT_APP_MYTRIPS_API_BASEURL`
- Endpoints: `/auth/app-login`, `/auth/login`, `/auth/register`, `/auth/me`
- No `/api` prefix needed

### **Location API Client** (`LocationApiClient.js`)
- Uses: `https://mytrips-api.bahar.co.il/location/api`
- Endpoints: `/live/session`, `/live/latest`, `/stream-sse`, etc.
- Includes `/api` prefix

---

## 🎯 Key Points

✅ **Single Server** - All APIs consolidated at `https://mytrips-api.bahar.co.il`
✅ **Authentication** - Direct endpoints without `/api` prefix
✅ **Location API** - Under `/location` path with `/api` prefix
✅ **Complete Documentation** - Available at `/docs` and `/openapi.json`
✅ **Bearer Token** - Used for all authenticated endpoints
✅ **No Backend Proxy** - Direct calls to MyTrips API

---

## 📚 Resources

- **API Documentation:** https://mytrips-api.bahar.co.il/docs
- **OpenAPI Schema:** https://mytrips-api.bahar.co.il/openapi.json
- **Frontend Config:** `.env.production`
- **Auth Service:** `frontend/src/services/authService.js`
- **Location Client:** `frontend/src/services/LocationApiClient.js`

---

**Version:** 1.0
**Date:** November 10, 2025
**Status:** ✅ CURRENT

