# SSE Quick Reference Card

## 🚀 5-Minute Setup

```javascript
// 1. Import
import LocationApiClient from '../services/LocationApiClient';

// 2. Create instance
const apiClient = new LocationApiClient();

// 3. Create session
const session = await apiClient.createSession(userId);

// 4. Connect to stream (MUST use await!)
await apiClient.connectToStream(
  (location) => {
    // Handle location update
    console.log('📍', location);
  },
  (error) => {
    // Handle error
    console.error('❌', error);
  },
  (data) => {
    // Handle connected
    console.log('✅', data);
  }
);

// 5. Cleanup
apiClient.disconnect();
await apiClient.revokeSession();
```

---

## 📡 Event Types Cheat Sheet

| Event | Frequency | Contains Coords | Use Case |
|-------|-----------|-----------------|----------|
| `loc` | When changed | ✅ Yes | Location update |
| `no_change` | Every 30s | ❌ No | Heartbeat |
| `connected` | Once | ❌ No | Connection ready |
| `error` | On error | ❌ No | Error handling |
| `bye` | On close | ❌ No | Connection closed |

---

## 🏠 Dwell Detection

```javascript
// Check if user is dwelling
const isDwelling = (lastLoc, currentLoc) => {
  return lastLoc.latitude === currentLoc.latitude &&
         lastLoc.longitude === currentLoc.longitude;
};

// Calculate dwell duration
const calculateDwell = (startTime) => {
  const ms = new Date() - startTime;
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${minutes}m`;
};

// Usage
if (isDwelling(lastLocation, newLocation)) {
  if (!dwellStart) dwellStart = new Date(newLocation.recorded_at);
  showStatus(`📍 Dwelling for ${calculateDwell(dwellStart)}`);
} else {
  dwellStart = null;
  showStatus('🚶 Moving');
}
```

---

## 🧪 Testing Commands

### Check Protocol
```javascript
// In browser console
fetch('https://www.bahar.co.il/location/api/stream-sse.php?token=YOUR_TOKEN')
  .then(r => console.log('Protocol:', r.type))
```

### Test Connection
```javascript
const client = new LocationApiClient();
await client.createSession(1003);
await client.connectToStream(
  (loc) => console.log('📍', loc),
  (err) => console.error('❌', err),
  (data) => console.log('✅', data)
);
```

### Monitor Events
```javascript
// In DevTools Console
// Look for these messages:
// 📡 Connecting to SSE stream...
// ✅ SSE connection established
// ✅ SSE connected: {...}
// 💓 Heartbeat: {...}
// 📍 Location update: {...}
```

---

## 🔴 Common Errors & Fixes

### Error: "No session token"
```javascript
// ❌ Wrong - missing await
apiClient.createSession(userId);
await apiClient.connectToStream(...);

// ✅ Correct
await apiClient.createSession(userId);
await apiClient.connectToStream(...);
```

### Error: "net::ERR_QUIC_PROTOCOL_ERROR"
```javascript
// ❌ Wrong - uses EventSource (HTTP/3)
const sse = new EventSource(url);

// ✅ Correct - uses fetch (HTTP/1.1)
await apiClient.connectToStream(...);
```

### Error: "Connection closes immediately"
- Check user_id exists in database
- Verify session token is valid
- Check server logs for errors

### Error: "Events not appearing in UI"
```javascript
// ❌ Wrong - doesn't update state
await apiClient.connectToStream((loc) => {
  console.log(loc);  // Just logs
});

// ✅ Correct - updates state
await apiClient.connectToStream((loc) => {
  setCurrentLocation(loc);  // React state
});
```

---

## 📊 Location Event Data

```javascript
{
  device_id: "device_...",
  username: "Adar",
  latitude: 32.0853,
  longitude: 34.7818,
  accuracy: 10,              // meters
  speed: 45,                 // km/h
  bearing: 180,              // degrees
  battery_level: 85,         // percent
  recorded_at: "2025-11-02T17:05:24Z",
  server_time: "2025-11-02T17:05:24Z",
  change_reason: "distance", // "distance", "time", "speed", "bearing", "first"
  change_metrics: {
    distance_meters: 25.5,
    time_diff_seconds: 10,
    speed_change_kmh: 2.3,
    bearing_change_degrees: 8.5
  }
}
```

---

## 🎯 React Component Template

```javascript
import { useEffect, useRef, useState } from 'react';
import LocationApiClient from '../services/LocationApiClient';

function LiveTracking({ userId }) {
  const [isTracking, setIsTracking] = useState(false);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const apiRef = useRef(null);

  useEffect(() => {
    apiRef.current = new LocationApiClient();
    return () => {
      if (apiRef.current) {
        apiRef.current.disconnect();
        apiRef.current.revokeSession();
      }
    };
  }, []);

  const start = async () => {
    try {
      await apiRef.current.createSession(userId);
      await apiRef.current.connectToStream(
        (loc) => setLocation(loc),
        (err) => setError(err.message)
      );
      setIsTracking(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const stop = () => {
    apiRef.current.disconnect();
    apiRef.current.revokeSession();
    setIsTracking(false);
  };

  return (
    <div>
      <button onClick={isTracking ? stop : start}>
        {isTracking ? 'Stop' : 'Start'}
      </button>
      {error && <div className="error">{error}</div>}
      {location && (
        <div>
          <p>Lat: {location.latitude}</p>
          <p>Lng: {location.longitude}</p>
          <p>Speed: {location.speed} km/h</p>
        </div>
      )}
    </div>
  );
}

export default LiveTracking;
```

---

## ✅ Pre-Deployment Checklist

- [ ] Protocol is `h2` or `http/1.1` (NOT `h3`)
- [ ] No `net::ERR_QUIC_PROTOCOL_ERROR` in console
- [ ] Location events received correctly
- [ ] Heartbeat events every 30 seconds
- [ ] Multiple viewers can connect
- [ ] Dwell duration calculated correctly
- [ ] Disconnect/reconnect works
- [ ] Error handling works
- [ ] No memory leaks
- [ ] Performance acceptable

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `LocationApiClient-fixed.js` | Implementation |
| `MYTRIPS_VIEWER_SSE_FIX.md` | Comprehensive guide |
| `SSE_LIVE_LOCATION_SUMMARY.md` | Quick summary |
| `REACT_LIVE_TRACKING_EXAMPLE.md` | React examples |
| `SSE_IMPLEMENTATION_CHECKLIST.md` | Checklist |
| `SSE_DOCUMENTATION_INDEX.md` | Index |

---

## 🔗 Useful Links

- **Test Page:** https://www.bahar.co.il/location/test-sse-http1.html
- **API Docs:** https://www.bahar.co.il/location/api/docs
- **GitHub:** https://github.com/AdarBahar/mytrips-viewer-ui

---

## 💡 Pro Tips

1. **Always use `await`** on async methods
2. **Track dwell** by comparing coordinates
3. **Cleanup** on component unmount
4. **Test protocol** in DevTools Network tab
5. **Implement auto-reconnect** for production
6. **Use refs** for non-state values
7. **Handle errors** gracefully

---

**Version:** 2.1.2-http1-fix | **Status:** Production Ready ✅

