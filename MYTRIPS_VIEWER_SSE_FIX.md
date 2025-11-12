# MyTrips Viewer - SSE HTTP/3 Fix Guide

## 🎯 Problem

The SSE (Server-Sent Events) connection fails with `net::ERR_QUIC_PROTOCOL_ERROR` when using the native `EventSource` API because:
- Cloudflare enables HTTP/3 (QUIC protocol) by default
- HTTP/3 uses UDP instead of TCP
- Long-running SSE streams are incompatible with HTTP/3

## ✅ Solution

Replace the native `EventSource` API with a **fetch-based SSE implementation** that forces HTTP/1.1 connection.

---

## 📍 Understanding Dwell Behavior & Location Updates

### **How the SSE Stream Works**

The SSE stream sends different types of events based on location changes:

#### **1. Location Changed (`loc` event)**

Sent when a **significant change** is detected:

| Trigger | Threshold | Description |
|---------|-----------|-------------|
| **Distance** | > 20 meters | User moved more than 20m from last location |
| **Time** | > 5 minutes | 5 minutes passed (even if same location) |
| **Speed** | > 5 km/h change | Speed changed by more than 5 km/h |
| **Bearing** | > 15° change | Direction changed by more than 15 degrees |

**Event Data:**
```javascript
event: loc
data: {
  "device_id": "device_aa9e19da71fc702b",
  "username": "Adar",
  "latitude": 32.0853,
  "longitude": 34.7818,
  "accuracy": 10,
  "speed": 45,
  "bearing": 180,
  "battery_level": 85,
  "recorded_at": "2025-11-02T17:05:24Z",
  "server_time": "2025-11-02T17:05:24Z",
  "change_reason": "distance",  // or "time", "speed", "bearing", "first"
  "change_metrics": {
    "distance_meters": 25.5,
    "time_diff_seconds": 10,
    "speed_change_kmh": 2.3,
    "bearing_change_degrees": 8.5
  },
  "timestamp": "2025-11-02T17:05:24Z"
}
```

#### **2. No Change (`no_change` event)**

Sent **every 30 seconds** when no significant changes detected:

**Event Data:**
```javascript
event: no_change
data: {
  "active_devices": 1,
  "timestamp": "2025-11-02T17:05:54Z"
}
```

**Purpose:**
- ✅ Heartbeat to keep connection alive
- ✅ Confirms server is polling database
- ✅ Indicates user is likely stationary (dwelling)
- ❌ Does NOT include location coordinates

#### **3. Dwell Behavior (User Stationary)**

When a user stays at the **same location** (dwelling):

**Timeline Example:**
```
10:00:00 - loc event (reason: "first", lat: 32.0853, lng: 34.7818)
10:00:30 - no_change event (heartbeat)
10:01:00 - no_change event (heartbeat)
10:01:30 - no_change event (heartbeat)
10:02:00 - no_change event (heartbeat)
10:02:30 - no_change event (heartbeat)
10:03:00 - no_change event (heartbeat)
10:03:30 - no_change event (heartbeat)
10:04:00 - no_change event (heartbeat)
10:04:30 - no_change event (heartbeat)
10:05:00 - loc event (reason: "time", lat: 32.0853, lng: 34.7818) ← SAME coordinates!
10:05:30 - no_change event (heartbeat)
10:06:00 - no_change event (heartbeat)
...
10:10:00 - loc event (reason: "time", lat: 32.0853, lng: 34.7818) ← SAME coordinates!
```

**Key Points:**
- ✅ Same location is **re-sent every 5 minutes** (time threshold)
- ✅ Coordinates remain identical
- ✅ `change_reason` will be `"time"`
- ✅ `change_metrics.distance_meters` will be `0`
- ✅ Heartbeat events sent every 30 seconds between location updates

---

### **Displaying "Dwelling for X Time" in UI**

The server does **NOT** send a "dwelling for X time" message. You need to **calculate it in the UI** by comparing consecutive location coordinates.

#### **Implementation Example:**

