# SSE Endpoint Migration Guide

## Overview

This guide explains how to migrate from the old SSE implementation (`/location/stream-sse`) to the new SSE endpoint (`/location/live/sse`).

**Key Changes:**
- ✅ New endpoint: `/location/live/sse` (instead of `/location/stream-sse`)
- ✅ Uses EventSource (instead of fetch-based implementation)
- ✅ Same-origin proxy route: `/api/location/live/sse`
- ✅ Query parameter-based filtering (instead of session tokens)
- ✅ Simpler integration with React hooks

---

## New Implementation Files

### 1. **LocationApiClientNew.js** (New Service)
Location: `frontend/src/services/LocationApiClientNew.js`

Provides a clean interface to the new SSE endpoint:

```javascript
import LocationApiClient from '../services/LocationApiClientNew';

const client = new LocationApiClient();

client.connect({
  all: true,  // or specify users/devices
  heartbeat: 15,
  limit: 100,
  onPoint: (point) => {
    console.log('Location:', point.latitude, point.longitude);
  },
  onError: (error) => {
    console.error('Connection error:', error);
  },
  onConnected: () => {
    console.log('Connected!');
  }
});

// Later, disconnect
client.disconnect();
```

### 2. **useLiveLocations.js** (React Hook)
Location: `frontend/src/hooks/useLiveLocations.js`

Recommended for React components:

```javascript
import { useLiveLocations } from '../hooks/useLiveLocations';

function MyComponent() {
  const { connected, points, error } = useLiveLocations({
    all: true,
    heartbeat: 5,
    limit: 100
  });

  return (
    <div>
      <p>Connected: {connected ? '✅' : '❌'}</p>
      <p>Points received: {points.length}</p>
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}
```

---

## Migration Steps

### Step 1: Update MapDashboard.js

**Old Code:**
```javascript
// Old session-based approach
const sseBaseUrl = LOC_API_BASEURL.replace('/api', '');
const sseUrl = `${sseBaseUrl}/stream-sse?token=${jwtToken}`;

const response = await fetch(sseUrl, {
  signal: abortController.signal,
  headers: {
    'Accept': 'text/event-stream',
    'Cache-Control': 'no-cache'
  }
});
```

**New Code:**
```javascript
import { useLiveLocations } from '../hooks/useLiveLocations';

// Inside component
const { connected, points, error } = useLiveLocations({
  users: [selectedUser],
  heartbeat: 10,
  limit: 100,
  enabled: isLiveTracking
});

// Handle points
useEffect(() => {
  if (points.length > 0) {
    const latestPoint = points[points.length - 1];
    setCurrentLocation({
      lat: latestPoint.latitude,
      lng: latestPoint.longitude,
      speed: latestPoint.speed,
      battery: latestPoint.battery_level,
      timestamp: latestPoint.server_time,
      accuracy: latestPoint.accuracy
    });
  }
}, [points]);
```

### Step 2: Update Query Parameters

**Old Format (Session-based):**
```
/location/stream-sse?token={sessionToken}
```

**New Format (Query parameters):**
```
/api/location/live/sse?users=adar&users=ben&heartbeat=15&limit=100
```

**Supported Parameters:**
- `all=true` - Include all users/devices
- `users=username` - Repeatable, e.g., `?users=adar&users=ben`
- `devices=device_id` - Repeatable, e.g., `?devices=dev1&devices=dev2`
- `since=<ms>` - Resume from timestamp
- `heartbeat=<seconds>` - Keep-alive interval (default: 15)
- `limit=<1-500>` - Max points per cycle (default: 100)

### Step 3: Update Event Handling

**Old Event Types:**
- `loc` - Location update
- `no_change` - Heartbeat
- `error` - Error event
- `bye` - Connection closing

**New Event Type:**
- `point` - Location point (only one event type!)

**Old Code:**
```javascript
case 'loc':
  const location = JSON.parse(data);
  updateMap(location);
  break;

case 'no_change':
  // Heartbeat - ignore
  break;
```

**New Code:**
```javascript
// All location data comes as 'point' events
const point = JSON.parse(event.data);
updateMap({
  lat: point.latitude,
  lng: point.longitude,
  speed: point.speed,
  battery: point.battery_level,
  timestamp: point.server_timestamp
});
```

### Step 4: Handle Connection State

**Old Code:**
```javascript
const [sseConnected, setSseConnected] = useState(false);
const [sseError, setSseError] = useState(null);

// Manual connection management
const abortController = new AbortController();
```

**New Code:**
```javascript
const { connected, error } = useLiveLocations({...});

// Connection is managed automatically by the hook
```

---

## Event Data Structure

Each `point` event contains:

```json
{
  "device_id": "dev-123",
  "user_id": 42,
  "username": "adar",
  "display_name": "Adar Bahar",
  "latitude": 32.0777,
  "longitude": 34.7733,
  "accuracy": 6.0,
  "altitude": 20.5,
  "speed": 1.2,
  "bearing": 270,
  "battery_level": 0.78,
  "recorded_at": "2024-10-01T12:34:56Z",
  "server_time": "2024-10-01T12:34:57.001Z",
  "server_timestamp": 1727786097001
}
```

---

## Proxy Route Setup

The frontend needs a same-origin proxy route to inject the API token.

**Location:** `frontend/app/api/location/live/sse/route.ts` (Next.js)

This route:
1. Accepts requests to `/api/location/live/sse`
2. Forwards to backend `/location/live/sse`
3. Injects `X-API-Token` header (server-side)
4. Returns the SSE stream to the browser

---

## Benefits of New Endpoint

✅ **Simpler Integration** - No session management needed
✅ **Query Parameters** - Easy filtering by users/devices
✅ **EventSource** - Native browser support
✅ **Automatic Reconnection** - EventSource handles reconnects
✅ **Resume Support** - Use `Last-Event-ID` for resuming
✅ **Keep-alives** - Automatic heartbeat comments
✅ **Better Performance** - Fewer API calls

---

## Troubleshooting

### Connection fails immediately
- Ensure you pass at least one filter: `users`, `devices`, or `all=true`
- Check that the proxy route is configured correctly

### No events received
- Verify the user/device has location data
- Check browser console for errors
- Try with `all=true` to see if any data flows

### Connection drops frequently
- Increase `heartbeat` value (default: 15 seconds)
- Check network conditions
- Verify backend is running

### CORS errors
- Use the same-origin proxy route (`/api/location/live/sse`)
- Do not connect directly to backend from browser

---

## Rollback Plan

If you need to revert to the old implementation:

1. Keep the old `LocationApiClient.js` file
2. Revert MapDashboard.js to use session-based approach
3. Update event handlers for old event types

---

## Testing

### Test with cURL (via proxy)
```bash
curl -i 'http://localhost:3000/api/location/live/sse?all=true&heartbeat=1&limit=1'
```

### Test with JavaScript
```javascript
const es = new EventSource('/api/location/live/sse?all=true');
es.addEventListener('point', (e) => {
  console.log('Point:', JSON.parse(e.data));
});
```

### Test with React Hook
```javascript
const { connected, points } = useLiveLocations({ all: true });
console.log('Connected:', connected);
console.log('Points:', points);
```

---

## Next Steps

1. ✅ Create new service files (LocationApiClientNew.js, useLiveLocations.js)
2. ⏳ Update MapDashboard.js to use new hook
3. ⏳ Test with real location data
4. ⏳ Remove old LocationApiClient.js
5. ⏳ Deploy to production

---

**Status:** Ready for implementation
**Version:** 1.0
**Date:** November 11, 2025

