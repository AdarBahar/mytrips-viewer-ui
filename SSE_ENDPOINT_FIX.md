# SSE Endpoint Fix - 404 Error Resolution ✅

## Problem

The SSE connection was failing with a **404 Not Found** error:

```
GET https://www.bahar.co.il/api/location/live/sse?users=Adar&heartbeat=10&limit=100 404 (Not Found)
```

The issue was that the frontend was trying to connect to `/api/location/live/sse` as a relative path, which resolved to the wrong URL.

---

## Root Cause

The `LocationApiClient` was using a hardcoded default proxy URL:

```javascript
constructor(proxyBaseUrl = '/api/location/live/sse') {
  this.proxyBaseUrl = proxyBaseUrl;
  // ...
}
```

When the frontend is deployed at `https://www.bahar.co.il/mytrips-viewer/`, the relative path `/api/location/live/sse` resolves to:
```
https://www.bahar.co.il/api/location/live/sse  ❌ WRONG
```

But it should resolve to:
```
https://www.bahar.co.il/mytrips-viewer-api/location/live/sse  ✅ CORRECT
```

---

## Solution

Updated `useLiveLocations.js` to use the backend URL from environment variables:

### Before
```javascript
// Create client if not exists
if (!clientRef.current) {
  clientRef.current = new LocationApiClient();  // Uses default '/api/location/live/sse'
}
```

### After
```javascript
// Get backend URL from environment
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '/mytrips-viewer-api';
const SSE_PROXY_URL = `${BACKEND_URL}/location/live/sse`;

// Create client if not exists
if (!clientRef.current) {
  clientRef.current = new LocationApiClient(SSE_PROXY_URL);  // Uses correct backend URL
}
```

---

## Changes Made

**File:** `frontend/src/hooks/useLiveLocations.js`

1. Added environment variable reading:
   ```javascript
   const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '/mytrips-viewer-api';
   const SSE_PROXY_URL = `${BACKEND_URL}/location/live/sse`;
   ```

2. Updated LocationApiClient initialization:
   ```javascript
   clientRef.current = new LocationApiClient(SSE_PROXY_URL);
   ```

---

## Environment Configuration

The fix uses `REACT_APP_BACKEND_URL` from `.env.production`:

```
REACT_APP_BACKEND_URL=https://www.bahar.co.il/mytrips-viewer-api
```

This results in the correct SSE proxy URL:
```
https://www.bahar.co.il/mytrips-viewer-api/location/live/sse
```

---

## Build Status

✅ **Compilation:** Successful
✅ **Errors:** 0
✅ **Warnings:** 0
✅ **Bundle Size:** 143.97 kB (gzipped)

---

## Commit Details

**Hash:** `ac00475`
**Branch:** `code-review/non-backend-fixes`
**Message:** "fix: Use correct backend URL for SSE proxy endpoint"

**Changes:**
- 1 file changed
- 5 insertions
- 1 deletion

---

## Testing

After this fix, the SSE connection should:

1. ✅ Connect to the correct backend URL
2. ✅ Receive location points from the server
3. ✅ Display real-time location updates on the map
4. ✅ Show connection status as "Real-time streaming active"

---

## How It Works

### URL Resolution Flow

**Production Environment:**
```
REACT_APP_BACKEND_URL = "https://www.bahar.co.il/mytrips-viewer-api"
↓
SSE_PROXY_URL = "https://www.bahar.co.il/mytrips-viewer-api/location/live/sse"
↓
EventSource connects to correct backend endpoint
```

**Development Environment (fallback):**
```
REACT_APP_BACKEND_URL = undefined
↓
BACKEND_URL = "/mytrips-viewer-api" (fallback)
↓
SSE_PROXY_URL = "/mytrips-viewer-api/location/live/sse"
↓
EventSource connects to relative path
```

---

## Verification

To verify the fix is working:

1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "sse"
4. Look for request to `/mytrips-viewer-api/location/live/sse`
5. Should see status 200 (not 404)
6. Should see SSE events in Response tab

---

## Related Files

- `frontend/src/hooks/useLiveLocations.js` - Updated hook
- `frontend/src/services/LocationApiClientNew.js` - Service class (unchanged)
- `frontend/.env.production` - Environment configuration
- `frontend/src/components/MapDashboard.js` - Component using the hook

---

## Summary

The SSE endpoint fix ensures that the frontend correctly connects to the backend SSE proxy endpoint at the right URL. This resolves the 404 error and enables real-time location tracking.

**Status:** ✅ Fixed and Committed