```javascript
class LocationTracker {
  constructor() {
    this.lastLocation = null;
    this.dwellStart = null;
    this.dwellUpdateInterval = null;
  }

  handleLocationUpdate(location) {
    // Check if coordinates actually changed
    const coordsChanged = !this.lastLocation ||
      this.lastLocation.latitude !== location.latitude ||
      this.lastLocation.longitude !== location.longitude;

    if (coordsChanged) {
      // Location changed - user is moving
      this.dwellStart = null;
      this.stopDwellTracking();
      this.showStatus('Moving');

    } else {
      // Same location - user is dwelling
      if (!this.dwellStart) {
        this.dwellStart = new Date(location.recorded_at);
        this.startDwellTracking();
      }

      this.updateDwellDuration();
    }

    this.lastLocation = location;
    this.updateMap(location);
  }

  startDwellTracking() {
    // Update dwell duration every minute
    this.dwellUpdateInterval = setInterval(() => {
      this.updateDwellDuration();
    }, 60000);
  }

  stopDwellTracking() {
    if (this.dwellUpdateInterval) {
      clearInterval(this.dwellUpdateInterval);
      this.dwellUpdateInterval = null;
    }
  }

  updateDwellDuration() {
    if (!this.dwellStart) return;

    const now = new Date();
    const dwellMs = now - this.dwellStart;
    const dwellMinutes = Math.floor(dwellMs / 60000);
    const dwellHours = Math.floor(dwellMinutes / 60);
    const remainingMinutes = dwellMinutes % 60;

    let dwellText;
    if (dwellHours > 0) {
      dwellText = `${dwellHours}h ${remainingMinutes}m`;
    } else {
      dwellText = `${dwellMinutes}m`;
    }

    this.showStatus(`📍 Dwelling for ${dwellText}`);
  }

  showStatus(message) {
    console.log(message);
    // Update your UI element
    document.getElementById('location-status').textContent = message;
  }

  updateMap(location) {
    // Update map marker
    console.log(`Map: ${location.latitude}, ${location.longitude}`);
  }
}

// Usage with LocationApiClient
const tracker = new LocationTracker();
const apiClient = new LocationApiClient();

await apiClient.createSession(1003);
await apiClient.connectToStream(
  (location) => tracker.handleLocationUpdate(location),
  (error) => console.error('Error:', error)
);
```

---

### **Event Summary Table**

| Scenario | Event Type | Frequency | Contains Coordinates | Change Reason |
|----------|-----------|-----------|---------------------|---------------|
| First location | `loc` | Once | ✅ Yes | `first` |
| Moved > 20m | `loc` | When detected | ✅ Yes | `distance` |
| 5 min passed (same location) | `loc` | Every 5 min | ✅ Yes (same) | `time` |
| Speed changed > 5 km/h | `loc` | When detected | ✅ Yes | `speed` |
| Bearing changed > 15° | `loc` | When detected | ✅ Yes | `bearing` |
| No significant changes | `no_change` | Every 30 sec | ❌ No | N/A |

---

## 📋 Changes Required

### **Step 1: Locate Your SSE Code**

Search your mytrips-viewer project for:
- `new EventSource(`
- `EventSource(`
- `connectToStream`
- `stream-sse.php`

Common locations:
- `src/services/LocationApiClient.js`
- `src/components/LiveTracking.jsx`
- `src/utils/sseClient.js`

---

### **Step 2: Replace EventSource with Fetch-Based Implementation**

#### **BEFORE (Old Code):**

