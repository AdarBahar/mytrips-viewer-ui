/**
 * Location API Client - Fixed for HTTP/3 (QUIC) Compatibility
 *
 * This version uses fetch-based SSE instead of native EventSource
 * to avoid net::ERR_QUIC_PROTOCOL_ERROR when using Cloudflare with HTTP/3
 *
 * @version 2.1.2-http1-fix
 * @date 2025-11-02
 *
 * ============================================================================
 * DWELL BEHAVIOR & LOCATION UPDATES
 * ============================================================================
 *
 * The SSE stream sends different events based on location changes:
 *
 * 1. LOCATION CHANGED (loc event):
 *    - Sent when significant change detected:
 *      • Distance: > 20 meters
 *      • Time: > 5 minutes (even if same location)
 *      • Speed: > 5 km/h change
 *      • Bearing: > 15° change
 *    - Contains full location data (lat, lng, speed, etc.)
 *    - Includes change_reason: "distance", "time", "speed", "bearing", or "first"
 *
 * 2. NO CHANGE (no_change event):
 *    - Sent every 30 seconds when no significant changes
 *    - Just a heartbeat to keep connection alive
 *    - Does NOT include location coordinates
 *    - Contains: {active_devices: N, timestamp: "..."}
 *
 * 3. DWELL BEHAVIOR (User Stationary):
 *    When user stays at same location:
 *    - First location sent immediately (reason: "first")
 *    - After 5 minutes, SAME location re-sent (reason: "time")
 *    - Every 5 minutes thereafter, location re-sent
 *    - Between updates, heartbeat events sent every 30 seconds
 *
 * EXAMPLE TIMELINE (User dwelling at same spot):
 *
 *   10:00:00 - loc event (reason: "first", lat: 32.0853, lng: 34.7818)
 *   10:00:30 - no_change event (heartbeat)
 *   10:01:00 - no_change event (heartbeat)
 *   10:01:30 - no_change event (heartbeat)
 *   ...
 *   10:05:00 - loc event (reason: "time", lat: 32.0853, lng: 34.7818) <- SAME coords
 *   10:05:30 - no_change event (heartbeat)
 *   ...
 *   10:10:00 - loc event (reason: "time", lat: 32.0853, lng: 34.7818) <- SAME coords
 *
 * TO DISPLAY "DWELLING FOR X TIME" IN UI:
 *
 *   You need to track this in your UI code:
 *
 *   let lastLocation = null;
 *   let dwellStart = null;
 *
 *   onLocation: (location) => {
 *     // Check if coordinates actually changed
 *     const coordsChanged = !lastLocation ||
 *       lastLocation.latitude !== location.latitude ||
 *       lastLocation.longitude !== location.longitude;
 *
 *     if (coordsChanged) {
 *       // Location changed - reset dwell tracking
 *       dwellStart = null;
 *       showStatus('Moving');
 *     } else {
 *       // Same location - track dwell duration
 *       if (!dwellStart) {
 *         dwellStart = new Date(location.recorded_at);
 *       }
 *       const duration = calculateDuration(dwellStart, new Date());
 *       showStatus(`Dwelling for ${duration}`);
 *     }
 *
 *     lastLocation = location;
 *     updateMap(location);
 *   }
 *
 * ============================================================================
 */

class LocationApiClient {
  constructor(baseUrl = 'https://www.bahar.co.il/location/api', apiToken = '4Q9j0INedMHobgNdJx+PqcXesQjifyl9LCE+W2phLdI=') {
    this.baseUrl = baseUrl;
    this.apiToken = apiToken;
    this.sessionToken = null;
    this.abortController = null;
  }

