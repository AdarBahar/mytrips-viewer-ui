# Backend SSE Requirements Summary

## What the Frontend Needs

The frontend needs a **Server-Sent Events (SSE) proxy endpoint** on the backend to stream live location data. This endpoint must:

1. **Accept SSE requests** from the browser
2. **Inject authentication** server-side (because EventSource API can't send custom headers)
3. **Forward requests** to the MyTrips API
4. **Stream responses** back to the browser

---

## Why This Is Needed

### Problem
- Browser's `EventSource` API cannot send custom headers
- `LOC_API_TOKEN` cannot be exposed to the browser
- Frontend cannot call MyTrips API directly for SSE

### Solution
- Backend proxy endpoint that injects the token server-side
- Frontend calls backend proxy instead of MyTrips API directly
- Token stays secure on the backend

---

## Endpoint Specification

### Route
```
GET /location/live/sse
```

### Query Parameters (forwarded to MyTrips API)
```
?all=true                                    # All users/devices
?users=Adar&users=Ben                        # Specific users (repeatable)
?devices=dev1&devices=dev2                   # Specific devices (repeatable)
?since=1727786097001                         # Resume from timestamp
?heartbeat=10                                # Keep-alive interval (seconds)
?limit=100                                   # Max points per cycle (1-500)
```

### Response Format
```
Content-Type: text/event-stream

event: point
data: {"user":"Adar","device":"phone","lat":32.0853,"lon":34.7818,"timestamp":1727786097001}

event: point
data: {"user":"Ben","device":"watch","lat":32.0855,"lon":34.7820,"timestamp":1727786099001}

event: heartbeat
data: {}
```

---

## Implementation Checklist

- [ ] Create endpoint at `GET /location/live/sse`
- [ ] Read `LOC_API_TOKEN` from environment variable
- [ ] Read `MYTRIPS_API_BASEURL` from environment variable
- [ ] Validate both environment variables are set
- [ ] Forward all query parameters to MyTrips API
- [ ] Add `X-API-Token: {LOC_API_TOKEN}` header
- [ ] Add `Accept: text/event-stream` header
- [ ] Stream response from MyTrips API back to browser
- [ ] Return `Content-Type: text/event-stream`
- [ ] Add response headers:
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`
  - `X-Accel-Buffering: no`
- [ ] Handle errors gracefully (return error events)
- [ ] Support async/await for streaming
- [ ] Allow long-lived connections (no timeout)

---

## Error Handling

Return SSE error events for these cases:

```
# Missing LOC_API_TOKEN
event: error
data: {"error":"API token not configured"}

# Missing MYTRIPS_API_BASEURL
event: error
data: {"error":"API base URL not configured"}

# MyTrips API returns non-200
event: error
data: {"error":"API returned 401"}

# Connection timeout
event: error
data: {"error":"API timeout"}

# Other exceptions
event: error
data: {"error":"Connection refused"}
```

---

## Environment Variables Required

```bash
# Authentication token for MyTrips API
LOC_API_TOKEN=your-token-here

# Base URL of MyTrips API
MYTRIPS_API_BASEURL=https://mytrips-api.bahar.co.il
```

---

## Testing

### With curl
```bash
curl -N \
  -H 'Accept: text/event-stream' \
  "http://localhost:8000/location/live/sse?users=Adar&heartbeat=2&limit=1"
```

### With browser
```javascript
const es = new EventSource('/location/live/sse?users=Adar&heartbeat=10&limit=100');

es.addEventListener('point', (event) => {
  const point = JSON.parse(event.data);
  console.log('Location:', point);
});

es.addEventListener('error', (event) => {
  console.error('SSE Error:', event);
});
```

---

## Frontend Integration

The frontend will call:
```
GET /location/live/sse?users=Adar&heartbeat=10&limit=100
```

The backend should forward to:
```
GET https://mytrips-api.bahar.co.il/location/live/sse?users=Adar&heartbeat=10&limit=100
```

With headers:
```
X-API-Token: {LOC_API_TOKEN}
Accept: text/event-stream
```

---

## Reference Implementation

See `BACKEND_SSE_ENDPOINT_SPEC.md` for:
- Complete Python implementation example
- Detailed specification
- All query parameters
- Error handling
- Dependencies

---

## Questions?

Refer to:
1. `BACKEND_SSE_ENDPOINT_SPEC.md` - Full specification with code example
2. `SSE_ENDPOINT_ARCHITECTURE.md` - Architecture and request flow diagram

