# SSE Implementation Checklist & Quick Reference

## ✅ Implementation Checklist

### Phase 1: Setup
- [ ] Copy `LocationApiClient-fixed.js` to `src/services/LocationApiClient.js`
- [ ] Verify file imports correctly in your components
- [ ] Check that API token and base URL are correct

### Phase 2: Component Integration
- [ ] Create or update LiveTracking component
- [ ] Import LocationApiClient
- [ ] Initialize client in useEffect
- [ ] Add cleanup function for unmount
- [ ] Implement start/stop tracking buttons

### Phase 3: Event Handling
- [ ] Implement onLocation callback
- [ ] Implement onError callback
- [ ] Implement onConnected callback (optional)
- [ ] Add state management for current location
- [ ] Add state management for tracking status

### Phase 4: Dwell Tracking (Optional)
- [ ] Track last location coordinates
- [ ] Detect when coordinates don't change
- [ ] Calculate dwell duration
- [ ] Update UI with dwell status
- [ ] Display "Dwelling for X time" message

### Phase 5: Testing
- [ ] Test connection in DevTools Network tab
- [ ] Verify protocol is `h2` or `http/1.1` (NOT `h3`)
- [ ] Check console for connection messages
- [ ] Verify location events are received
- [ ] Test error handling (disconnect/reconnect)
- [ ] Test multiple simultaneous connections
- [ ] Test dwell detection logic

### Phase 6: Deployment
- [ ] Build production bundle
- [ ] Test in production environment
- [ ] Monitor for errors in console
- [ ] Verify performance (no memory leaks)
- [ ] Document any custom configurations

---

## 🚀 Quick Start

### 1. Basic Setup
```javascript
import LocationApiClient from '../services/LocationApiClient';

const apiClient = new LocationApiClient();
```

### 2. Create Session
```javascript
const session = await apiClient.createSession(userId);
// Returns: { session_id, session_token, expires_at, duration }
```

### 3. Connect to Stream
```javascript
await apiClient.connectToStream(
  (location) => {
    // Handle location update
    console.log('New location:', location);
  },
  (error) => {
    // Handle error
    console.error('Error:', error);
  },
  (data) => {
    // Handle connected
    console.log('Connected:', data);
  }
);
```

### 4. Disconnect
```javascript
apiClient.disconnect();
await apiClient.revokeSession();
```

---

## 📊 Event Data Reference

### Location Event (`loc`)
```javascript
{
  device_id: "device_aa9e19da71fc702b",
  username: "Adar",
  latitude: 32.0853,
  longitude: 34.7818,
  accuracy: 10,
  speed: 45,
  bearing: 180,
  battery_level: 85,
  recorded_at: "2025-11-02T17:05:24Z",
  server_time: "2025-11-02T17:05:24Z",
  change_reason: "distance",  // "distance", "time", "speed", "bearing", "first"
  change_metrics: {
    distance_meters: 25.5,
    time_diff_seconds: 10,
    speed_change_kmh: 2.3,
    bearing_change_degrees: 8.5
  }
}
```

### Heartbeat Event (`no_change`)
```javascript
{
  active_devices: 1,
  timestamp: "2025-11-02T17:05:54Z"
}
```

### Connected Event (`connected`)
```javascript
{
  session_id: "sess_abc123",
  user_id: 1003,
  active_devices: 1,
  timestamp: "2025-11-02T17:05:00Z"
}
```

---

## 🔍 Debugging Guide

### Issue: "No session token" Error
**Solution:** Call `createSession()` before `connectToStream()`
```javascript
// ✅ Correct
await apiClient.createSession(userId);
await apiClient.connectToStream(onLocation, onError);

// ❌ Wrong
apiClient.createSession(userId);  // Missing await!
await apiClient.connectToStream(onLocation, onError);
```

