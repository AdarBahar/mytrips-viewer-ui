# SSE Debugging Guide - Comprehensive Console Logging

## 📋 Overview

The enhanced `LocationApiClient-fixed.js` now includes detailed console logging at every step of the SSE connection lifecycle. This guide helps you investigate connection issues with the backend.

---

## 🔍 Console Log Categories

All logs are prefixed with category tags for easy filtering:

| Tag | Meaning | Color |
|-----|---------|-------|
| `[SESSION]` | Session creation/revocation | 🔑 |
| `[SSE]` | SSE connection/events | 📡 |
| `[ERROR]` | Errors and failures | ❌ |
| `[WARN]` | Warnings | ⚠️ |

---

## 📊 Complete Connection Lifecycle Logs

### Phase 1: Session Creation

```
🔑 [SESSION] Creating new session...
🔑 [SESSION] Request parameters: {
  user_id: 1003,
  device_ids: [],
  duration: 3600,
  endpoint: "https://www.bahar.co.il/location/api/live/session.php"
}
🔑 [SESSION] Response received: {
  status: 200,
  statusText: "OK",
  headers: { contentType: "application/json" }
}
🔑 [SESSION] Response data: {
  status: "success",
  message: "Session created"
}
✅ [SESSION] Session created successfully: {
  session_id: "sess_abc123...",
  expires_at: "2025-11-03T13:08:45Z",
  duration: 3600,
  token_preview: "4Q9j0INedMHobgNd..."
}
```

**What to check:**
- ✅ Status is 200 OK
- ✅ Response status is "success"
- ✅ Session ID is generated
- ✅ Token is provided

---

### Phase 2: SSE Connection

```
📡 [SSE] Connecting to SSE stream...
📡 [SSE] URL: https://www.bahar.co.il/location/api/stream-sse.php?token=4Q9j0INedMHobgNd...
📡 [SSE] Start time: 2025-11-03T12:08:45.123Z
📡 [SSE] Response received
📡 [SSE] Status: 200 OK
📡 [SSE] Headers: {
  contentType: "text/event-stream",
  contentEncoding: null,
  transferEncoding: "chunked",
  cacheControl: "no-cache, no-store, must-revalidate"
}
✅ [SSE] SSE connection established
```

**What to check:**
- ✅ Status is 200 OK
- ✅ Content-Type is "text/event-stream"
- ✅ Transfer-Encoding is "chunked"
- ✅ Cache-Control headers are set

---

### Phase 3: Connected Event

```
✅ [SSE] Connected event received
✅ [SSE] Connected data: {
  timestamp: "2025-11-03T12:08:45.456Z",
  session_id: "sess_abc123...",
  user_id: 1003,
  active_devices: 1,
  timestamp_from_server: "2025-11-03T12:08:45Z"
}
```

**What to check:**
- ✅ Connected event received within 1-2 seconds
- ✅ Session ID matches
- ✅ User ID is correct
- ✅ Active devices count is correct

---

### Phase 4: Location Events

```
📍 [SSE] Location update received
📍 [SSE] Location data: {
  timestamp: "2025-11-03T12:08:50.789Z",
  device_id: "device_aa9e19da71fc702b",
  username: "Adar",
  latitude: 32.0853,
  longitude: 34.7818,
  accuracy: 10,
  speed: 45,
  bearing: 180,
  battery_level: 85,
  change_reason: "distance",
  recorded_at: "2025-11-03T12:08:50Z",
  server_time: "2025-11-03T12:08:50Z",
  change_metrics: {
    distance_meters: 25.5,
    time_diff_seconds: 10,
    speed_change_kmh: 2.3,
    bearing_change_degrees: 8.5
  }
}
```

**What to check:**
- ✅ Location events received
- ✅ Coordinates are valid
- ✅ Change reason is one of: "distance", "time", "speed", "bearing", "first"
- ✅ Timestamps are recent

---

### Phase 5: Heartbeat Events

```
💓 [SSE] Heartbeat received
💓 [SSE] Heartbeat data: {
  timestamp: "2025-11-03T12:08:55.123Z",
  active_devices: 1,
  server_timestamp: "2025-11-03T12:08:55Z"
}
```

**What to check:**
- ✅ Heartbeat received every ~30 seconds
- ✅ Active devices count is correct
- ✅ Timestamps are recent

---

### Phase 6: Connection Ends (Normal)

```
📡 [SSE] Stream ended (done=true)
📡 [SSE] Connection summary: {
  duration: "125000ms",
  totalChunks: 45,
  totalBytes: 8234,
  totalEvents: 12,
  lastEvent: "loc",
  lastEventTime: "2025-11-03T12:10:45.123Z"
}
```

**What to check:**
- ✅ Duration is reasonable
- ✅ Total events received
- ✅ Last event type and time

---

### Phase 7: Connection Ends (Server Closes)

```
👋 [SSE] Server closing connection
👋 [SSE] Bye data: {
  timestamp: "2025-11-03T12:10:45.123Z",
  reason: "Session expired",
  message: "Your session has expired",
  code: "SESSION_EXPIRED"
}
```

