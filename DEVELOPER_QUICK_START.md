# Developer Quick Start - SSE Implementation

## Overview

The application now uses a new EventSource-based SSE implementation for real-time location tracking. This guide shows how to use it.

---

## Using the useLiveLocations Hook

### Basic Usage

```javascript
import { useLiveLocations } from '../hooks/useLiveLocations';

function MyComponent() {
  const { connected, points, error } = useLiveLocations({
    users: ['adar', 'ben'],
    enabled: true
  });

  return (
    <div>
      <p>Connected: {connected ? 'Yes' : 'No'}</p>
      <p>Points received: {points.length}</p>
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}
```

### Advanced Usage

```javascript
const {
  connected,        // boolean - Connection status
  points,          // array - Received location points
  error,           // Error object or null
  lastEventId,     // string - Last event ID
  disconnect,      // function - Manually disconnect
  resume           // function - Resume from last event
} = useLiveLocations({
  all: false,                    // Include all users/devices
  users: ['username'],           // Usernames to track
  devices: ['device_id'],        // Device IDs to track
  since: null,                   // Resume cursor (ms)
  heartbeat: 15,                 // Keep-alive interval (seconds)
  limit: 100,                    // Max points per cycle (1-500)
  enabled: true                  // Enable/disable connection
});
```

---

## Point Data Structure

Each point received contains:

```javascript
{
  device_id: "dev-123",
  user_id: 42,
  username: "adar",
  display_name: "Adar Bahar",
  latitude: 32.0777,
  longitude: 34.7733,
  accuracy: 6.0,
  altitude: 20.5,
  speed: 1.2,
  bearing: 270,
  battery_level: 0.78,
  recorded_at: "2024-10-01T12:34:56Z",
  server_time: "2024-10-01T12:34:57.001Z",
  server_timestamp: 1727786097001
}
```

---

## Common Patterns

### Track Single User

```javascript
const { connected, points } = useLiveLocations({
  users: [selectedUsername],
  enabled: isTracking
});
```

### Track Multiple Users

```javascript
const { connected, points } = useLiveLocations({
  users: ['adar', 'ben', 'david'],
  enabled: isTracking
});
```

### Track All Users

```javascript
const { connected, points } = useLiveLocations({
  all: true,
  enabled: isTracking
});
```

### Handle Points

```javascript
useEffect(() => {
  if (points.length > 0) {
    const latestPoint = points[points.length - 1];
    console.log('New location:', latestPoint.latitude, latestPoint.longitude);
    // Update map, UI, etc.
  }
}, [points]);
```

### Handle Errors

```javascript
useEffect(() => {
  if (error) {
    console.error('SSE Error:', error.message);
    // Show error to user
  }
}, [error]);
```

### Manual Disconnect

```javascript
const { disconnect } = useLiveLocations({ ... });

// Later, when you want to stop tracking
disconnect();
```

### Resume from Last Event

```javascript
const { resume, lastEventId } = useLiveLocations({ ... });

// Later, resume from where you left off
resume({ since: lastEventId });
```

---

## MapDashboard.js Example

```javascript
import { useLiveLocations } from '../hooks/useLiveLocations';

export function MapDashboard({ selectedUser, isLiveTracking }) {
  // Initialize hook
  const { connected: sseConnected, points, error: sseError } = useLiveLocations({
    users: selectedUser ? [users.find(u => u.id === selectedUser)?.name] : [],
    heartbeat: 10,
    limit: 100,
    enabled: isLiveTracking && selectedUser
  });

  // Handle incoming points
  useEffect(() => {
    if (points.length > 0) {
      const latestPoint = points[points.length - 1];
      
      // Update current location
      setCurrentLocation({
        lat: latestPoint.latitude,
        lng: latestPoint.longitude,
        speed: latestPoint.speed,
        timestamp: latestPoint.server_time,
        accuracy: latestPoint.accuracy,
        battery: latestPoint.battery_level
      });

      // Update polyline
      if (actualPolylineRef.current) {
        const newPath = actualPolylineRef.current.getPath();
        newPath.push(new window.google.maps.LatLng(
          latestPoint.latitude,
          latestPoint.longitude
        ));
      }

      // Update marker
      if (markerRef.current) {
        markerRef.current.setPosition({
          lat: latestPoint.latitude,
          lng: latestPoint.longitude
        });
      }
    }
  }, [points]);

  // Display connection status
  return (
    <div>
      <div className={`h-2 w-2 rounded-full ${sseConnected ? 'bg-green-500' : 'bg-red-500'}`} />
      <span>
        {sseConnected ? 'Real-time streaming active' : sseError?.message || 'Connecting...'}
      </span>
    </div>
  );
}
```

---

## Debugging

### Enable Debug Logging

```javascript
// In MapDashboard.js
const [debugMode, setDebugMode] = useState(false);

// In useEffect
useEffect(() => {
  if (points.length > 0 && debugMode) {
    console.group('📍 SSE: Point received');
    console.log('Username:', points[points.length - 1].username);
    console.log('Location:', points[points.length - 1].latitude, points[points.length - 1].longitude);
    console.groupEnd();
  }
}, [points, debugMode]);
```

### Check Connection Status

```javascript
// In browser console
// Check if EventSource is connected
console.log('Connected:', sseConnected);
console.log('Points received:', points.length);
console.log('Error:', sseError);
```

### Monitor Network

1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "sse"
4. Look for `/api/location/live/sse` request
5. Check Response tab for SSE events

---

## Common Issues

### Connection Not Established
- Check if `enabled` is true
- Check if `users` array is not empty
- Check browser console for errors
- Check Network tab for failed requests

### No Points Received
- Check if connection is established (`connected === true`)
- Check if users are tracking
- Check if server is sending data
- Check browser console for errors

### Connection Drops
- Check network connectivity
- Check server logs
- Check browser console for errors
- Hook will automatically reconnect

---

## API Reference

### useLiveLocations(params)

**Parameters:**
- `all` (boolean) - Include all users/devices
- `users` (array) - Usernames to track
- `devices` (array) - Device IDs to track
- `since` (number) - Resume cursor (ms)
- `heartbeat` (number) - Keep-alive interval (seconds)
- `limit` (number) - Max points per cycle (1-500)
- `enabled` (boolean) - Enable/disable connection

**Returns:**
- `connected` (boolean) - Connection status
- `points` (array) - Received location points
- `error` (Error|null) - Connection error
- `lastEventId` (string) - Last event ID
- `disconnect` (function) - Manually disconnect
- `resume` (function) - Resume from last event

---

## Files

- `frontend/src/hooks/useLiveLocations.js` - Hook implementation
- `frontend/src/services/LocationApiClientNew.js` - Service implementation
- `frontend/src/components/MapDashboard.js` - Usage example

---

## Support

For more information, see:
- `FINAL_DELIVERY_SUMMARY.md` - Project overview
- `SSE_REPLACEMENT_FINAL_REPORT.md` - Technical details
- `MAPDASHBOARD_SSE_UPDATE_EXAMPLE.md` - Code examples