### Issue: Connection Closes Immediately
**Possible Causes:**
- Invalid user_id (doesn't exist in database)
- Session token expired
- Server error

**Solution:** Check browser console and server logs

### Issue: Events Not Appearing in UI
**Solution:** Verify callback is updating state
```javascript
// ✅ Correct - updates state
await apiClient.connectToStream((location) => {
  setCurrentLocation(location);  // React state update
});

// ❌ Wrong - doesn't update UI
await apiClient.connectToStream((location) => {
  console.log(location);  // Just logs
});
```

### Issue: Protocol Shows `h3` Instead of `h2`/`http/1.1`
**Solution:** Verify you're using the new fetch-based implementation
- Check that `LocationApiClient.js` uses `fetch()` not `EventSource`
- Clear browser cache
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Issue: Multiple Connections Fail
**Solution:** Ensure each client has its own `LocationApiClient` instance
```javascript
// ✅ Correct - separate instances
const client1 = new LocationApiClient();
const client2 = new LocationApiClient();

// ❌ Wrong - shared instance
const client = new LocationApiClient();
// Use client for both connections
```

---

## 📈 Performance Tips

1. **Debounce UI Updates**
   - Don't update map on every location event
   - Update every 1-2 seconds instead

2. **Cleanup Intervals**
   - Always clear intervals on unmount
   - Use refs for non-state values

3. **Memory Management**
   - Disconnect when component unmounts
   - Revoke session to free server resources
   - Don't store entire location history in state

4. **Error Recovery**
   - Implement auto-reconnect logic
   - Exponential backoff for retries
   - Show user-friendly error messages

---

## 🧪 Testing Commands

### Test Connection Protocol
```javascript
// In browser console
fetch('https://www.bahar.co.il/location/api/stream-sse.php?token=YOUR_TOKEN')
  .then(r => console.log('Protocol:', r.type))
```

### Test Session Creation
```javascript
const client = new LocationApiClient();
const session = await client.createSession(1003);
console.log('Session:', session);
```

### Test Stream Connection
```javascript
const client = new LocationApiClient();
await client.createSession(1003);
await client.connectToStream(
  (loc) => console.log('📍', loc),
  (err) => console.error('❌', err),
  (data) => console.log('✅', data)
);
```

---

## 📋 Common Patterns

### Pattern 1: Auto-Reconnect
```javascript
const connectWithRetry = async (maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await apiClient.connectToStream(onLocation, onError);
      return;
    } catch (error) {
      console.log(`Retry ${i + 1}/${maxRetries}`);
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
};
```

### Pattern 2: Dwell Detection
```javascript
const isDwelling = (loc1, loc2) => {
  return loc1.latitude === loc2.latitude &&
         loc1.longitude === loc2.longitude;
};
```

### Pattern 3: Distance Calculation
```javascript
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000; // Return in meters
};
```

---

## 📚 Reference Files

| File | Purpose |
|------|---------|
| `LocationApiClient-fixed.js` | Main implementation |
| `MYTRIPS_VIEWER_SSE_FIX.md` | Detailed fix guide |
| `SSE_IMPLEMENTATION_COMPARISON.md` | Before/after comparison |
| `REACT_LIVE_TRACKING_EXAMPLE.md` | React component examples |
| `SSE_LIVE_LOCATION_SUMMARY.md` | Quick summary |

---

## 🔗 Useful Links

- **Test Page:** https://www.bahar.co.il/location/test-sse-http1.html
- **API Docs:** https://www.bahar.co.il/location/api/docs
- **GitHub:** https://github.com/AdarBahar/mytrips-viewer-ui

---

## ✨ Key Takeaways

1. ✅ Use **fetch-based SSE** instead of EventSource
2. ✅ Always **await** connectToStream()
3. ✅ **Track dwell** by comparing coordinates
4. ✅ **Cleanup** on component unmount
5. ✅ **Test** protocol in DevTools (should be h2/http1.1)
6. ✅ **Handle errors** gracefully
7. ✅ **Implement auto-reconnect** for production

