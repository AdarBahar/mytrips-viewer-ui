# SSE & Live Location Logic - Implementation Summary

## 📋 Overview

The MyTrips Viewer uses **Server-Sent Events (SSE)** for real-time location tracking. The implementation has been updated to fix HTTP/3 (QUIC) compatibility issues and properly handle dwell behavior.

---

## 🔧 Key Updates

### **1. HTTP/3 (QUIC) Compatibility Fix**

**Problem:**
- Native `EventSource` API uses HTTP/3 (QUIC) through Cloudflare
- HTTP/3 uses UDP instead of TCP
- Long-running SSE streams are incompatible with HTTP/3
- Results in: `net::ERR_QUIC_PROTOCOL_ERROR`

**Solution:**
- Replace `EventSource` with **fetch-based SSE implementation**
- Forces HTTP/1.1 connection (TCP-based)
- Manually parse SSE event stream format
- Use `AbortController` for connection management

---

## 📡 SSE Event Types

### **1. Location Changed (`loc` event)**

Sent when **significant change** is detected:

| Trigger | Threshold | Description |
|---------|-----------|-------------|
| **Distance** | > 20 meters | User moved more than 20m |
| **Time** | > 5 minutes | 5 minutes passed (even if same location) |
| **Speed** | > 5 km/h change | Speed changed significantly |
| **Bearing** | > 15° change | Direction changed significantly |

**Event Data:**
```javascript
{
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
  }
}
```

### **2. No Change (`no_change` event)**

Sent **every 30 seconds** when no significant changes:

```javascript
{
  "active_devices": 1,
  "timestamp": "2025-11-02T17:05:54Z"
}
```

**Purpose:**
- ✅ Heartbeat to keep connection alive
- ✅ Confirms server is polling database
- ✅ Indicates user is likely stationary
- ❌ Does NOT include location coordinates

---

## 🏠 Dwell Behavior (User Stationary)

When a user stays at the **same location**:

**Timeline Example:**
```
10:00:00 - loc event (reason: "first", lat: 32.0853, lng: 34.7818)
10:00:30 - no_change event (heartbeat)
10:01:00 - no_change event (heartbeat)
...
10:05:00 - loc event (reason: "time", lat: 32.0853, lng: 34.7818) ← SAME coords!
10:05:30 - no_change event (heartbeat)
...
10:10:00 - loc event (reason: "time", lat: 32.0853, lng: 34.7818) ← SAME coords!
```

**Key Points:**
- ✅ Same location is **re-sent every 5 minutes**
- ✅ Coordinates remain identical
- ✅ `change_reason` will be `"time"`
- ✅ Heartbeat events sent every 30 seconds between updates

---

## 💻 Implementation

### **LocationApiClient Class**

**Key Methods:**

1. **`createSession(userId, deviceIds, duration)`**
   - Creates a new streaming session
   - Returns session token for SSE connection

2. **`connectToStream(onLocation, onError, onConnected)`**
   - Connects to SSE stream using fetch (HTTP/1.1)
   - Manually parses SSE event format
   - Calls callbacks for different event types
   - **Now async** - must use `await`

3. **`disconnect()`**
   - Closes SSE connection using `AbortController`
   - Cleans up resources

4. **`revokeSession()`**
   - Revokes the session token
   - Cleans up server-side resources

5. **`getLatestLocation(userId, deviceId)`**
   - Polling fallback to get latest location
   - Useful if SSE connection fails

---

## 🎯 UI Implementation for Dwell Tracking

**The server does NOT send "dwelling for X time" messages.**
**You must calculate it in the UI:**

```javascript
class LocationTracker {
  constructor() {
    this.lastLocation = null;
    this.dwellStart = null;
  }

  handleLocationUpdate(location) {
    // Check if coordinates actually changed
    const coordsChanged = !this.lastLocation ||
      this.lastLocation.latitude !== location.latitude ||
      this.lastLocation.longitude !== location.longitude;

    if (coordsChanged) {
      // Location changed - user is moving
      this.dwellStart = null;
      this.showStatus('Moving');
    } else {
      // Same location - user is dwelling
      if (!this.dwellStart) {
        this.dwellStart = new Date(location.recorded_at);
      }
      const duration = this.calculateDuration();
      this.showStatus(`📍 Dwelling for ${duration}`);
    }

    this.lastLocation = location;
  }

  calculateDuration() {
    const now = new Date();
    const dwellMs = now - this.dwellStart;
    const dwellMinutes = Math.floor(dwellMs / 60000);
    const dwellHours = Math.floor(dwellMinutes / 60);
    const remainingMinutes = dwellMinutes % 60;

    if (dwellHours > 0) {
      return `${dwellHours}h ${remainingMinutes}m`;
    }
    return `${dwellMinutes}m`;
  }
}
```

---

## ✅ Testing Checklist

- [ ] Connection protocol is `h2` or `http/1.1` (NOT `h3`)
- [ ] No `net::ERR_QUIC_PROTOCOL_ERROR` in console
- [ ] Location events received correctly
- [ ] Heartbeat events received every 30 seconds
- [ ] Multiple viewers can connect simultaneously
- [ ] Dwell duration calculated correctly in UI
- [ ] Disconnect/reconnect works properly

---

## 📊 Event Summary Table

| Scenario | Event Type | Frequency | Contains Coords | Change Reason |
|----------|-----------|-----------|-----------------|---------------|
| First location | `loc` | Once | ✅ Yes | `first` |
| Moved > 20m | `loc` | When detected | ✅ Yes | `distance` |
| 5 min passed (same) | `loc` | Every 5 min | ✅ Yes (same) | `time` |
| Speed changed > 5 km/h | `loc` | When detected | ✅ Yes | `speed` |
| Bearing changed > 15° | `loc` | When detected | ✅ Yes | `bearing` |
| No changes | `no_change` | Every 30 sec | ❌ No | N/A |

---

## 🚀 Usage Example

```javascript
// 1. Create client
const apiClient = new LocationApiClient();

// 2. Create session
const session = await apiClient.createSession(1003);

// 3. Connect to stream
await apiClient.connectToStream(
  // onLocation callback
  (location) => {
    console.log('New location:', location);
    updateMap(location.latitude, location.longitude);
  },
  // onError callback
  (error) => {
    console.error('Stream error:', error);
  },
  // onConnected callback
  (data) => {
    console.log('Connected:', data);
  }
);

// 4. When done
apiClient.disconnect();
await apiClient.revokeSession();
```

---

## 📁 Files

- **`MYTRIPS_VIEWER_SSE_FIX.md`** - Comprehensive fix guide with detailed explanations
- **`LocationApiClient-fixed.js`** - Complete implementation with fetch-based SSE