**What to check:**
- ✅ Reason for closure
- ✅ Error code
- ✅ Message from server

---

### Phase 8: User Disconnects

```
🔌 [SSE] Disconnecting from stream...
🔌 [SSE] Stream disconnected
🔌 [SSE] Connection aborted by user
🔌 [SSE] Connection summary: {
  duration: "125000ms",
  totalBytes: 8234,
  totalEvents: 12,
  lastEvent: "loc",
  reason: "User called disconnect()"
}
```

**What to check:**
- ✅ Disconnect called successfully
- ✅ Connection duration
- ✅ Total events received

---

### Phase 9: Session Revocation

```
🔑 [SESSION] Revoking session...
🔑 [SESSION] Session token: 4Q9j0INedMHobgNd...
🔑 [SESSION] Revoke response: {
  status: 200,
  statusText: "OK"
}
✅ [SESSION] Session revoked successfully
```

**What to check:**
- ✅ Status is 200 OK
- ✅ Session revoked message

---

## 🐛 Common Issues & Debugging

### Issue 1: Connection Closes Immediately

**Logs to look for:**
```
📡 [SSE] Stream ended (done=true)
📡 [SSE] Connection summary: {
  duration: "100ms",  ← Very short!
  totalEvents: 0      ← No events received
}
```

**Possible causes:**
1. Invalid session token
2. User ID doesn't exist
3. Server error
4. Network issue

**How to debug:**
- Check session creation logs for errors
- Verify user_id exists in database
- Check server logs for errors
- Check network tab in DevTools

---

### Issue 2: No Location Events

**Logs to look for:**
```
✅ [SSE] Connected event received
💓 [SSE] Heartbeat received
💓 [SSE] Heartbeat received
(no location events)
```

**Possible causes:**
1. No devices for this user
2. Devices not sending location data
3. Location data not meeting change thresholds

**How to debug:**
- Check if user has active devices
- Verify devices are sending location data
- Check if location changes meet thresholds (>20m, >5min, etc.)

---

### Issue 3: Connection Crashes

**Logs to look for:**
```
❌ [SSE] Connection error: Read timed out
❌ [SSE] Error details: {
  name: "TypeError",
  message: "Failed to fetch",
  duration: "45000ms",
  totalEvents: 5
}
```

**Possible causes:**
1. Server timeout
2. Network disconnection
3. Server crash
4. Firewall/proxy issue

**How to debug:**
- Check server logs
- Check network connectivity
- Check firewall rules
- Try from different network

---

### Issue 4: Parse Errors

**Logs to look for:**
```
❌ [SSE] Failed to parse SSE data
❌ [SSE] Parse error details: {
  error: "Unexpected token",
  rawData: "invalid json...",
  dataLength: 45,
  dataPreview: "invalid json..."
}
```

**Possible causes:**
1. Server sending invalid JSON
2. Corrupted data
3. Encoding issue

**How to debug:**
- Check server code for JSON generation
- Verify data encoding
- Check for special characters

---

## 🔧 How to Use for Debugging

### Step 1: Open DevTools
```
Chrome/Firefox: F12 or Cmd+Option+I
```

### Step 2: Go to Console Tab
```
Click "Console" tab
```

### Step 3: Filter Logs
```
Filter by [SESSION] to see session logs
Filter by [SSE] to see connection logs
Filter by ❌ to see errors
```

### Step 4: Start Tracking
```
Click "Start Tracking" button in your app
```

### Step 5: Analyze Logs
```
Look for:
- Session creation success
- Connection established
- Connected event received
- Location events received
- Heartbeat events every 30s
- Connection end reason
```

---

## 📋 Debugging Checklist

- [ ] Session created successfully
- [ ] Session token generated
- [ ] SSE connection established (HTTP 200)
- [ ] Content-Type is text/event-stream
- [ ] Connected event received
- [ ] Location events received (or heartbeats)
- [ ] Heartbeat every ~30 seconds
- [ ] No parse errors
- [ ] Connection duration reasonable
- [ ] Disconnect/revoke successful

---

## 🔗 Related Files

- `LocationApiClient-fixed.js` - Enhanced client with logging
- `REACT_LIVE_TRACKING_EXAMPLE.md` - React component examples
- `SSE_IMPLEMENTATION_CHECKLIST.md` - Implementation guide

---

## 💡 Pro Tips

1. **Copy logs to file:**
   ```javascript
   // In console
   copy(console.log.toString())
   ```

2. **Export console logs:**
   - Right-click console → Save as...

3. **Share with backend team:**
   - Copy entire console output
   - Include connection duration
   - Include error messages
   - Include last event received

4. **Monitor in real-time:**
   - Keep console open while tracking
   - Watch for heartbeats every 30s
   - Note any gaps in events

---

**Version:** 2.1.2-http1-fix-debug
**Last Updated:** November 3, 2025

