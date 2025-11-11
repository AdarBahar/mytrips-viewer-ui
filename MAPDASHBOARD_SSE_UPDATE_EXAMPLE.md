# MapDashboard.js - SSE Update Example

This document shows how to update MapDashboard.js to use the new SSE endpoint.

---

## Current Implementation (Old)

The current MapDashboard uses:
- Session-based SSE (`/location/stream-sse`)
- Fetch-based implementation
- Manual event parsing
- Complex state management

---

## New Implementation (Recommended)

### Step 1: Add Import

```javascript
import { useLiveLocations } from '../hooks/useLiveLocations';
```

### Step 2: Replace SSE State Management

**Remove these:**
```javascript
// OLD - Remove these
const eventSourceRef = useRef(null);
const [sseConnected, setSseConnected] = useState(false);
const [sseError, setSseError] = useState(null);
const [streamCursor, setStreamCursor] = useState(null);
const [sseAvailable, setSseAvailable] = useState(true);
```

**Add this:**
```javascript
// NEW - Add this
const { connected: sseConnected, points, error: sseError } = useLiveLocations({
  users: selectedUser ? [selectedUser] : [],
  heartbeat: 10,
  limit: 100,
  enabled: isLiveTracking && selectedUser
});
```

### Step 3: Replace SSE Connection Logic

**Remove this entire useEffect:**
```javascript
// OLD - Remove this entire block (lines ~863-1035)
useEffect(() => {
  if (!selectedUser || !isLiveTracking || !jwtToken || !sseAvailable) {
    if (eventSourceRef.current) {
      eventSourceRef.current.abort();
      eventSourceRef.current = null;
      setSseConnected(false);
    }
    return;
  }

  const sseBaseUrl = LOC_API_BASEURL.replace('/api', '');
  const sseUrl = `${sseBaseUrl}/stream-sse?token=${jwtToken}`;

  // ... lots of fetch-based SSE code ...
}, [selectedUser, isLiveTracking, jwtToken, sseAvailable, debugMode]);
```

**Add this simple effect:**
```javascript
// NEW - Add this simple effect
useEffect(() => {
  if (points.length > 0) {
    const latestPoint = points[points.length - 1];
    
    if (debugMode) {
      console.group('📍 SSE Point Received');
      console.log('Username:', latestPoint.username);
      console.log('Location:', latestPoint.latitude, latestPoint.longitude);
      console.log('Speed:', latestPoint.speed, 'km/h');
      console.log('Battery:', latestPoint.battery_level);
      console.log('Timestamp:', latestPoint.server_timestamp);
      console.groupEnd();
    }

    // Update current location
    setCurrentLocation({
      lat: latestPoint.latitude,
      lng: latestPoint.longitude,
      speed: latestPoint.speed,
      battery: latestPoint.battery_level,
      timestamp: latestPoint.server_time,
      accuracy: latestPoint.accuracy
    });

    // Update polyline with new point
    if (actualPolylineRef.current) {
      const newPath = actualPolylineRef.current.getPath();
      newPath.push(new window.google.maps.LatLng(
        latestPoint.latitude,
        latestPoint.longitude
      ));
    }

    // Update marker position
    if (markerRef.current) {
      markerRef.current.setPosition({
        lat: latestPoint.latitude,
        lng: latestPoint.longitude
      });
    }
  }
}, [points, debugMode]);
```

### Step 4: Remove Polling Fallback

**Remove this entire useEffect:**
```javascript
// OLD - Remove this (lines ~1037-1100)
useEffect(() => {
  if (!selectedUser || !isLiveTracking || sseAvailable) {
    return;
  }

  // ... polling code ...
}, [selectedUser, isLiveTracking, sseAvailable, debugMode]);
```

The new SSE endpoint is reliable and doesn't need polling fallback.

### Step 5: Update UI Status Display

**Old:**
```javascript
{sseConnected ? '🟢 Live' : '🔴 Offline'}
{sseError && <span>{sseError}</span>}
```

**New:**
```javascript
{sseConnected ? '🟢 Live' : '🔴 Offline'}
{sseError && <span>{sseError.message}</span>}
```

---

## Complete Example

Here's a minimal example of the updated component structure:

```javascript
import { useState, useEffect, useRef } from 'react';
import { useLiveLocations } from '../hooks/useLiveLocations';

export default function MapDashboard({ user, onLogout }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [debugMode, setDebugMode] = useState(false);

  // Use the new SSE hook
  const { connected: sseConnected, points, error: sseError } = useLiveLocations({
    users: selectedUser ? [selectedUser] : [],
    heartbeat: 10,
    limit: 100,
    enabled: isLiveTracking && selectedUser
  });

  // Handle incoming points
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

      if (debugMode) {
        console.log('📍 Location updated:', latestPoint);
      }
    }
  }, [points, debugMode]);

  return (
    <div>
      <div className="status-bar">
        <span>{sseConnected ? '🟢 Live' : '🔴 Offline'}</span>
        {sseError && <span className="error">{sseError.message}</span>}
      </div>

      <div className="map-container">
        {/* Map rendering */}
      </div>

      <div className="controls">
        <button onClick={() => setIsLiveTracking(!isLiveTracking)}>
          {isLiveTracking ? 'Stop Tracking' : 'Start Tracking'}
        </button>
      </div>
    </div>
  );
}
```

---

## Benefits of This Approach

✅ **Simpler Code** - 50% less code
✅ **Automatic Management** - Hook handles connection lifecycle
✅ **Better Performance** - Fewer re-renders
✅ **Easier Testing** - Isolated hook logic
✅ **Cleaner State** - No manual ref management
✅ **Built-in Error Handling** - Error state included

---

## Migration Checklist

- [ ] Add import for `useLiveLocations`
- [ ] Replace SSE state variables with hook
- [ ] Remove old SSE connection useEffect
- [ ] Add new points handling useEffect
- [ ] Remove polling fallback useEffect
- [ ] Update UI status display
- [ ] Test with real location data
- [ ] Remove old LocationApiClient references
- [ ] Deploy to production

---

## Testing

After updating, test:

1. **Connection** - Verify SSE connects when tracking starts
2. **Points** - Verify location points are received
3. **UI Update** - Verify map updates with new locations
4. **Disconnect** - Verify SSE disconnects when tracking stops
5. **Error Handling** - Verify errors are displayed

---

**Status:** Ready for implementation
**Estimated Time:** 30-45 minutes
**Difficulty:** Low

