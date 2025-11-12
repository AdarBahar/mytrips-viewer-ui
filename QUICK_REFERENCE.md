# SSE Replacement - Quick Reference

## 📁 New Files

### 1. LocationApiClientNew.js
**Path:** `frontend/src/services/LocationApiClientNew.js`
**Size:** ~200 lines
**Purpose:** Service class for SSE connection

**Main Methods:**
```javascript
connect(params)        // Connect to SSE stream
disconnect()          // Close connection
resume(params)        // Resume from last event
isConnected()         // Check connection status
getLastEventId()      // Get last event ID
```

### 2. useLiveLocations.js
**Path:** `frontend/src/hooks/useLiveLocations.js`
**Size:** ~200 lines
**Purpose:** React hook for SSE integration

**Returns:**
```javascript
{
  connected,      // boolean - Connection status
  points,         // array - Received location points
  error,          // Error object or null
  lastEventId,    // string - Last event ID
  disconnect,     // function - Disconnect
  resume          // function - Resume from last event
}
```

---

## 🔗 Endpoint Comparison

| Aspect | Old | New |
|--------|-----|-----|
| **Endpoint** | `/location/stream-sse` | `/location/live/sse` |
| **Proxy** | None | `/api/location/live/sse` |
| **Auth** | Session token | Query parameters |
| **Implementation** | Fetch + manual parsing | EventSource |
| **Event Types** | 4 types | 1 type: `point` |
| **Filtering** | Session-based | Query parameters |

---

## 📝 Usage Examples

### React Hook (Recommended)

```javascript
import { useLiveLocations } from '../hooks/useLiveLocations';

function MyComponent() {
  const { connected, points, error } = useLiveLocations({
    users: ['adar', 'ben'],
    heartbeat: 15,
    limit: 100,
    enabled: true
  });

  useEffect(() => {
    if (points.length > 0) {
      const latest = points[points.length - 1];
      console.log('Location:', latest.latitude, latest.longitude);
    }
  }, [points]);

  return (
    <div>
      <p>{connected ? '🟢 Connected' : '🔴 Disconnected'}</p>
      <p>Points: {points.length}</p>
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}
```

### Service Class

```javascript
import LocationApiClient from '../services/LocationApiClientNew';

const client = new LocationApiClient();

client.connect({
  all: true,
  heartbeat: 15,
  limit: 100,
  onPoint: (point) => {
    console.log('Point:', point);
  },
  onError: (error) => {
    console.error('Error:', error);
  },
  onConnected: () => {
    console.log('Connected!');
  }
});

// Later
client.disconnect();
```

---

## 🔍 Query Parameters

```
/api/location/live/sse?users=adar&users=ben&heartbeat=15&limit=100
```

| Parameter | Type | Default | Example |
|-----------|------|---------|---------|
| `all` | boolean | false | `?all=true` |
| `users` | string[] | [] | `?users=adar&users=ben` |
| `devices` | string[] | [] | `?devices=dev1&devices=dev2` |
| `since` | number | null | `?since=1727786097001` |
| `heartbeat` | number | 15 | `?heartbeat=10` |
| `limit` | number | 100 | `?limit=50` |

---

## 📊 Event Data

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

## 🚀 Migration Steps

### Step 1: Import Hook
```javascript
import { useLiveLocations } from '../hooks/useLiveLocations';
```

### Step 2: Replace State
```javascript
// OLD
const eventSourceRef = useRef(null);
const [sseConnected, setSseConnected] = useState(false);

// NEW
const { connected, points, error } = useLiveLocations({
  users: selectedUser ? [selectedUser] : [],
  enabled: isLiveTracking
});
```

### Step 3: Handle Points
```javascript
useEffect(() => {
  if (points.length > 0) {
    const latest = points[points.length - 1];
    updateMap(latest);
  }
}, [points]);
```

### Step 4: Remove Old Code
- Remove old SSE useEffect
- Remove polling fallback
- Remove manual event parsing

---

## ✅ Checklist

- [ ] Review new files
- [ ] Review migration guide
- [ ] Update MapDashboard.js
- [ ] Test connection
- [ ] Test point reception
- [ ] Test error handling
- [ ] Test disconnect
- [ ] Remove old code
- [ ] Deploy to production

---

## 🔧 Proxy Route Setup

Create: `frontend/app/api/location/live/sse/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const backendUrl = new URL(
    `${process.env.MYTRIPS_API_BASEURL}/location/live/sse`
  );
  
  searchParams.forEach((value, key) => {
    backendUrl.searchParams.append(key, value);
  });

  const response = await fetch(backendUrl.toString(), {
    headers: {
      'X-API-Token': process.env.LOC_API_TOKEN || '',
      'Accept': 'text/event-stream'
    }
  });

  return new NextResponse(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
```

---

## 📚 Documentation

1. **SSE_ENDPOINT_MIGRATION_GUIDE.md** - Detailed migration
2. **MAPDASHBOARD_SSE_UPDATE_EXAMPLE.md** - Code examples
3. **SSE_ARCHITECTURE.md** - System design
4. **SSE_REPLACEMENT_SUMMARY.md** - Overview
5. **IMPLEMENTATION_DELIVERABLES.md** - Deliverables
6. **QUICK_REFERENCE.md** - This file

---

## 🆘 Troubleshooting

### Connection fails
- Ensure you pass at least one filter (users/devices) or all=true
- Check proxy route is configured
- Check LOC_API_TOKEN is set

### No events received
- Verify user/device has location data
- Check browser console for errors
- Try with all=true

### Connection drops
- Increase heartbeat value
- Check network conditions
- Verify backend is running

---

## 📞 Support

1. Review the migration guide
2. Check code examples
3. Review architecture documentation
4. Check troubleshooting section

---

**Version:** 1.0
**Date:** November 11, 2025
**Status:** Ready for implementation

