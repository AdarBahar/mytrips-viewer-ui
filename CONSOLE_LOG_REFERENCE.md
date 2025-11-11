# Console Log Reference Card

## 🎯 Quick Log Lookup

### Session Creation Logs

```javascript
// Starting session creation
🔑 [SESSION] Creating new session...
🔑 [SESSION] Request parameters: { user_id, device_ids, duration, endpoint }

// Response received
🔑 [SESSION] Response received: { status, statusText, headers }
🔑 [SESSION] Response data: { status, message }

// Success
✅ [SESSION] Session created successfully: { session_id, expires_at, duration, token_preview }

// Error
❌ [SESSION] Failed to create session: { error, stack }
```

---

### SSE Connection Logs

```javascript
// Starting connection
📡 [SSE] Connecting to SSE stream...
📡 [SSE] URL: https://...
📡 [SSE] Start time: 2025-11-03T12:08:45.123Z

// Response received
📡 [SSE] Response received
📡 [SSE] Status: 200 OK
📡 [SSE] Headers: { contentType, contentEncoding, transferEncoding, cacheControl }

// Connection established
✅ [SSE] SSE connection established
```

---

### Event Logs

```javascript
// Connected event
✅ [SSE] Connected event received
✅ [SSE] Connected data: { session_id, user_id, active_devices, timestamp }

// Location event
📍 [SSE] Location update received
📍 [SSE] Location data: { device_id, latitude, longitude, speed, bearing, battery_level, change_reason, ... }

// Heartbeat event
💓 [SSE] Heartbeat received
💓 [SSE] Heartbeat data: { active_devices, server_timestamp }

// Error event
❌ [SSE] Error event received
❌ [SSE] Error data: { error_code, error_message, details }

// Bye event (server closing)
👋 [SSE] Server closing connection
👋 [SSE] Bye data: { reason, message, code }
```

---

### Disconnection Logs

```javascript
// User disconnect
🔌 [SSE] Disconnecting from stream...
🔌 [SSE] Stream disconnected
🔌 [SSE] Connection aborted by user
🔌 [SSE] Connection summary: { duration, totalBytes, totalEvents, lastEvent, reason }

// Stream ended normally
📡 [SSE] Stream ended (done=true)
📡 [SSE] Connection summary: { duration, totalChunks, totalBytes, totalEvents, lastEvent, lastEventTime }

// Connection error
❌ [SSE] Connection error: <error message>
❌ [SSE] Error details: { name, message, stack, duration, totalBytes, totalEvents, lastEvent }
```

---

### Session Revocation Logs

```javascript
// Starting revocation
🔑 [SESSION] Revoking session...
🔑 [SESSION] Session token: 4Q9j0INedMHobgNd...

// Response received
🔑 [SESSION] Revoke response: { status, statusText }

// Success
✅ [SESSION] Session revoked successfully

// Error
❌ [SESSION] Error revoking session: { error, stack }
⚠️ [SESSION] Failed to revoke session: { status, error }
```

---

## 📊 Expected Log Sequence

### Normal Connection Flow

```
1. 🔑 [SESSION] Creating new session...
2. 🔑 [SESSION] Request parameters: {...}
3. 🔑 [SESSION] Response received: {...}
4. 🔑 [SESSION] Response data: {...}
5. ✅ [SESSION] Session created successfully: {...}
6. 📡 [SSE] Connecting to SSE stream...
7. 📡 [SSE] URL: https://...
8. 📡 [SSE] Start time: ...
9. 📡 [SSE] Response received
10. 📡 [SSE] Status: 200 OK
11. 📡 [SSE] Headers: {...}
12. ✅ [SSE] SSE connection established
13. ✅ [SSE] Connected event received
14. ✅ [SSE] Connected data: {...}
15. 📍 [SSE] Location update received
16. 📍 [SSE] Location data: {...}
17. 💓 [SSE] Heartbeat received (every 30s)
18. 💓 [SSE] Heartbeat data: {...}
19. (repeat 15-18 as needed)
20. 🔌 [SSE] Disconnecting from stream...
21. 🔌 [SSE] Stream disconnected
22. 🔑 [SESSION] Revoking session...
23. ✅ [SESSION] Session revoked successfully
```