```javascript
class LocationApiClient {
  constructor() {
    this.baseUrl = 'https://www.bahar.co.il/location/api';
    this.apiToken = '4Q9j0INedMHobgNdJx+PqcXesQjifyl9LCE+W2phLdI=';
    this.sessionToken = null;
    this.sseConnection = null;  // ❌ OLD: EventSource
  }

  /**
   * Connect to SSE stream (OLD VERSION - CAUSES HTTP/3 ERRORS)
   */
  connectToStream(onLocation, onError = null) {
    if (!this.sessionToken) {
      throw new Error('No session token. Call createSession() first.');
    }

    const streamUrl = `${this.baseUrl}/stream-sse.php?token=${this.sessionToken}`;
    this.sseConnection = new EventSource(streamUrl);  // ❌ Uses HTTP/3

    // Handle connection established
    this.sseConnection.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data);
      console.log('✅ SSE connected:', data);
    });

    // Handle location updates
    this.sseConnection.addEventListener('loc', (event) => {
      const location = JSON.parse(event.data);
      console.log('📍 Location update:', location);
      if (onLocation) {
        onLocation(location);
      }
    });

    // Handle heartbeat (no change)
    this.sseConnection.addEventListener('no_change', (event) => {
      const data = JSON.parse(event.data);
      console.log('💓 Heartbeat:', data);
    });

    // Handle errors
    this.sseConnection.addEventListener('error', (event) => {
      console.error('❌ SSE error:', event);
      if (onError) {
        onError(event);
      }
      this.disconnect();
    });

    return this.sseConnection;
  }

  /**
   * Disconnect from SSE stream (OLD VERSION)
   */
  disconnect() {
    if (this.sseConnection) {
      this.sseConnection.close();
      this.sseConnection = null;
      console.log('🔌 SSE disconnected');
    }
  }
}
```

---

#### **AFTER (New Code):**

