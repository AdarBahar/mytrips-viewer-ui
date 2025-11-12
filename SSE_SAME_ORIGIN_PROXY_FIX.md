# SSE Same-Origin Proxy Fix ✅

## Issue

The SSE endpoint was trying to call the MyTrips API directly from the browser, which resulted in a 404 error and CORS issues.

**Before:**
```
❌ https://mytrips-api.bahar.co.il/location/live/sse
```

**After:**
```
✅ /api/location/live/sse (same-origin proxy)
```

---

## Root Cause

The browser cannot directly call external APIs with custom headers (like `X-API-Token`). The EventSource API doesn't support custom headers, so we need to use a same-origin proxy that:

1. Accepts requests from the browser at `/api/location/live/sse`
2. Forwards requests to the MyTrips API
3. Injects the `LOC_API_TOKEN` server-side
4. Returns the SSE stream to the browser

---

## Solution

Updated `frontend/src/hooks/useLiveLocations.js` to use the same-origin proxy:

### Before
```javascript
const MYTRIPS_API_URL = process.env.REACT_APP_MYTRIPS_API_BASEURL || 'https://mytrips-api.bahar.co.il';
const SSE_ENDPOINT_URL = `${MYTRIPS_API_URL}/location/live/sse`;
```

### After
```javascript
// Use same-origin proxy for SSE endpoint
// The backend proxy at /api/location/live/sse forwards to MyTrips API
// and injects the LOC_API_TOKEN server-side for security
const SSE_ENDPOINT_URL = '/api/location/live/sse';
```

---

## How It Works

### Request Flow

```
Browser
  ↓
EventSource('/api/location/live/sse?users=Adar&heartbeat=10&limit=100')
  ↓
Backend Proxy at /api/location/live/sse
  ↓
Injects LOC_API_TOKEN header
  ↓
Forwards to MyTrips API: https://mytrips-api.bahar.co.il/location/live/sse
  ↓
MyTrips API validates token and returns SSE stream
  ↓
Backend proxy forwards stream back to browser
  ↓
Browser receives SSE events
```

---

## Benefits

✅ **Security** - Tokens stay server-side, never exposed to browser
✅ **CORS** - No CORS issues (same-origin request)
✅ **Custom Headers** - Backend can inject any headers needed
✅ **Token Management** - Centralized token handling
✅ **Flexibility** - Backend can modify requests/responses as needed

---

## Changes Made

**File:** `frontend/src/hooks/useLiveLocations.js`

1. Removed environment variable reading for MyTrips API URL
2. Changed SSE endpoint to use same-origin proxy: `/api/location/live/sse`
3. Added comments explaining the proxy architecture

**Changes:**
- 1 file changed
- 4 insertions
- 3 deletions

---

## Build Status

✅ **Compilation:** Successful
✅ **Errors:** 0
✅ **Warnings:** 0
✅ **Bundle Size:** 143.96 kB (gzipped, -10 B)

---

## Commit Details

**Hash:** `af71a16`
**Branch:** `code-review/non-backend-fixes`
**Message:** "fix: Use same-origin proxy for SSE endpoint"

**Changes:**
- 1 file changed
- 4 insertions
- 3 deletions

---

## Example Usage

```javascript
// Browser code
const params = new URLSearchParams({ 
  all: "true", 
  heartbeat: "10", 
  limit: "100" 
});
const es = new EventSource(`/api/location/live/sse?${params.toString()}`);
es.addEventListener("point", (ev) => {
  console.log("point", JSON.parse(ev.data));
});
```

---

## Backend Proxy Requirements

The backend must have a proxy route at `/api/location/live/sse` that:

1. **Accepts SSE requests** from the browser
2. **Reads LOC_API_TOKEN** from server environment
3. **Forwards to MyTrips API** at `https://mytrips-api.bahar.co.il/location/live/sse`
4. **Injects X-API-Token header** with the token value
5. **Streams responses** back to the browser as SSE

---

## Query Parameters

The proxy forwards all query parameters to the MyTrips API:

- `all=true` - Include all users/devices
- `users=username` - Repeatable, filter by username
- `devices=device_id` - Repeatable, filter by device ID
- `since=<ms>` - Resume from timestamp
- `heartbeat=<seconds>` - Keep-alive interval
- `limit=<1-500>` - Max points per cycle

---

## Testing

To verify the fix is working:

1. **Open DevTools (F12)**
2. **Go to Network tab**
3. **Filter by "sse"**
4. **Look for request to `/api/location/live/sse`**
5. **Should see status 200 (not 404)**

### Expected Console Output
```
📡 [SSE] Connecting to live location stream...
📡 [SSE] URL: /api/location/live/sse?users=Adar&heartbeat=10&limit=100
✅ [SSE] Connection established
📍 [SSE] Point received: {username: "Adar", lat: 32.0777, lng: 34.7733, ...}
```

---

## Related Files

- `frontend/src/hooks/useLiveLocations.js` - Updated hook
- `frontend/src/services/LocationApiClientNew.js` - Service class (unchanged)
- `frontend/src/components/MapDashboard.js` - Component using the hook
- Backend proxy route (not in this repo)

---

## Summary

The SSE endpoint now uses the same-origin proxy at `/api/location/live/sse`. The backend proxy forwards requests to the MyTrips API and injects the authentication token server-side, keeping tokens secure and avoiding CORS issues.

**Status:** ✅ Fixed and Committed

