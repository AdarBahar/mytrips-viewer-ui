# SSE Endpoint Architecture

## Overview

The SSE endpoint uses a **same-origin proxy pattern** for security and to inject authentication tokens server-side.

---

## Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Browser (Frontend)                                              │
│ EventSource('/api/location/live/sse?users=Adar&heartbeat=10')  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Same-origin request
                         │ (no custom headers possible)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Backend Proxy at /api/location/live/sse                         │
│ (https://www.bahar.co.il/mytrips-viewer-api/api/location/...)  │
│                                                                 │
│ 1. Receives request from browser                               │
│ 2. Reads LOC_API_TOKEN from environment                        │
│ 3. Injects X-API-Token header                                  │
│ 4. Forwards to MyTrips API                                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ With X-API-Token header
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ MyTrips API at /location/live/sse                               │
│ (https://mytrips-api.bahar.co.il/location/live/sse)            │
│                                                                 │
│ 1. Validates X-API-Token header                                │
│ 2. Returns SSE stream                                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ SSE stream
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Backend Proxy                                                   │
│ Streams response back to browser                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ SSE stream
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Browser (Frontend)                                              │
│ Receives SSE events                                            │
│ Updates map with live locations                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## URLs

### Frontend Code
```javascript
// In useLiveLocations.js
const SSE_ENDPOINT_URL = '/api/location/live/sse';
const es = new EventSource(`${SSE_ENDPOINT_URL}?users=Adar&heartbeat=10&limit=100`);
```

**What the browser sees in Network tab:**
```
https://www.bahar.co.il/mytrips-viewer-api/api/location/live/sse?users=Adar&heartbeat=10&limit=100
```

### Backend Proxy
```python
@api_router.get("/location/live/sse")
async def location_live_sse(request):
    # Forwards to:
    mytrips_url = f"{MYTRIPS_API_BASEURL}/location/live/sse"
    # Which is:
    # https://mytrips-api.bahar.co.il/location/live/sse
```

### MyTrips API
```
https://mytrips-api.bahar.co.il/location/live/sse
```

---

## Why This Architecture?

### ✅ Security
- **Token Protection**: LOC_API_TOKEN never exposed to browser
- **Server-Side Injection**: Token injected only on backend
- **No CORS Issues**: Same-origin request from browser

### ✅ Browser Limitations
- **EventSource API**: Cannot set custom headers
- **No Authorization**: Cannot add `X-API-Token` header from browser
- **Proxy Solution**: Backend proxy adds the header

### ✅ Production Ready
- **Scalable**: Backend can cache/optimize requests
- **Monitorable**: All requests go through backend
- **Flexible**: Easy to add logging, rate limiting, etc.

---

## Browser Network Tab

When you open DevTools and look at the Network tab:

**Request URL shown:**
```
https://www.bahar.co.il/mytrips-viewer-api/api/location/live/sse?users=Adar&heartbeat=10&limit=100
```

**This is CORRECT!** It shows:
- The full domain: `www.bahar.co.il`
- The backend path: `/mytrips-viewer-api`
- The proxy endpoint: `/api/location/live/sse`
- The query parameters: `?users=Adar&heartbeat=10&limit=100`

**Status should be:** `200` (not 401 or 404)

---

## Testing

### Using curl (local development)
```bash
curl -N \
  -H 'Accept: text/event-stream' \
  "http://localhost:8000/api/location/live/sse?users=Adar&heartbeat=2&limit=1"
```

### Using curl (production)
```bash
curl -N \
  -H 'Accept: text/event-stream' \
  "https://www.bahar.co.il/mytrips-viewer-api/api/location/live/sse?users=Adar&heartbeat=2&limit=1"
```

### Using browser DevTools
1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "sse"
4. Look for request to `/api/location/live/sse`
5. Check status is 200
6. Check response shows SSE events

---

## Query Parameters

All parameters are forwarded to MyTrips API:

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `all` | boolean | `true` | Include all users/devices |
| `users` | string (repeatable) | `?users=adar&users=ben` | Filter by username |
| `devices` | string (repeatable) | `?devices=dev1&devices=dev2` | Filter by device ID |
| `since` | number | `1727786097001` | Resume from timestamp (ms) |
| `heartbeat` | number | `10` | Keep-alive interval (seconds) |
| `limit` | number | `100` | Max points per cycle (1-500) |

---

## Environment Variables

### Backend (.env)
```bash
LOC_API_TOKEN=<your-token>
MYTRIPS_API_BASEURL=https://mytrips-api.bahar.co.il
```

### Frontend (.env.production)
```bash
REACT_APP_BACKEND_URL=https://www.bahar.co.il/mytrips-viewer-api
REACT_APP_MYTRIPS_API_BASEURL=https://mytrips-api.bahar.co.il
```

---

## Troubleshooting

### Issue: 404 Not Found
**Cause:** Backend proxy endpoint not implemented
**Solution:** Ensure `/api/location/live/sse` endpoint exists in `backend/server.py`

### Issue: 401 Unauthorized
**Cause:** LOC_API_TOKEN not set or invalid
**Solution:** Check `LOC_API_TOKEN` environment variable on backend

### Issue: CORS Error
**Cause:** Calling MyTrips API directly from browser
**Solution:** Use same-origin proxy at `/api/location/live/sse`

### Issue: Connection Timeout
**Cause:** Backend not forwarding to MyTrips API
**Solution:** Check `MYTRIPS_API_BASEURL` environment variable

---

## Summary

✅ **Frontend calls:** `/api/location/live/sse` (same-origin proxy)
✅ **Backend forwards to:** `https://mytrips-api.bahar.co.il/location/live/sse`
✅ **Backend injects:** `X-API-Token` header
✅ **Browser sees:** Full URL with domain in Network tab
✅ **Security:** Token never exposed to browser