```javascript
class LocationApiClient {
  constructor() {
    this.baseUrl = 'https://www.bahar.co.il/location/api';
    this.apiToken = '4Q9j0INedMHobgNdJx+PqcXesQjifyl9LCE+W2phLdI=';
    this.sessionToken = null;
    this.abortController = null;  // ✅ NEW: AbortController for fetch
  }

  /**
   * Connect to SSE stream using fetch (forces HTTP/1.1)
   * @param {function} onLocation - Callback for location updates
   * @param {function} onError - Callback for errors
   */
  async connectToStream(onLocation, onError = null) {
    if (!this.sessionToken) {
      throw new Error('No session token. Call createSession() first.');
    }

    const streamUrl = `${this.baseUrl}/stream-sse.php?token=${this.sessionToken}`;
    
    // Create AbortController for connection management
    this.abortController = new AbortController();
    
    try {
      console.log('📡 Connecting to SSE stream...');
      
      // Use fetch instead of EventSource to force HTTP/1.1
      const response = await fetch(streamUrl, {
        signal: this.abortController.signal,
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('✅ SSE connection established');

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Process stream chunks
      while (true) {
        const {done, value} = await reader.read();
        
        if (done) {
          console.log('📡 SSE stream ended');
          break;
        }

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, {stream: true});
        
        // Split by newlines
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        // Parse SSE format
        let currentEvent = null;
        let currentData = '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.substring(6).trim();
          } else if (line.startsWith('data:')) {
            currentData = line.substring(5).trim();
          } else if (line === '' && currentEvent) {
            // Empty line = end of event
            this._handleSSEEvent(currentEvent, currentData, onLocation, onError);
            currentEvent = null;
            currentData = '';
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🔌 SSE connection aborted');
      } else {
        console.error('❌ SSE error:', error);
        if (onError) onError(error);
      }
    }
  }

  /**
   * Handle SSE events
   * @private
   */
  _handleSSEEvent(eventType, data, onLocation, onError) {
    try {
      const parsedData = JSON.parse(data);
      
      switch (eventType) {
        case 'connected':
          console.log('✅ SSE connected:', parsedData);
          break;
          
        case 'loc':
          console.log('📍 Location update:', parsedData);
          if (onLocation) onLocation(parsedData);
          break;
          
        case 'no_change':
          console.log('💓 Heartbeat:', parsedData);
          break;
          
        case 'error':
          console.error('❌ SSE error event:', parsedData);
          if (onError) onError(parsedData);
          break;
          
        case 'bye':
          console.log('👋 SSE goodbye:', parsedData);
          this.disconnect();
          break;
          
        default:
          console.warn('Unknown SSE event type:', eventType, parsedData);
      }
    } catch (error) {
      console.error('Failed to parse SSE data:', error, data);
    }
  }

  /**
   * Disconnect from SSE stream
   */
  disconnect() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      console.log('🔌 SSE disconnected');
    }
  }

  /**
   * Create a new session (unchanged)
   */
  async createSession(userId, deviceIds = [], duration = 3600) {
    const response = await fetch(`${this.baseUrl}/live/session.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Token': this.apiToken
      },
      body: JSON.stringify({
        user_id: userId,
        device_ids: deviceIds,
        duration: duration
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.message || 'Failed to create session');
    }

    this.sessionToken = data.data.session_token;
    return data.data;
  }

  /**
   * Revoke session (unchanged)
   */
  async revokeSession() {
    if (!this.sessionToken) return;

    try {
      await fetch(`${this.baseUrl}/live/session.php`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.sessionToken}`,
          'X-API-Token': this.apiToken
        }
      });
      
      this.sessionToken = null;
      console.log('✅ Session revoked');
    } catch (error) {
      console.error('Failed to revoke session:', error);
    }
  }
}
```

---

### **Step 3: Update Your React Component (if applicable)**

If you're using React, update your component to handle the async `connectToStream`:

```javascript
import { useEffect, useRef, useState } from 'react';

function LiveTracking({ userId }) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [error, setError] = useState(null);
  const apiClientRef = useRef(null);

  useEffect(() => {
    // Initialize API client
    apiClientRef.current = new LocationApiClient();

    // Cleanup on unmount
    return () => {
      if (apiClientRef.current) {
        apiClientRef.current.disconnect();
        apiClientRef.current.revokeSession();
      }
    };
  }, []);

  const startTracking = async () => {
    try {
      setError(null);
      
      // Create session
      const session = await apiClientRef.current.createSession(userId);
      console.log('✅ Session created:', session);

      // Connect to SSE stream (now async!)
      apiClientRef.current.connectToStream(
        // onLocation callback
        (location) => {
          setCurrentLocation(location);
        },
        // onError callback
        (error) => {
          setError('Connection lost. Please reconnect.');
          setIsTracking(false);
        }
      );

      setIsTracking(true);
    } catch (err) {
      setError(err.message);
      setIsTracking(false);
    }
  };

  const stopTracking = () => {
    apiClientRef.current.disconnect();
    apiClientRef.current.revokeSession();
    setIsTracking(false);
    setCurrentLocation(null);
  };

  return (
    <div>
      <button onClick={isTracking ? stopTracking : startTracking}>
        {isTracking ? '⏸️ Stop Tracking' : '▶️ Start Tracking'}
      </button>
      
      {error && <div className="error">{error}</div>}
      
      {currentLocation && (
        <div className="location-info">
          <p>Lat: {currentLocation.latitude}</p>
          <p>Lng: {currentLocation.longitude}</p>
          <p>Speed: {currentLocation.speed} km/h</p>
          <p>Time: {currentLocation.server_time}</p>
        </div>
      )}
    </div>
  );
}
```

---

## 🧪 Testing

### **Test 1: Verify Connection Protocol**

1. Open MyTrips Viewer dashboard
2. Start live tracking
3. Open DevTools → Network tab
4. Find the `stream-sse.php` request
5. Check the **Protocol** column:
   - ✅ Should show `h2` (HTTP/2) or `http/1.1`
   - ❌ Should NOT show `h3` (HTTP/3)

### **Test 2: Verify Events Are Received**

Check the browser console for:
```
📡 Connecting to SSE stream...
✅ SSE connection established
✅ SSE connected: {session_id: "sess_...", user_id: 1003, ...}
💓 Heartbeat: {active_devices: 0, timestamp: "..."}
📍 Location update: {latitude: "32.0853", longitude: "34.7818", ...}
```

### **Test 3: Verify Multiple Connections**

1. Open MyTrips Viewer in 2 browser tabs
2. Both should connect successfully
3. Both should receive location updates
4. Check PHP logs - should see queries from both connections

---

## 📊 Expected Results

### **Before Fix:**
- ❌ `net::ERR_QUIC_PROTOCOL_ERROR` in console
- ❌ Connection fails immediately
- ❌ No events received
- ❌ Protocol: `h3` (HTTP/3)

### **After Fix:**
- ✅ No QUIC errors
- ✅ Connection stays open
- ✅ Events received correctly
- ✅ Protocol: `h2` or `http/1.1`
- ✅ Multiple viewers can connect simultaneously

---

## 🔧 Troubleshooting

### **Issue: "No session token" error**

**Solution:** Make sure you call `createSession()` before `connectToStream()`:

```javascript
// ✅ Correct order
await apiClient.createSession(userId);
await apiClient.connectToStream(onLocation, onError);

// ❌ Wrong - missing await on createSession
apiClient.createSession(userId);
apiClient.connectToStream(onLocation, onError);  // sessionToken not set yet!
```

### **Issue: Connection closes immediately**

**Possible causes:**
1. Invalid user_id (doesn't exist in database)
2. Token expired
3. Server error

**Solution:** Check browser console and PHP error logs for details.

### **Issue: Events not appearing in UI**

**Solution:** Make sure your `onLocation` callback is updating state correctly:

```javascript
// ✅ Correct - updates state
connectToStream((location) => {
  setCurrentLocation(location);  // React state update
});

// ❌ Wrong - doesn't update anything
connectToStream((location) => {
  console.log(location);  // Just logs, doesn't update UI
});
```

---

## 📝 Summary

**Key Changes:**
1. ✅ Replace `new EventSource()` with `fetch()`
2. ✅ Add `AbortController` for connection management
3. ✅ Manually parse SSE event stream format
4. ✅ Make `connectToStream()` async
5. ✅ Update `disconnect()` to use `abort()`

**Benefits:**
- ✅ Avoids HTTP/3 (QUIC) protocol errors
- ✅ Works reliably through Cloudflare
- ✅ Supports multiple simultaneous viewers
- ✅ Better error handling

---

## 🚀 Next Steps

1. **Apply the changes** to your LocationApiClient class
2. **Test** in the browser (check Network tab for protocol)
3. **Verify** events are received in console
4. **Update UI** to display location updates
5. **Deploy** to production

---

## 📊 Quick Reference: Dwell vs Movement

### **How to Detect Dwell in Your UI:**

```javascript
// Simple dwell detection
function isDwelling(location1, location2) {
  return location1.latitude === location2.latitude &&
         location1.longitude === location2.longitude;
}

// Usage
apiClient.connectToStream((location) => {
  if (lastLocation && isDwelling(lastLocation, location)) {
    console.log('User is dwelling (stationary)');
    // Track dwell duration
  } else {
    console.log('User is moving');
    // Reset dwell tracking
  }
  lastLocation = location;
});
```

### **Common UI Patterns:**

#### **Pattern 1: Show Movement Status**
```javascript
if (location.change_reason === 'distance') {
  showStatus('🚶 Moving');
} else if (location.change_reason === 'time') {
  showStatus('📍 Stationary');
}
```

#### **Pattern 2: Show Dwell Duration**
```javascript
if (isDwelling(lastLocation, location)) {
  const duration = calculateDuration(dwellStart, new Date());
  showStatus(`📍 At this location for ${duration}`);
}
```

#### **Pattern 3: Highlight Dwell on Map**
```javascript
if (isDwelling(lastLocation, location)) {
  // Change marker color to indicate dwelling
  marker.setIcon('red-marker.png');
  marker.setLabel(`Dwelling ${duration}`);
} else {
  // Moving - use blue marker
  marker.setIcon('blue-marker.png');
}
```

---

## 🔑 Key Takeaways

1. **Same location is re-sent every 5 minutes** with `change_reason: "time"`
2. **Heartbeat events (`no_change`) every 30 seconds** don't include coordinates
3. **UI must track dwell duration** by comparing consecutive coordinates
4. **No built-in "dwelling for X time" message** from server
5. **Use `change_reason` field** to understand why location was sent

---

**Need help?** Check the test page at `https://www.bahar.co.il/location/test-sse-http1.html` for a working example!

