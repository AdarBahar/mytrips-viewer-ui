import { useEffect, useRef, useState } from 'react';
import LocationApiClient from '../services/LocationApiClientNew';

/**
 * Live location point data structure
 * @typedef {Object} LivePoint
 * @property {string} device_id - Device identifier
 * @property {number|null} user_id - User ID
 * @property {string|null} username - Username
 * @property {string|null} display_name - Display name
 * @property {number|null} latitude - Latitude coordinate
 * @property {number|null} longitude - Longitude coordinate
 * @property {number|null} [accuracy] - GPS accuracy in meters
 * @property {number|null} [altitude] - Altitude in meters
 * @property {number|null} [speed] - Speed in km/h
 * @property {number|null} [bearing] - Bearing in degrees
 * @property {number|null} [battery_level] - Battery level 0-1
 * @property {string|null} [recorded_at] - When location was recorded (ISO 8601)
 * @property {string|null} [server_time] - Server time (ISO 8601)
 * @property {number} server_timestamp - Server timestamp in milliseconds
 */

/**
 * React hook for live location streaming
 * 
 * @param {Object} params - Connection parameters
 * @param {boolean} [params.all=false] - Include all users/devices
 * @param {Array<string>} [params.users=[]] - Usernames to track
 * @param {Array<string>} [params.devices=[]] - Device IDs to track
 * @param {number} [params.since=null] - Resume cursor (ms since epoch)
 * @param {number} [params.heartbeat=15] - Keep-alive interval in seconds
 * @param {number} [params.limit=100] - Max points per cycle (1-500)
 * @param {boolean} [params.enabled=true] - Enable/disable the connection
 * 
 * @returns {Object} Hook state and methods
 * @returns {boolean} returns.connected - Connection status
 * @returns {string|null} returns.lastEventId - Last received event ID
 * @returns {Array<LivePoint>} returns.points - Received location points
 * @returns {Error|null} returns.error - Connection error if any
 * @returns {function} returns.disconnect - Manually disconnect
 * @returns {function} returns.resume - Resume from last event ID
 * 
 * @example
 * const { connected, points } = useLiveLocations({
 *   all: true,
 *   heartbeat: 5,
 *   limit: 100
 * });
 */
export function useLiveLocations(params = {}) {
  const {
    all = false,
    users = [],
    devices = [],
    since = null,
    heartbeat = 15,
    limit = 100,
    enabled = true
  } = params;

  const [connected, setConnected] = useState(false);
  const [lastEventId, setLastEventId] = useState(null);
  const [points, setPoints] = useState([]);
  const [error, setError] = useState(null);
  const clientRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      // Disconnect if disabled
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
      setConnected(false);
      return;
    }

    // Validate parameters
    if (!all && users.length === 0 && devices.length === 0) {
      setError(new Error('Must pass at least one filter (users/devices) or set all=true'));
      return;
    }

    // Create client if not exists
    if (!clientRef.current) {
      clientRef.current = new LocationApiClient();
    }

    const client = clientRef.current;

    try {
      client.connect({
        all,
        users,
        devices,
        since,
        heartbeat,
        limit,
        onPoint: (point) => {
          setLastEventId(client.getLastEventId());
          setPoints(prev => [...prev, point]);
          setError(null);
        },
        onConnected: () => {
          setConnected(true);
          setError(null);
        },
        onError: (err) => {
          console.error('SSE Error:', err);
          setConnected(false);
          setError(err);
        }
      });
    } catch (err) {
      setError(err);
      setConnected(false);
    }

    // Cleanup on unmount or param change
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, [all, JSON.stringify(users), JSON.stringify(devices), since, heartbeat, limit, enabled]);

  const disconnect = () => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    setConnected(false);
    setPoints([]);
  };

  const resume = () => {
    if (clientRef.current && lastEventId) {
      clientRef.current.resume({
        all,
        users,
        devices,
        heartbeat,
        limit
      });
    }
  };

  return {
    connected,
    lastEventId,
    points,
    error,
    disconnect,
    resume
  };
}

export default useLiveLocations;

