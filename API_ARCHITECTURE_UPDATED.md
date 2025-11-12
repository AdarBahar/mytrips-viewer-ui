# API Architecture - Updated

## 🏗️ Current Architecture

All APIs have been **migrated to MyTrips API** at `https://mytrips-api.bahar.co.il`

---

## 📋 API Endpoints

### **1. Authentication API**
**Base URL:** `https://mytrips-api.bahar.co.il`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/app-login` | POST | Email-based login |
| `/auth/login` | POST | JWT login |
| `/auth/register` | POST | User registration |
| `/auth/me` | GET | Get current user |

---

### **2. Location API** (Migrated from Backend Proxy)
**Base URL:** `https://mytrips-api.bahar.co.il/location`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/getloc` | GET | Get location data |
| `/driving` | GET | Get driving records |
| `/batch-sync` | POST | Batch sync locations |
| `/api/users` | GET | Get users list |
| `/api/stats` | GET | Get statistics |
| `/api/locations` | GET | Get location history |
| `/api/live/session` | POST/DELETE | Manage live session |
| `/api/live/latest` | GET | Get latest location |
| `/api/live/history` | GET | Get cached history |
| `/api/stream-sse` | GET | SSE stream for live updates |

---

## 🔗 Complete API Documentation

**Interactive API Docs:**
```
https://mytrips-api.bahar.co.il/docs
```

**OpenAPI Schema:**
```
https://mytrips-api.bahar.co.il/openapi.json
```

---

## 📝 Environment Variables

### **Frontend** (`.env.production`)
```bash
# Authentication API
REACT_APP_MYTRIPS_API_BASEURL=https://mytrips-api.bahar.co.il

# Location API (now part of MyTrips API)
REACT_APP_LOC_API_BASEURL=https://mytrips-api.bahar.co.il/location/api

# Google Maps
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyAso37mBqnBKwDqQacmx99WgfkW-M9uwLQ
```

---

## 🔐 Authentication

### **App Login (Email-based)**
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

---

## 📍 Location API Examples

### **Get Location Data**
```bash
curl -X GET "https://mytrips-api.bahar.co.il/location/getloc" \
  -H "Authorization: Bearer {token}"
```

### **Get Driving Records**
```bash
curl -X GET "https://mytrips-api.bahar.co.il/location/driving" \
  -H "Authorization: Bearer {token}"
```

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

## ✅ Summary

✅ **Single API Server** - All endpoints at `https://mytrips-api.bahar.co.il`
✅ **Authentication** - `/auth/*` endpoints (no prefix)
✅ **Location API** - `/location/*` endpoints (migrated from backend proxy)
✅ **Complete Documentation** - Available at `/docs` and `/openapi.json`
✅ **Consistent Authentication** - Bearer token for all endpoints

---

**Version:** 1.0
**Date:** November 10, 2025
**Status:** ✅ UPDATED

