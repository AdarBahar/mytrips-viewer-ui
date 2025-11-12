# SSE Architecture - New Implementation

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Frontend)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  React Component (MapDashboard.js)                       │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │ const { connected, points } = useLiveLocations({  │  │   │
│  │  │   users: ['adar'],                                 │  │   │
│  │  │   heartbeat: 15,                                   │  │   │
│  │  │   limit: 100                                       │  │   │
│  │  │ })                                                 │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                    │
│                              ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  useLiveLocations Hook                                   │   │
│  │  (frontend/src/hooks/useLiveLocations.js)               │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │ • Manages connection lifecycle                     │  │   │
│  │  │ • Handles point events                             │  │   │
│  │  │ • Manages error state                              │  │   │
│  │  │ • Provides disconnect/resume methods               │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                    │
│                              ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  LocationApiClient Service                              │   │
│  │  (frontend/src/services/LocationApiClientNew.js)        │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │ • Creates EventSource                              │  │   │
│  │  │ • Builds query parameters                          │  │   │
│  │  │ • Handles point events                             │  │   │
│  │  │ • Manages connection state                         │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                    │
│                              ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  EventSource API (Native Browser)                        │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │ new EventSource('/api/location/live/sse?...')     │  │   │
│  │  │ • Automatic reconnection                           │  │   │
│  │  │ • Last-Event-ID support                            │  │   │
│  │  │ • Keep-alive handling                              │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                    │
└──────────────────────────────┼────────────────────────────────────┘
                               │
                               │ HTTP GET
                               │ /api/location/live/sse?users=adar
                               │
┌──────────────────────────────┼────────────────────────────────────┐
│                              ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Next.js Proxy Route                                     │   │
│  │  (frontend/app/api/location/live/sse/route.ts)          │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │ • Receives: /api/location/live/sse?users=adar     │  │   │
│  │  │ • Injects: X-API-Token header (server-side)       │  │   │
│  │  │ • Forwards: to backend /location/live/sse         │  │   │
│  │  │ • Returns: SSE stream to browser                  │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                    │
│                              ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  HTTP/1.1 Connection (Same-origin)                       │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │ GET /location/live/sse?users=adar                 │  │   │
│  │  │ X-API-Token: <LOC_API_TOKEN>                      │  │   │
│  │  │ Accept: text/event-stream                         │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                    │
└──────────────────────────────┼────────────────────────────────────┘
                               │
                               │ HTTP GET
                               │ /location/live/sse?users=adar
                               │ X-API-Token: <LOC_API_TOKEN>
                               │
┌──────────────────────────────┼────────────────────────────────────┐
│                              ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Backend SSE Endpoint                                    │   │
│  │  (MyTrips API: https://mytrips-api.bahar.co.il)         │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │ GET /location/live/sse                             │  │   │
│  │  │ • Validates X-API-Token                            │  │   │
│  │  │ • Parses query parameters (users, devices, etc)   │  │   │
│  │  │ • Streams location points as SSE events            │  │   │
│  │  │ • Sends keep-alive comments every 15s              │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                    │
│                              ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Location Database                                       │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │ • Queries location points for specified users      │  │   │
│  │  │ • Filters by devices if specified                  │  │   │
│  │  │ • Returns points as SSE stream                     │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Connection Initiation

```
User clicks "Start Tracking"
         │
         ▼
setIsLiveTracking(true)
         │
         ▼
useLiveLocations hook detects enabled=true
         │
         ▼
LocationApiClient.connect() called
         │
         ▼
new EventSource('/api/location/live/sse?users=adar')
         │
         ▼
Browser sends HTTP GET to proxy route
         │
         ▼
Proxy injects X-API-Token header
         │
         ▼
Backend receives request with token
         │
         ▼
Backend validates token and starts streaming
```

### 2. Point Reception

```
Backend detects new location point
         │
         ▼
Formats as SSE event:
  id: <server_timestamp>
  event: point
  data: {"latitude": 32.0777, ...}
         │
         ▼
Sends to browser via HTTP stream
         │
         ▼
EventSource receives 'point' event
         │
         ▼
Hook's onPoint callback triggered
         │
         ▼
setPoints([...prev, point])
         │
         ▼
Component re-renders with new location
         │
         ▼
Map updates with new marker position
```

### 3. Disconnection

```
User clicks "Stop Tracking"
         │
         ▼
setIsLiveTracking(false)
         │
         ▼
useLiveLocations hook detects enabled=false
         │
         ▼
LocationApiClient.disconnect() called
         │
         ▼
eventSource.close()
         │
         ▼
Browser closes HTTP connection
         │
         ▼
Backend stops streaming
```

---

## Query Parameters

The SSE endpoint supports flexible filtering:

```
/api/location/live/sse?users=adar&users=ben&heartbeat=15&limit=100
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `all` | boolean | false | Include all users/devices |
| `users` | string[] | [] | Usernames to track (repeatable) |
| `devices` | string[] | [] | Device IDs to track (repeatable) |
| `since` | number | null | Resume from timestamp (ms) |
| `heartbeat` | number | 15 | Keep-alive interval (seconds) |
| `limit` | number | 100 | Max points per cycle (1-500) |

---

## Event Schema

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

## Error Handling

```
Connection Error
         │
         ▼
EventSource 'error' event triggered
         │
         ▼
Hook's onError callback called
         │
         ▼
setError(error)
         │
         ▼
Component displays error message
         │
         ▼
EventSource automatically retries
```

---

## Resume Support

```
Page reload or connection drop
         │
         ▼
lastEventId stored in hook state
         │
         ▼
User calls resume()
         │
         ▼
LocationApiClient.resume() called
         │
         ▼
connect() called with since=lastEventId
         │
         ▼
Backend resumes from that timestamp
         │
         ▼
No missed points (if within retention)
```

---

**Status:** Architecture documented
**Version:** 1.0
**Date:** November 11, 2025

