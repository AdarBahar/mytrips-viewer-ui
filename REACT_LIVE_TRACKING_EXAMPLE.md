# React Live Tracking Component Examples

## 📱 Basic Live Tracking Component

```javascript
import { useEffect, useRef, useState } from 'react';
import LocationApiClient from '../services/LocationApiClient';

function LiveTracking({ userId }) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('Idle');
  const apiClientRef = useRef(null);

  useEffect(() => {
    // Initialize API client
    apiClientRef.current = new LocationApiClient();

    // Cleanup on unmount
    return () => {
      if (apiClientRef.current) {
        apiClientRef.current.disconnect();
        apiClientRef.current.revokeSession();
      }
    };
  }, []);

  const startTracking = async () => {
    try {
      setError(null);
      setStatus('Creating session...');
      
      // Create session
      const session = await apiClientRef.current.createSession(userId);
      console.log('✅ Session created:', session);

      setStatus('Connecting to stream...');
      
      // Connect to SSE stream (now async!)
      await apiClientRef.current.connectToStream(
        // onLocation callback
        (location) => {
          setCurrentLocation(location);
          setStatus(`📍 Location updated at ${new Date(location.server_time).toLocaleTimeString()}`);
        },
        // onError callback
        (error) => {
          setError('Connection lost. Please reconnect.');
          setStatus('Error');
          setIsTracking(false);
        },
        // onConnected callback
        (data) => {
          setStatus('✅ Connected');
        }
      );

      setIsTracking(true);
    } catch (err) {
      setError(err.message);
      setStatus('Error');
      setIsTracking(false);
    }
  };

  const stopTracking = () => {
    apiClientRef.current.disconnect();
    apiClientRef.current.revokeSession();
    setIsTracking(false);
    setCurrentLocation(null);
    setStatus('Stopped');
  };

  return (
    <div className="live-tracking">
      <h2>Live Tracking</h2>
      
      <div className="controls">
        <button 
          onClick={isTracking ? stopTracking : startTracking}
          className={isTracking ? 'btn-stop' : 'btn-start'}
        >
          {isTracking ? '⏸️ Stop Tracking' : '▶️ Start Tracking'}
        </button>
      </div>

      <div className="status">
        <p>Status: {status}</p>
      </div>

      {error && <div className="error">{error}</div>}
      
      {currentLocation && (
        <div className="location-info">
          <h3>Current Location</h3>
          <p><strong>Latitude:</strong> {currentLocation.latitude}</p>
          <p><strong>Longitude:</strong> {currentLocation.longitude}</p>
          <p><strong>Speed:</strong> {currentLocation.speed} km/h</p>
          <p><strong>Accuracy:</strong> ±{currentLocation.accuracy}m</p>
          <p><strong>Bearing:</strong> {currentLocation.bearing}°</p>
          <p><strong>Battery:</strong> {currentLocation.battery_level}%</p>
          <p><strong>Time:</strong> {new Date(currentLocation.server_time).toLocaleString()}</p>
          <p><strong>Change Reason:</strong> {currentLocation.change_reason}</p>
        </div>
      )}
    </div>
  );
}

export default LiveTracking;
```

---

## 🏠 Live Tracking with Dwell Detection

