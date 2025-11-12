/**
 * Location API Client - SSE Integration with Backend Proxy
 *
 * This version uses the backend's `/api/location/live/sse` endpoint with EventSource.
 * The backend injects X-API-Token server-side, so no custom headers needed.
 *
 * @version 3.1.0-backend-proxy
 * @date 2025-11-12
 *
 * ============================================================================
 * BACKEND SSE ENDPOINT INTEGRATION
 * ============================================================================
 *
 * Backend SSE endpoint: `${REACT_APP_MYTRIPS_API_BASEURL}/api/location/live/sse`
 * Protocol: text/event-stream (SSE)
 * Event type: `point` with JSON payload per location record
 *
 * How it works:
 * - Browser calls backend SSE endpoint directly (cross-origin, CORS enabled)
 * - Backend injects X-API-Token header server-side
 * - Backend forwards to MyTrips API and streams response back
 * - No custom headers needed from browser (EventSource limitation)
 *
 * ============================================================================
 * EVENT SCHEMA
 * ============================================================================
 *
 * Each `point` event carries JSON data:
 *
 * {
 *   "device_id": "dev-123",
 *   "user_id": 42,
 *   "username": "adar",
 *   "display_name": "Adar Bahar",
 *   "latitude": 32.0777,
 *   "longitude": 34.7733,
 *   "accuracy": 6.0,
 *   "altitude": 20.5,
 *   "speed": 1.2,
 *   "bearing": 270,
 *   "battery_level": 0.78,
 *   "recorded_at": "2024-10-01T12:34:56Z",
 *   "server_time": "2024-10-01T12:34:57.001Z",
 *   "server_timestamp": 1727786097001
 * }
 *
 * Notes:
 * - Each event has an SSE `id` equal to `server_timestamp` for resume
 * - Keep-alive comments look like `: keep-alive <ms>`
 * - Keep-alives are not delivered to onmessage and do not have data
 *
 * ============================================================================
 */

class LocationApiClient {
  constructor(proxyBaseUrl) {
    // proxyBaseUrl should be the full backend SSE endpoint URL
    // e.g., https://mytrips-api.bahar.co.il/api/location/live/sse
    this.proxyBaseUrl = proxyBaseUrl;
    this.eventSource = null;
    this.lastEventId = null;
  }

  /**
   * Connect to live location stream using the new SSE endpoint
   * 
   * @param {Object} params - Connection parameters
   * @param {boolean} params.all - Include all users/devices (disables other filters)
   * @param {Array<string>} params.users - Usernames to track
   * @param {Array<string>} params.devices - Device IDs to track
   * @param {number} params.since - Resume cursor (ms since epoch)
   * @param {number} params.heartbeat - Keep-alive interval in seconds (default: 15)
   * @param {number} params.limit - Max points per cycle (1-500, default: 100)
   * @param {function} params.onPoint - Callback for point events: (point) => void
   * @param {function} params.onError - Optional callback for errors: (error) => void
   * @param {function} params.onConnected - Optional callback when connected: () => void
   * @returns {void}
   */
  connect(params) {
    const {
      all = false,
      users = [],
      devices = [],
      since = null,
      heartbeat = 15,
      limit = 100,
      onPoint,
      onError = null,
      onConnected = null
    } = params;

    if (!onPoint) {
      throw new Error('onPoint callback is required');
    }

    // Build query parameters
    const qs = new URLSearchParams();
    
    if (all) {
      qs.set('all', 'true');
    } else {
      // Must pass at least one filter or all=true
      if (users.length === 0 && devices.length === 0) {
        throw new Error('Must pass at least one filter (users/devices) or set all=true');
      }
      users.forEach(u => qs.append('users', u));
      devices.forEach(d => qs.append('devices', d));
    }

    if (since != null) qs.set('since', String(since));
    if (heartbeat) qs.set('heartbeat', String(heartbeat));
    if (limit) qs.set('limit', String(limit));

    const url = `${this.proxyBaseUrl}?${qs.toString()}`;

    console.log('📡 [SSE] Connecting to live location stream...');
    console.log('📡 [SSE] URL:', url);
    console.log('📡 [SSE] Params:', { all, users, devices, since, heartbeat, limit });

    try {
      this.eventSource = new EventSource(url);

      // Handle connection open
      this.eventSource.addEventListener('open', () => {
        console.log('✅ [SSE] Connection established');
        if (onConnected) onConnected();
      });

      // Handle point events
      this.eventSource.addEventListener('point', (event) => {
        try {
          if (event.lastEventId) {
            this.lastEventId = event.lastEventId;
          }
          const point = JSON.parse(event.data);
          console.log('📍 [SSE] Point received:', {
            username: point.username,
            lat: point.latitude,
            lng: point.longitude,
            timestamp: point.server_timestamp
          });
          if (onPoint) onPoint(point);
        } catch (e) {
          console.error('❌ [SSE] Failed to parse point event:', e);
        }
      });

      // Handle errors
      this.eventSource.addEventListener('error', (event) => {
        console.error('❌ [SSE] Connection error:', event);
        if (onError) onError(event);
      });

    } catch (error) {
      console.error('❌ [SSE] Failed to create EventSource:', error);
      if (onError) onError(error);
    }
  }

  /**
   * Disconnect from the SSE stream
   */
  disconnect() {
    if (this.eventSource) {
      console.log('🔌 [SSE] Disconnecting from stream...');
      this.eventSource.close();
      this.eventSource = null;
      this.lastEventId = null;
    }
  }

  /**
   * Resume connection from last event ID
   * Useful for reconnecting after page reload
   */
  resume(params) {
    if (this.lastEventId) {
      console.log('📡 [SSE] Resuming from event ID:', this.lastEventId);
      this.connect({
        ...params,
        since: parseInt(this.lastEventId)
      });
    } else {
      this.connect(params);
    }
  }

  /**
   * Get the last event ID for persistence
   * @returns {string|null} Last event ID or null
   */
  getLastEventId() {
    return this.lastEventId;
  }

  /**
   * Check if currently connected
   * @returns {boolean} True if connected
   */
  isConnected() {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }
}

export default LocationApiClient;

