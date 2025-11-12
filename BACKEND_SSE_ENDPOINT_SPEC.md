# Backend SSE Endpoint Specification

## Overview

The frontend needs a **Server-Sent Events (SSE) proxy endpoint** on the backend to stream live location data from the MyTrips API. This endpoint must inject authentication credentials server-side because the browser's EventSource API cannot send custom headers.

---

## Endpoint Specification

### Route
```
GET /location/live/sse
```

### Purpose
Proxy SSE requests from the browser to the MyTrips API while injecting the `X-API-Token` header for authentication.

---

## Request

### URL
```
GET /location/live/sse?users=Adar&heartbeat=10&limit=100
```

### Query Parameters (all forwarded to MyTrips API)

| Parameter | Type | Required | Example | Description |
|-----------|------|----------|---------|-------------|
| `all` | boolean | No | `true` | Include all users/devices |
| `users` | string (repeatable) | No | `?users=adar&users=ben` | Filter by username (can repeat) |
| `devices` | string (repeatable) | No | `?devices=dev1&devices=dev2` | Filter by device ID (can repeat) |
| `since` | number | No | `1727786097001` | Resume from timestamp (milliseconds) |
| `heartbeat` | number | No | `10` | Keep-alive interval in seconds |
| `limit` | number | No | `100` | Max points per cycle (1-500) |

### Example Requests

```bash
# Get all users
curl -N "http://localhost:8000/location/live/sse?all=true&heartbeat=10&limit=100"

# Get specific users
curl -N "http://localhost:8000/location/live/sse?users=Adar&users=Ben&heartbeat=10&limit=100"

# Get specific devices
curl -N "http://localhost:8000/location/live/sse?devices=device1&devices=device2&heartbeat=10"

# Resume from timestamp
curl -N "http://localhost:8000/location/live/sse?all=true&since=1727786097001"
```

---

## Response

### Content-Type
```
text/event-stream
```

### Headers
```
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

### Response Format

SSE stream with location point events:

```
event: point
data: {"user":"Adar","device":"phone","lat":32.0853,"lon":34.7818,"timestamp":1727786097001,"accuracy":10}

event: point
data: {"user":"Adar","device":"phone","lat":32.0854,"lon":34.7819,"timestamp":1727786098001,"accuracy":10}

event: heartbeat
data: {}

event: point
data: {"user":"Ben","device":"watch","lat":32.0855,"lon":34.7820,"timestamp":1727786099001,"accuracy":15}
```

### Error Response

If authentication fails or API is unavailable:

```
event: error
data: {"error":"API token not configured"}
```

---

## Implementation Requirements

### 1. Read Environment Variables

```python
LOC_API_TOKEN = os.environ.get('LOC_API_TOKEN')
MYTRIPS_API_BASEURL = os.environ.get('MYTRIPS_API_BASEURL')
```

**Required Environment Variables:**
- `LOC_API_TOKEN` - Authentication token for MyTrips API
- `MYTRIPS_API_BASEURL` - Base URL of MyTrips API (e.g., `https://mytrips-api.bahar.co.il`)

### 2. Validate Configuration

If either environment variable is missing, return an error event:

```
event: error
data: {"error":"API token not configured"}
```

### 3. Build MyTrips API URL

```
{MYTRIPS_API_BASEURL}/location/live/sse?{query_params}
```

Example:
```
https://mytrips-api.bahar.co.il/location/live/sse?users=Adar&heartbeat=10&limit=100
```

### 4. Forward Request with Authentication

Make an HTTP GET request to MyTrips API with:

**Headers:**
```
X-API-Token: {LOC_API_TOKEN}
Accept: text/event-stream
```

**Query Parameters:**
Forward all query parameters from the browser request

### 5. Stream Response

Stream the response from MyTrips API back to the browser line-by-line.

### 6. Error Handling

Handle these error cases:

| Error | Response |
|-------|----------|
| Missing `LOC_API_TOKEN` | `event: error\ndata: {"error":"API token not configured"}` |
| Missing `MYTRIPS_API_BASEURL` | `event: error\ndata: {"error":"API base URL not configured"}` |
| MyTrips API returns non-200 | `event: error\ndata: {"error":"API returned {status_code}"}` |
| Connection timeout | `event: error\ndata: {"error":"API timeout"}` |
| Other exceptions | `event: error\ndata: {"error":"{exception_message}"}` |

---

## Python Implementation Example

```python
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
import httpx
import os
import logging

router = APIRouter()

@router.get("/location/live/sse")
async def location_live_sse(request: Request):
    """SSE proxy endpoint for live location streaming."""
    
    async def stream_sse():
        LOC_API_TOKEN = os.environ.get('LOC_API_TOKEN')
        MYTRIPS_API_BASEURL = os.environ.get('MYTRIPS_API_BASEURL')
        
        # Validate configuration
        if not LOC_API_TOKEN:
            logging.error("LOC_API_TOKEN not configured")
            yield "event: error\ndata: {\"error\": \"API token not configured\"}\n\n"
            return
        
        if not MYTRIPS_API_BASEURL:
            logging.error("MYTRIPS_API_BASEURL not configured")
            yield "event: error\ndata: {\"error\": \"API base URL not configured\"}\n\n"
            return
        
        # Build MyTrips API URL
        mytrips_url = f"{MYTRIPS_API_BASEURL}/location/live/sse"
        query_params = dict(request.query_params)
        
        try:
            # Make request to MyTrips API with authentication
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream(
                    "GET",
                    mytrips_url,
                    params=query_params,
                    headers={
                        "X-API-Token": LOC_API_TOKEN,
                        "Accept": "text/event-stream"
                    }
                ) as response:
                    if response.status_code != 200:
                        logging.error(f"MyTrips API error: {response.status_code}")
                        yield f"event: error\ndata: {{\"error\": \"API returned {response.status_code}\"}}\n\n"
                        return
                    
                    # Stream response back to browser
                    async for line in response.aiter_lines():
                        if line:
                            yield line + "\n"
                        else:
                            yield "\n"
        
        except httpx.TimeoutException:
            logging.error("MyTrips API timeout")
            yield "event: error\ndata: {\"error\": \"API timeout\"}\n\n"
        except Exception as e:
            logging.error(f"SSE proxy error: {str(e)}")
            yield f"event: error\ndata: {{\"error\": \"{str(e)}\"}}\n\n"
    
    return StreamingResponse(
        stream_sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
```

---

## Testing

### Local Testing

```bash
# Test with curl
curl -N \
  -H 'Accept: text/event-stream' \
  "http://localhost:8000/location/live/sse?users=Adar&heartbeat=2&limit=1"
```

### Browser Testing

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

## Dependencies

### Python
- `fastapi` - Web framework
- `httpx` - Async HTTP client for forwarding requests
- `starlette` - For StreamingResponse

### Installation
```bash
pip install fastapi httpx starlette
```

---

## Notes

1. **Async Required**: Use async/await for streaming to avoid blocking
2. **Timeout**: Set `timeout=None` to allow long-lived SSE connections
3. **Buffering**: Disable buffering with `X-Accel-Buffering: no` header
4. **CORS**: Ensure CORS is configured to allow requests from frontend domain
5. **Token Security**: Never expose `LOC_API_TOKEN` to the browser

