# API Quick Reference

## 🏗️ Single API Server

```
https://mytrips-api.bahar.co.il
```

---

## 🔐 Authentication Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/app-login` | POST | Email-based login |
| `/auth/login` | POST | JWT login |
| `/auth/register` | POST | User registration |
| `/auth/me` | GET | Get current user |

**Base URL:** `https://mytrips-api.bahar.co.il` (no `/api` prefix)

---

## 📍 Location API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/location/getloc` | GET | Get location data |
| `/location/driving` | GET | Get driving records |
| `/location/batch-sync` | POST | Batch sync locations |
| `/location/api/users` | GET | Get users list |
| `/location/api/stats` | GET | Get statistics |
| `/location/api/locations` | GET | Get location history |
| `/location/api/live/session` | POST | Create live session |
| `/location/api/live/session` | DELETE | Revoke session |
| `/location/api/live/latest` | GET | Get latest location |
| `/location/api/live/history` | GET | Get cached history |
| `/location/api/stream-sse` | GET | SSE stream |

**Base URL:** `https://mytrips-api.bahar.co.il` (includes `/location` path)

---

## 🧪 Quick Test Commands

### **App Login**
```bash
curl -X POST https://mytrips-api.bahar.co.il/auth/app-login \
  -H "Content-Type: application/json" \
  -d '{"email":"adar.bahar@gmail.com","password":"admin123"}'
```

### **Get Users**
```bash
curl -X GET "https://mytrips-api.bahar.co.il/location/api/users" \
  -H "Authorization: Bearer {token}"
```

### **Create Session**
```bash
curl -X POST "https://mytrips-api.bahar.co.il/location/api/live/session" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"user_id":"123","device_ids":[],"duration":3600}'
```

### **Get Latest Location**
```bash
curl -X GET "https://mytrips-api.bahar.co.il/location/api/live/latest" \
  -H "Authorization: Bearer {token}"
```

---

## 📚 Documentation

| Resource | URL |
|----------|-----|
| Swagger UI | https://mytrips-api.bahar.co.il/docs |
| OpenAPI Schema | https://mytrips-api.bahar.co.il/openapi.json |

---

## 🔑 Authentication

**Token Format:**
```
Bearer {token}
```

**Header:**
```
Authorization: Bearer {token}
```

---

## 📝 Frontend Config

```bash
REACT_APP_MYTRIPS_API_BASEURL=https://mytrips-api.bahar.co.il
REACT_APP_LOC_API_BASEURL=https://mytrips-api.bahar.co.il/location/api
```

---

## ✅ Important Notes

- ✅ **Single Server** - All APIs at `https://mytrips-api.bahar.co.il`
- ✅ **Auth Endpoints** - No `/api` prefix
- ✅ **Location Endpoints** - Include `/location` path
- ✅ **Bearer Token** - Required for all authenticated endpoints
- ✅ **Complete Docs** - Available at `/docs` and `/openapi.json`

---

**Last Updated:** November 10, 2025