```javascript
import { useEffect, useRef, useState } from 'react';
import LocationApiClient from '../services/LocationApiClient';

function LiveTrackingWithDwell({ userId }) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isDwelling, setIsDwelling] = useState(false);
  const [dwellDuration, setDwellDuration] = useState(null);
  const [error, setError] = useState(null);
  
  const apiClientRef = useRef(null);
  const lastLocationRef = useRef(null);
  const dwellStartRef = useRef(null);
  const dwellIntervalRef = useRef(null);

  useEffect(() => {
    apiClientRef.current = new LocationApiClient();
    return () => {
      if (apiClientRef.current) {
        apiClientRef.current.disconnect();
        apiClientRef.current.revokeSession();
      }
      if (dwellIntervalRef.current) {
        clearInterval(dwellIntervalRef.current);
      }
    };
  }, []);

  const calculateDwellDuration = () => {
    if (!dwellStartRef.current) return null;

    const now = new Date();
    const dwellMs = now - dwellStartRef.current;
    const dwellMinutes = Math.floor(dwellMs / 60000);
    const dwellHours = Math.floor(dwellMinutes / 60);
    const remainingMinutes = dwellMinutes % 60;

    if (dwellHours > 0) {
      return `${dwellHours}h ${remainingMinutes}m`;
    }
    return `${dwellMinutes}m`;
  };

  const startDwellTracking = () => {
    // Update dwell duration every minute
    dwellIntervalRef.current = setInterval(() => {
      const duration = calculateDwellDuration();
      setDwellDuration(duration);
    }, 60000);
  };

  const stopDwellTracking = () => {
    if (dwellIntervalRef.current) {
      clearInterval(dwellIntervalRef.current);
      dwellIntervalRef.current = null;
    }
    dwellStartRef.current = null;
    setDwellDuration(null);
  };

  const handleLocationUpdate = (location) => {
    // Check if coordinates actually changed
    const coordsChanged = !lastLocationRef.current ||
      lastLocationRef.current.latitude !== location.latitude ||
      lastLocationRef.current.longitude !== location.longitude;

    if (coordsChanged) {
      // Location changed - user is moving
      setIsDwelling(false);
      stopDwellTracking();
    } else {
      // Same location - user is dwelling
      if (!dwellStartRef.current) {
        dwellStartRef.current = new Date(location.recorded_at);
        setIsDwelling(true);
        startDwellTracking();
      }
      const duration = calculateDwellDuration();
      setDwellDuration(duration);
    }

    lastLocationRef.current = location;
    setCurrentLocation(location);
  };

  const startTracking = async () => {
    try {
      setError(null);
      const session = await apiClientRef.current.createSession(userId);

      await apiClientRef.current.connectToStream(
        handleLocationUpdate,
        (error) => {
          setError('Connection lost');
          setIsTracking(false);
        }
      );

      setIsTracking(true);
    } catch (err) {
      setError(err.message);
      setIsTracking(false);
    }
  };

  const stopTracking = () => {
    apiClientRef.current.disconnect();
    apiClientRef.current.revokeSession();
    stopDwellTracking();
    setIsTracking(false);
    setCurrentLocation(null);
    setIsDwelling(false);
  };

  return (
    <div className="live-tracking-dwell">
      <h2>Live Tracking with Dwell Detection</h2>
      
      <button onClick={isTracking ? stopTracking : startTracking}>
        {isTracking ? '⏸️ Stop' : '▶️ Start'}
      </button>

      {error && <div className="error">{error}</div>}
      
      {currentLocation && (
        <div className="location-card">
          <div className={`status-badge ${isDwelling ? 'dwelling' : 'moving'}`}>
            {isDwelling ? '📍 Dwelling' : '🚶 Moving'}
          </div>

          <div className="location-details">
            <p><strong>Lat:</strong> {currentLocation.latitude}</p>
            <p><strong>Lng:</strong> {currentLocation.longitude}</p>
            <p><strong>Speed:</strong> {currentLocation.speed} km/h</p>
          </div>

          {isDwelling && dwellDuration && (
            <div className="dwell-info">
              <p className="dwell-duration">
                📍 Dwelling for <strong>{dwellDuration}</strong>
              </p>
              <p className="dwell-location">
                Location: {currentLocation.latitude}, {currentLocation.longitude}
              </p>
            </div>
          )}

          <p className="timestamp">
            {new Date(currentLocation.server_time).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

export default LiveTrackingWithDwell;
```

---

## 🗺️ Live Tracking with Map Integration

```javascript
import { useEffect, useRef, useState } from 'react';
import LocationApiClient from '../services/LocationApiClient';

function LiveTrackingMap({ userId, mapElement }) {
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);
  const apiClientRef = useRef(null);
  const markerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    apiClientRef.current = new LocationApiClient();
    mapRef.current = mapElement; // Assume map is passed as prop

    return () => {
      if (apiClientRef.current) {
        apiClientRef.current.disconnect();
        apiClientRef.current.revokeSession();
      }
    };
  }, [mapElement]);

  const updateMapMarker = (location) => {
    const { latitude, longitude } = location;

    if (!markerRef.current) {
      // Create new marker
      markerRef.current = new google.maps.Marker({
        position: { lat: parseFloat(latitude), lng: parseFloat(longitude) },
        map: mapRef.current,
        title: 'Current Location'
      });
    } else {
      // Update existing marker
      markerRef.current.setPosition({
        lat: parseFloat(latitude),
        lng: parseFloat(longitude)
      });
    }

    // Center map on marker
    mapRef.current.panTo({
      lat: parseFloat(latitude),
      lng: parseFloat(longitude)
    });
  };

  const startTracking = async () => {
    try {
      setError(null);
      const session = await apiClientRef.current.createSession(userId);

      await apiClientRef.current.connectToStream(
        (location) => {
          updateMapMarker(location);
        },
        (error) => {
          setError('Connection lost');
          setIsTracking(false);
        }
      );

      setIsTracking(true);
    } catch (err) {
      setError(err.message);
      setIsTracking(false);
    }
  };

  const stopTracking = () => {
    apiClientRef.current.disconnect();
    apiClientRef.current.revokeSession();
    setIsTracking(false);
  };

  return (
    <div className="live-tracking-map">
      <button onClick={isTracking ? stopTracking : startTracking}>
        {isTracking ? '⏸️ Stop Tracking' : '▶️ Start Tracking'}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}

export default LiveTrackingMap;
```

---

## 🎯 Key Implementation Notes

1. **Always use `await`** when calling `connectToStream()`
2. **Track dwell** by comparing consecutive location coordinates
3. **Update UI** in the `onLocation` callback
4. **Handle errors** gracefully with try-catch
5. **Cleanup** on component unmount
6. **Use refs** for non-state values that don't trigger re-renders

---

## 📊 Event Flow

```
User clicks "Start Tracking"
    ↓
createSession() → Get session token
    ↓
connectToStream() → Connect to SSE
    ↓
Receive "connected" event → onConnected callback
    ↓
Receive "loc" events → onLocation callback (update UI)
    ↓
Receive "no_change" events → Heartbeat (connection alive)
    ↓
User clicks "Stop Tracking"
    ↓
disconnect() → Close connection
    ↓
revokeSession() → Clean up server-side
```

