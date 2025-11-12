# SSE Debugging Quick Start Guide

## 🚀 Get Started in 2 Minutes

### Step 1: Update Your Code
```bash
# Copy the enhanced client with detailed logging
cp LocationApiClient-fixed.js src/services/LocationApiClient.js
```

### Step 2: Open DevTools
```
Chrome/Firefox: F12
Mac: Cmd+Option+I
Windows: Ctrl+Shift+I
```

### Step 3: Go to Console
Click the "Console" tab in DevTools

### Step 4: Start Tracking
Click "Start Tracking" button in your app

### Step 5: Watch the Logs
You'll see detailed logs for every step!

---

## 📊 What You'll See

### Successful Connection
```
🔑 [SESSION] Creating new session...
✅ [SESSION] Session created successfully: {...}
📡 [SSE] Connecting to SSE stream...
✅ [SSE] SSE connection established
✅ [SSE] Connected event received
📍 [SSE] Location update received
💓 [SSE] Heartbeat received
```

### Connection Closes
```
👋 [SSE] Server closing connection
👋 [SSE] Bye data: { reason: "Session expired", ... }
```

### Connection Crashes
```
❌ [SSE] Connection error: Read timed out
❌ [SSE] Error details: { duration: "45000ms", totalEvents: 5 }
```

---

## 🔍 Quick Diagnosis

### Problem: Connection Closes Immediately
**Look for:**
```
✅ [SSE] SSE connection established
📡 [SSE] Stream ended (done=true)
📡 [SSE] Connection summary: { duration: "100ms", totalEvents: 0 }
```
**Cause:** Invalid session or server error
**Fix:** Check user_id and API token

---

### Problem: No Location Events
**Look for:**
```
✅ [SSE] Connected event received
💓 [SSE] Heartbeat received
(no location events)
```
**Cause:** No devices or no location changes
**Fix:** Check if user has active devices

---

### Problem: Connection Timeout
**Look for:**
```
❌ [SSE] Connection error: Read timed out
❌ [SSE] Error details: { duration: "300000ms" }
```
**Cause:** Server timeout or network issue
**Fix:** Check server logs and network

---

### Problem: Parse Error
**Look for:**
```
❌ [SSE] Failed to parse SSE data
❌ [SSE] Parse error details: { error: "Unexpected token" }
```
**Cause:** Server sending invalid JSON
**Fix:** Check server code for JSON generation

---

## 📋 Log Checklist

When debugging, verify these logs appear:

- [ ] `🔑 [SESSION] Creating new session...`
- [ ] `✅ [SESSION] Session created successfully`
- [ ] `📡 [SSE] Connecting to SSE stream...`
- [ ] `✅ [SSE] SSE connection established`
- [ ] `✅ [SSE] Connected event received`
- [ ] `📍 [SSE] Location update received` (or heartbeats)
- [ ] `💓 [SSE] Heartbeat received` (every 30s)
- [ ] `🔌 [SSE] Stream disconnected` (when stopping)
- [ ] `✅ [SESSION] Session revoked successfully`

---

## 🎯 Information to Share with Backend Team

When reporting issues, copy these logs:

1. **Session Creation**
   ```
   🔑 [SESSION] Creating new session...
   ✅ [SESSION] Session created successfully: {...}
   ```

2. **Connection Attempt**
   ```
   📡 [SSE] Connecting to SSE stream...
   ✅ [SSE] SSE connection established
   ```

3. **Events Received**
   ```
   ✅ [SSE] Connected event received
   📍 [SSE] Location update received
   💓 [SSE] Heartbeat received
   ```

4. **Connection End**
   ```
   📡 [SSE] Connection summary: {...}
   ```

5. **Any Errors**
   ```
   ❌ [SSE] Connection error: ...
   ❌ [SSE] Error details: {...}
   ```

---

## 💾 How to Save Logs

### Option 1: Copy from Console
```
1. Right-click in console
2. Select "Save as..."
3. Choose location
```

### Option 2: Export to Text
```
1. Select all logs (Ctrl+A)
2. Copy (Ctrl+C)
3. Paste into text editor
4. Save as .txt file
```

### Option 3: Screenshot
```
1. Press Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows)
2. Type "Screenshot"
3. Select "Capture full page screenshot"
```

---

## 🔗 Log Categories

Filter logs by typing in console:

| Filter | Shows |
|--------|-------|
| `[SESSION]` | Session creation/revocation |
| `[SSE]` | Connection and events |
| `❌` | Errors only |
| `✅` | Success messages |
| `💓` | Heartbeats only |
| `📍` | Location updates only |

---

## 📊 Connection Summary

When connection ends, you'll see:
```javascript
{
  duration: "125000ms",        // How long it was open
  totalChunks: 45,             // Data packets received
  totalBytes: 8234,            // Total data transferred
  totalEvents: 12,             // Number of events
  lastEvent: "loc",            // Last event type
  lastEventTime: "2025-11-03T12:10:45.123Z"
}
```

---

## 🚨 Common Error Messages

| Error | Meaning | Fix |
|-------|---------|-----|
| `HTTP 401: Unauthorized` | Invalid API token | Check token |
| `HTTP 404: Not Found` | Wrong endpoint | Check URL |
| `Read timed out` | Server timeout | Check server |
| `Failed to fetch` | Network error | Check connection |
| `Unexpected token` | Invalid JSON | Check server code |

---

## 💡 Pro Tips

1. **Keep console open** while tracking
2. **Watch for heartbeats** every 30 seconds
3. **Note any gaps** in events
4. **Copy full logs** when reporting issues
5. **Include timestamps** in bug reports

---

## 📚 Related Documentation

- `SSE_DEBUGGING_GUIDE.md` - Detailed guide
- `CONSOLE_LOG_REFERENCE.md` - Log reference
- `LocationApiClient-fixed.js` - Source code
- `ENHANCED_DEBUGGING_SUMMARY.md` - Full summary

---

## ✨ What's New

The enhanced `LocationApiClient-fixed.js` now logs:

✅ Session creation details
✅ Connection parameters
✅ HTTP status and headers
✅ Event data with timestamps
✅ Connection statistics
✅ Error details
✅ Disconnection reason

---

## 🎯 Next Steps

1. **Update your code** with enhanced client
2. **Open DevTools** console
3. **Start tracking** in your app
4. **Watch the logs** for connection lifecycle
5. **Share logs** with backend team if issues

---

**Version:** 2.1.2-http1-fix-debug
**Last Updated:** November 3, 2025
**Status:** Ready to Use ✅