  /**
   * Create a new streaming session
   * @param {number} userId - User ID to track
   * @param {Array<string>} deviceIds - Optional device IDs to filter (empty = all devices)
   * @param {number} duration - Session duration in seconds (default: 3600 = 1 hour)
   * @returns {Promise<Object>} Session data
   */
  async createSession(userId, deviceIds = [], duration = 3600) {
    try {
      console.log('🔑 [SESSION] Creating new session...');
      console.log('🔑 [SESSION] Request parameters:', {
        user_id: userId,
        device_ids: deviceIds,
        duration: duration,
        endpoint: `${this.baseUrl}/live/session.php`
      });

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

      console.log('🔑 [SESSION] Response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: {
          contentType: response.headers.get('content-type')
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create session: HTTP ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      console.log('🔑 [SESSION] Response data:', {
        status: data.status,
        message: data.message
      });

      if (data.status !== 'success') {
        throw new Error(data.message || 'Failed to create session');
      }

      this.sessionToken = data.data.session_token;
      console.log('✅ [SESSION] Session created successfully:', {
        session_id: data.data.session_id,
        expires_at: data.data.expires_at,
        duration: data.data.duration,
        token_preview: data.data.session_token.substring(0, 20) + '...'
      });

      return data.data;
    } catch (error) {
      console.error('❌ [SESSION] Failed to create session:', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Connect to SSE stream using fetch (forces HTTP/1.1, avoids HTTP/3 errors)
   * @param {function} onLocation - Callback for location updates: (location) => void
   * @param {function} onError - Optional callback for errors: (error) => void
   * @param {function} onConnected - Optional callback when connected: (data) => void
   * @returns {Promise<void>}
   */
  async connectToStream(onLocation, onError = null, onConnected = null) {
    if (!this.sessionToken) {
      throw new Error('No session token. Call createSession() first.');
    }

    const streamUrl = `${this.baseUrl}/stream-sse.php?token=${this.sessionToken}`;

    // Create AbortController for connection management
    this.abortController = new AbortController();

    // Track connection state for debugging
    const connectionState = {
      startTime: new Date(),
      bytesReceived: 0,
      eventsReceived: 0,
      lastEventTime: null,
      lastEventType: null,
      connectionDuration: 0
    };

    try {
      console.log('📡 [SSE] Connecting to SSE stream...');
      console.log('📡 [SSE] URL:', streamUrl);
      console.log('📡 [SSE] Start time:', connectionState.startTime.toISOString());

      // Use fetch instead of EventSource to force HTTP/1.1
      const response = await fetch(streamUrl, {
        signal: this.abortController.signal,
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      });

      console.log('📡 [SSE] Response received');
      console.log('📡 [SSE] Status:', response.status, response.statusText);
      console.log('📡 [SSE] Headers:', {
        contentType: response.headers.get('content-type'),
        contentEncoding: response.headers.get('content-encoding'),
        transferEncoding: response.headers.get('transfer-encoding'),
        cacheControl: response.headers.get('cache-control')
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      console.log('✅ [SSE] SSE connection established');

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let chunkCount = 0;

      // Process stream chunks
      while (true) {
        const {done, value} = await reader.read();
        chunkCount++;

        if (done) {
          connectionState.connectionDuration = new Date() - connectionState.startTime;
          console.log('📡 [SSE] Stream ended (done=true)');
          console.log('📡 [SSE] Connection summary:', {
            duration: `${connectionState.connectionDuration}ms`,
            totalChunks: chunkCount,
            totalBytes: connectionState.bytesReceived,
            totalEvents: connectionState.eventsReceived,
            lastEvent: connectionState.lastEventType,
            lastEventTime: connectionState.lastEventTime?.toISOString()
          });
          break;
        }

        // Track bytes received
        connectionState.bytesReceived += value.length;

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
            connectionState.eventsReceived++;
            connectionState.lastEventType = currentEvent;
            connectionState.lastEventTime = new Date();
            this._handleSSEEvent(currentEvent, currentData, onLocation, onError, onConnected, connectionState);
            currentEvent = null;
            currentData = '';
          }
        }
      }
    } catch (error) {
      connectionState.connectionDuration = new Date() - connectionState.startTime;

      if (error.name === 'AbortError') {
        console.log('🔌 [SSE] Connection aborted by user');
        console.log('🔌 [SSE] Connection summary:', {
          duration: `${connectionState.connectionDuration}ms`,
          totalBytes: connectionState.bytesReceived,
          totalEvents: connectionState.eventsReceived,
          lastEvent: connectionState.lastEventType,
          reason: 'User called disconnect()'
        });
      } else {
        console.error('❌ [SSE] Connection error:', error.message);
        console.error('❌ [SSE] Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          duration: `${connectionState.connectionDuration}ms`,
          totalBytes: connectionState.bytesReceived,
          totalEvents: connectionState.eventsReceived,
          lastEvent: connectionState.lastEventType
        });
        if (onError) onError(error);
      }
    }
  }

  /**
   * Handle SSE events
   * @private
   */
  _handleSSEEvent(eventType, data, onLocation, onError, onConnected, connectionState) {
    try {
      const parsedData = JSON.parse(data);
      const eventTime = new Date().toISOString();

      switch (eventType) {
        case 'connected':
          console.log('✅ [SSE] Connected event received');
          console.log('✅ [SSE] Connected data:', {
            timestamp: eventTime,
            session_id: parsedData.session_id,
            user_id: parsedData.user_id,
            active_devices: parsedData.active_devices,
            timestamp_from_server: parsedData.timestamp
          });
          if (onConnected) onConnected(parsedData);
          break;

        case 'loc':
          console.log('📍 [SSE] Location update received');
          console.log('📍 [SSE] Location data:', {
            timestamp: eventTime,
            device_id: parsedData.device_id,
            username: parsedData.username,
            latitude: parsedData.latitude,
            longitude: parsedData.longitude,
            accuracy: parsedData.accuracy,
            speed: parsedData.speed,
            bearing: parsedData.bearing,
            battery_level: parsedData.battery_level,
            change_reason: parsedData.change_reason,
            recorded_at: parsedData.recorded_at,
            server_time: parsedData.server_time,
            change_metrics: parsedData.change_metrics
          });
          if (onLocation) onLocation(parsedData);
          break;

        case 'no_change':
          console.log('💓 [SSE] Heartbeat received');
          console.log('💓 [SSE] Heartbeat data:', {
            timestamp: eventTime,
            active_devices: parsedData.active_devices,
            server_timestamp: parsedData.timestamp
          });
          // Heartbeat - connection is alive, no new data
          break;

        case 'error':
          console.error('❌ [SSE] Error event received');
          console.error('❌ [SSE] Error data:', {
            timestamp: eventTime,
            error_code: parsedData.error_code,
            error_message: parsedData.error_message,
            details: parsedData.details
          });
          if (onError) onError(parsedData);
          break;

        case 'bye':
          console.log('👋 [SSE] Server closing connection');
          console.log('👋 [SSE] Bye data:', {
            timestamp: eventTime,
            reason: parsedData.reason,
            message: parsedData.message,
            code: parsedData.code
          });
          this.disconnect();
          if (onError) onError(new Error(parsedData.reason || 'Connection closed by server'));
          break;

        default:
          console.warn('⚠️ [SSE] Unknown event type:', eventType);
          console.warn('⚠️ [SSE] Unknown event data:', {
            timestamp: eventTime,
            eventType: eventType,
            data: parsedData
          });
      }
    } catch (error) {
      console.error('❌ [SSE] Failed to parse SSE data');
      console.error('❌ [SSE] Parse error details:', {
        error: error.message,
        rawData: data,
        dataLength: data.length,
        dataPreview: data.substring(0, 100)
      });
    }
  }

  /**
   * Disconnect from SSE stream
   */
  disconnect() {
    if (this.abortController) {
      console.log('🔌 [SSE] Disconnecting from stream...');
      this.abortController.abort();
      this.abortController = null;
      console.log('🔌 [SSE] Stream disconnected');
    } else {
      console.warn('⚠️ [SSE] No active connection to disconnect');
    }
  }

  /**
   * Revoke the current session
   * @returns {Promise<void>}
   */
  async revokeSession() {
    if (!this.sessionToken) {
      console.warn('⚠️ [SESSION] No session to revoke');
      return;
    }

    try {
      console.log('🔑 [SESSION] Revoking session...');
      console.log('🔑 [SESSION] Session token:', this.sessionToken.substring(0, 20) + '...');

      const response = await fetch(`${this.baseUrl}/live/session.php`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.sessionToken}`,
          'X-API-Token': this.apiToken
        }
      });

      console.log('🔑 [SESSION] Revoke response:', {
        status: response.status,
        statusText: response.statusText
      });

      if (response.ok) {
        console.log('✅ [SESSION] Session revoked successfully');
      } else {
        const errorText = await response.text();
        console.warn('⚠️ [SESSION] Failed to revoke session:', {
          status: response.status,
          error: errorText
        });
      }

      this.sessionToken = null;
    } catch (error) {
      console.error('❌ [SESSION] Error revoking session:', {
        error: error.message,
        stack: error.stack
      });
      this.sessionToken = null;
    }
  }

  /**
   * Get latest location (polling fallback)
   * @param {number} userId - User ID
   * @param {string} deviceId - Optional device ID
   * @returns {Promise<Object>} Latest location data
   */
  async getLatestLocation(userId, deviceId = null) {
    const params = new URLSearchParams({ user_id: userId });
    if (deviceId) params.append('device_id', deviceId);

    const response = await fetch(`${this.baseUrl}/live/latest.php?${params}`, {
      method: 'GET',
      headers: {
        'X-API-Token': this.apiToken
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get latest location: HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.message || 'Failed to get latest location');
    }

    return data.data;
  }

  /**
   * Check if currently connected to SSE stream
   * @returns {boolean}
   */
  isConnected() {
    return this.abortController !== null;
  }

  /**
   * Check if session is active
   * @returns {boolean}
   */
  hasSession() {
    return this.sessionToken !== null;
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LocationApiClient;
}

// Example usage:
/*

// 1. Create client
const apiClient = new LocationApiClient();

// 2. Create session
const session = await apiClient.createSession(1003); // user_id = 1003

// 3. Connect to stream
await apiClient.connectToStream(
  // onLocation callback
  (location) => {
    console.log('New location:', location);
    // Update your map/UI here
    updateMap(location.latitude, location.longitude);
  },
  // onError callback
  (error) => {
    console.error('Stream error:', error);
    // Handle error - maybe reconnect?
  },
  // onConnected callback
  (data) => {
    console.log('Connected to stream:', data);
    // Update UI to show "Connected" status
  }
);

// 4. When done, disconnect and revoke session
apiClient.disconnect();
await apiClient.revokeSession();

*/