---

## 🔍 What Each Log Tells You

| Log | Meaning | Status |
|-----|---------|--------|
| `🔑 [SESSION] Creating...` | Session creation started | ℹ️ Info |
| `✅ [SESSION] Session created` | Session ready | ✅ Good |
| `❌ [SESSION] Failed` | Session creation failed | ❌ Error |
| `📡 [SSE] Connecting...` | Connection starting | ℹ️ Info |
| `✅ [SSE] connection established` | Connected to server | ✅ Good |
| `✅ [SSE] Connected event` | Server confirmed connection | ✅ Good |
| `📍 [SSE] Location update` | New location received | ✅ Good |
| `💓 [SSE] Heartbeat` | Connection alive | ✅ Good |
| `👋 [SSE] Server closing` | Server ended connection | ⚠️ Warning |
| `❌ [SSE] Connection error` | Connection failed | ❌ Error |
| `🔌 [SSE] Disconnected` | User ended connection | ℹ️ Info |

---

## 🚨 Error Patterns

### Pattern 1: Session Creation Failed
```
❌ [SESSION] Failed to create session: { error: "HTTP 401: Unauthorized" }
```
**Cause:** Invalid API token or user doesn't exist

---

### Pattern 2: Connection Closes Immediately
```
✅ [SSE] SSE connection established
📡 [SSE] Stream ended (done=true)
📡 [SSE] Connection summary: { duration: "100ms", totalEvents: 0 }
```
**Cause:** Invalid session token or server error

---

### Pattern 3: No Location Events
```
✅ [SSE] Connected event received
💓 [SSE] Heartbeat received
💓 [SSE] Heartbeat received
(no location events for 5+ minutes)
```
**Cause:** No devices or no location changes

---

### Pattern 4: Connection Timeout
```
❌ [SSE] Connection error: Read timed out
❌ [SSE] Error details: { duration: "300000ms" }
```
**Cause:** Server timeout or network issue

---

### Pattern 5: Parse Error
```
❌ [SSE] Failed to parse SSE data
❌ [SSE] Parse error details: { error: "Unexpected token", rawData: "..." }
```
**Cause:** Server sending invalid JSON

---

## 🎯 Debugging Steps

### Step 1: Check Session Creation
```
Look for: ✅ [SESSION] Session created successfully
If missing: Session creation failed - check API token and user_id
```

### Step 2: Check Connection
```
Look for: ✅ [SSE] SSE connection established
If missing: Connection failed - check network and server
```

### Step 3: Check Connected Event
```
Look for: ✅ [SSE] Connected event received
If missing: Server didn't send connected event - check server code
```

### Step 4: Check Location Events
```
Look for: 📍 [SSE] Location update received
If missing: No location changes or no devices - check device data
```

### Step 5: Check Heartbeats
```
Look for: 💓 [SSE] Heartbeat received (every 30s)
If missing: Connection might be dead - check network
```

### Step 6: Check Disconnection
```
Look for: 🔌 [SSE] Stream disconnected
If missing: Disconnect might have failed - check browser console
```

---

## 📋 Copy-Paste Filters

### Filter for Session Logs
```
[SESSION]
```

### Filter for Connection Logs
```
[SSE]
```

### Filter for Errors
```
❌
```

### Filter for Warnings
```
⚠️
```

### Filter for Success
```
✅
```

---

## 💾 How to Save Logs

### Option 1: Copy from Console
```
1. Right-click in console
2. Select "Save as..."
3. Choose location and filename
```

### Option 2: Export to File
```javascript
// In console, run:
const logs = document.querySelectorAll('.console-message');
const text = Array.from(logs).map(l => l.textContent).join('\n');
copy(text);
// Then paste into text editor
```

### Option 3: Screenshot
```
1. Open DevTools
2. Press Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows)
3. Type "Screenshot"
4. Select "Capture full page screenshot"
```

---

## 🔗 Related Documentation

- `SSE_DEBUGGING_GUIDE.md` - Detailed debugging guide
- `LocationApiClient-fixed.js` - Source code with logging
- `REACT_LIVE_TRACKING_EXAMPLE.md` - React examples

---

**Version:** 2.1.2-http1-fix-debug
**Last Updated:** November 3, 2025

