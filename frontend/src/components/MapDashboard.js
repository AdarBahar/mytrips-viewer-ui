import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import { LogOut, MapPin, Navigation, Clock, Gauge, Radio, Minimize2, Maximize2, X, Bug } from 'lucide-react';
import { formatUTCToLocalTime, formatTimeAgo as formatTimeAgoUtil } from '../utils/timestampUtils';
import { useLiveLocations } from '../hooks/useLiveLocations';

// Environment variables - validate at module load
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const LOC_API_BASEURL = process.env.REACT_APP_LOC_API_BASEURL;
const LOC_API_TOKEN = process.env.REACT_APP_LOC_API_TOKEN;

// Validate required environment variables
if (!GOOGLE_MAPS_API_KEY) {
  console.error('REACT_APP_GOOGLE_MAPS_API_KEY is not defined');
}
if (!LOC_API_BASEURL) {
  console.error('REACT_APP_LOC_API_BASEURL is not defined');
}
if (!LOC_API_TOKEN) {
  console.error('REACT_APP_LOC_API_TOKEN is not defined');
}

// Helper function to calculate distance between points (Haversine formula)
const calculateDistance = (points) => {
  if (!points || points.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const lat1 = parseFloat(points[i].latitude);
    const lon1 = parseFloat(points[i].longitude);
    const lat2 = parseFloat(points[i + 1].latitude);
    const lon2 = parseFloat(points[i + 1].longitude);

    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    totalDistance += R * c;
  }

  return totalDistance;
};

// Helper function to generate CURL command for debugging
// SECURITY: Scrubs sensitive headers to prevent token leakage in logs
const generateCurlCommand = (method, url, headers, params = null, data = null) => {
  let curl = `curl -X ${method} '${url}`;

  if (params) {
    const queryString = new URLSearchParams(params).toString();
    curl = `curl -X ${method} '${url}?${queryString}`;
  }

  curl += "'";

  if (headers) {
    // Scrub sensitive headers before logging
    const sensitiveHeaders = ['authorization', 'x-api-token', 'x-api-key', 'bearer'];
    Object.entries(headers).forEach(([key, value]) => {
      const keyLower = key.toLowerCase();
      const isSensitive = sensitiveHeaders.some(h => keyLower.includes(h));
      const safeValue = isSensitive ? '[REDACTED]' : value;
      curl += ` \\\n  -H '${key}: ${safeValue}'`;
    });
  }

  if (data) {
    curl += ` \\\n  -d '${JSON.stringify(data)}'`;
  }

  return curl;
};

// Session management functions removed - using new SSE endpoint with query parameters instead

// Reverse geocoding function to get address from coordinates
const reverseGeocode = async (lat, lng) => {
  try {
    if (!window.google || !window.google.maps) {
      console.warn('Google Maps not loaded yet');
      return null;
    }

    const geocoder = new window.google.maps.Geocoder();
    const latlng = { lat, lng };

    return new Promise((resolve, reject) => {
      geocoder.geocode({ location: latlng }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          // Get the formatted address
          resolve(results[0].formatted_address);
        } else {
          console.warn('Geocoder failed:', status);
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
};

// Format time ago (e.g., "5 minutes ago", "1:04 hours ago")
// Uses the utility function which properly handles UTC timestamps
const formatTimeAgo = (timestamp) => {
  return formatTimeAgoUtil(timestamp);
};

export default function MapDashboard({ user, onLogout }) {
  const [routes, setRoutes] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentAddress, setCurrentAddress] = useState(null); // Address from reverse geocoding
  const [routeHistory, setRouteHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLiveTracking, setIsLiveTracking] = useState(true); // Track current location by default
  const [isMinimized, setIsMinimized] = useState(false); // Control panel minimize state
  const [isTrackingMinimized, setIsTrackingMinimized] = useState(false); // Track Current Location card minimize state
  const [streamCursor, setStreamCursor] = useState(0); // Cursor for live stream polling (legacy, kept for fallback)
  const [timeRange, setTimeRange] = useState('last_24_hours'); // Time range for history
  const [historyOffset, setHistoryOffset] = useState(0); // Pagination offset
  const [historyTotal, setHistoryTotal] = useState(0); // Total history records
  const [debugMode, setDebugMode] = useState(false); // Debug mode toggle

  // Dwell/drive analytics
  const [dwellDriveSegments, setDwellDriveSegments] = useState(null);

  // Live location streaming using new SSE endpoint
  const { connected: sseConnected, points, error: sseError } = useLiveLocations({
    users: selectedUser ? [users.find(u => u.id === selectedUser)?.name || selectedUser] : [],
    heartbeat: 10,
    limit: 100,
    enabled: isLiveTracking && selectedUser
  });

  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const plannedPolylineRef = useRef(null);
  const actualPolylineRef = useRef(null);
  const markerRef = useRef(null);

  const token = localStorage.getItem('token');

  // Location API headers (always use LOC_API_TOKEN for Location API calls)
  const locationApiHeaders = {
    'X-API-Token': LOC_API_TOKEN,
    'Accept': 'application/json'
  };

  // Initialize Google Map
  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      initMap();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Script is already loading, wait for it
      if (window.initGoogleMap) {
        // Callback already set, just wait
        return;
      }
      // Set up callback for existing script
      window.initGoogleMap = () => {
        initMap();
        delete window.initGoogleMap;
      };
      return;
    }

    // Use the recommended async loading pattern with marker library
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=marker&loading=async&callback=initGoogleMap`;
    script.async = true;
    script.defer = true;
    script.id = 'google-maps-script';

    // Set up global callback
    window.initGoogleMap = () => {
      initMap();
      delete window.initGoogleMap; // Clean up
    };

    document.head.appendChild(script);

    return () => {
      // Don't remove the script on unmount to prevent duplicate loads
      // Just clean up the callback
      if (window.initGoogleMap) {
        delete window.initGoogleMap;
      }
    };
  }, []);

  const initMap = () => {
    if (!mapRef.current) return;

    googleMapRef.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: 40.7589, lng: -73.9851 },
      zoom: 13,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      mapId: 'DEMO_MAP_ID' // Required for AdvancedMarkerElement
      // Note: styles cannot be set when mapId is present
      // To customize map styles, configure them in Google Cloud Console
    });

    setLoading(false);
  };

  // Fetch routes and users
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Mock routes data (no API endpoint available yet)
        const mockRoutes = [
          {
            id: "route-1",
            name: "Downtown Loop",
            description: "City center patrol route",
            coordinates: [
              { lat: 40.7589, lng: -73.9851 },
              { lat: 40.7614, lng: -73.9776 },
              { lat: 40.7580, lng: -73.9855 },
              { lat: 40.7505, lng: -73.9934 },
              { lat: 40.7489, lng: -73.9680 },
              { lat: 40.7589, lng: -73.9851 }
            ],
            distance: 5.2,
            estimated_time: 45
          }
        ];
        setRoutes(mockRoutes);

        // Fetch users from Location API
        const usersParams = {
          with_location_data: 'true',
          include_counts: 'false',
          include_metadata: 'false'
        };
        const usersHeaders = {
          'X-API-Token': LOC_API_TOKEN,
          'Accept': 'application/json'
        };

        if (debugMode) {
          console.group('🌐 API Call: Fetch Users');
          console.log('📤 CURL Command:');
          console.log(generateCurlCommand('GET', `${LOC_API_BASEURL}/users`, usersHeaders, usersParams));
          console.groupEnd();
        }

        const usersRes = await axios.get(`${LOC_API_BASEURL}/users`, {
          params: usersParams,
          headers: usersHeaders
        });

        if (debugMode) {
          console.group('🌐 API Response: Fetch Users');
          console.log('📥 Status:', usersRes.status);
          console.log('📥 Response Data:', usersRes.data);
          console.groupEnd();
        }

        // Parse Location API response format: {"users": [...], "count": N, "source": "database"}
        if (usersRes.data?.users && Array.isArray(usersRes.data.users)) {
          const users = usersRes.data.users.map(user => ({
            id: String(user.id),
            name: user.display_name || user.username,
            status: 'active'
          }));
          setUsers(users);
        } else {
          console.warn('Unexpected users API response format:', usersRes.data);
          setUsers([]);
        }
      } catch (error) {
        console.group('❌ API Error: Fetch Users Failed');
        console.error('Error:', error.message);

        if (error.response) {
          // Server responded with error status
          console.error('HTTP Status:', error.response.status);
          console.error('Status Text:', error.response.statusText);
          console.error('Response Data:', error.response.data);
          console.error('Response Headers:', error.response.headers);

          // Specific handling for common errors
          if (error.response.status === 504) {
            console.error('🔴 Gateway Timeout (504): The users endpoint is not responding');
            console.error('This usually means the backend server is down or overloaded');
            toast.error('Server timeout - users endpoint not responding');
          } else if (error.response.status === 503) {
            console.error('🔴 Service Unavailable (503): The server is temporarily unavailable');
            toast.error('Service unavailable - please try again later');
          } else if (error.response.status === 500) {
            console.error('🔴 Internal Server Error (500): The server encountered an error');
            toast.error('Server error - please contact support');
          } else if (error.response.status === 401) {
            console.error('🔴 Unauthorized (401): Invalid or expired token');
            toast.error('Authentication failed - please login again');
            onLogout();
          } else if (error.response.status === 403) {
            console.error('🔴 Forbidden (403): Access denied');
            toast.error('Access denied');
          } else if (error.response.status === 404) {
            console.error('🔴 Not Found (404): Endpoint not found');
            toast.error('API endpoint not found');
          } else {
            toast.error(`Failed to load users data (HTTP ${error.response.status})`);
          }
        } else if (error.request) {
          // Request was made but no response received
          console.error('No response received from server');
          console.error('Request:', error.request);
          console.error('🔴 Network Error: The server did not respond');
          console.error('Possible causes:');
          console.error('- Server is down');
          console.error('- Network connectivity issues');
          console.error('- CORS policy blocking the request');
          console.error('- Firewall blocking the connection');
          toast.error('Network error - cannot reach server');
        } else {
          // Something else happened
          console.error('Request setup error:', error.message);
          toast.error('Failed to load users data');
        }

        console.groupEnd();

        // Set empty arrays on error to prevent .map() errors
        setUsers([]);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token, debugMode, onLogout]); // Include all dependencies used in effect

  // Draw planned route
  useEffect(() => {
    if (!googleMapRef.current || !selectedRoute) return;

    // Clear existing planned route
    if (plannedPolylineRef.current) {
      plannedPolylineRef.current.setMap(null);
    }

    const routeData = routes.find(r => r.id === selectedRoute);
    if (!routeData) return;

    const path = routeData.coordinates.map(c => ({ lat: c.lat, lng: c.lng }));

    plannedPolylineRef.current = new window.google.maps.Polyline({
      path: path,
      geodesic: true,
      strokeColor: '#3B82F6',
      strokeOpacity: 0.8,
      strokeWeight: 4,
      map: googleMapRef.current
    });

    // Fit map to route bounds
    const bounds = new window.google.maps.LatLngBounds();
    path.forEach(point => bounds.extend(point));
    googleMapRef.current.fitBounds(bounds);

    toast.success(`Route "${routeData.name}" loaded`);
  }, [selectedRoute, routes]);

  // Fetch and display route history (only when NOT live tracking)
  useEffect(() => {
    if (!googleMapRef.current || !selectedUser || isLiveTracking) {
      // Clear route history when switching to live tracking
      if (isLiveTracking) {
        setRouteHistory(null);
        setHistoryOffset(0);
        setHistoryTotal(0);
      }
      return;
    }

    const fetchHistory = async () => {
      try {
        const username = users.find(u => u.id === selectedUser)?.name || selectedUser;

        // Determine which endpoint to use based on time range
        const isRecentHistory = timeRange === 'last_hour' || timeRange === 'last_24_hours';

        let response;
        let points;
        let total;

        if (isRecentHistory) {
          // Use /live/history for recent data (≤24 hours) with dwell/drive analytics
          const duration = timeRange === 'last_hour' ? 3600 : 86400;
          const historyParams = {
            user: username,
            duration: duration,
            limit: 1000,
            offset: historyOffset,
            segments: 'true' // 🆕 Request dwell/drive analytics
          };

          if (debugMode) {
            console.group('🌐 API Call: Fetch Route History (Cache + Analytics)');
            console.log('📤 CURL Command:');
            console.log(generateCurlCommand('GET', `${LOC_API_BASEURL}/live/history`, locationApiHeaders, historyParams));
            console.groupEnd();
          }

          response = await axios.get(`${LOC_API_BASEURL}/live/history`, {
            params: historyParams,
            headers: locationApiHeaders
          });

          if (debugMode) {
            console.group('🌐 API Response: Fetch Route History (Cache + Analytics)');
            console.log('📥 Status:', response.status);
            console.log('📥 Response Data:', response.data);
            if (response.data?.data?.points) {
              console.log('📊 Points Count:', response.data.data.points.length);
              console.log('📊 Total Available:', response.data.data.total);
            }
            if (response.data?.data?.segments) {
              console.log('📊 Segments:', response.data.data.segments);
            }
            console.groupEnd();
          }

          if (response.data?.status === "success" && response.data?.data?.points) {
            points = response.data.data.points;
            total = response.data.data.total || points.length;

            // 🆕 Store dwell/drive segments for analytics
            if (response.data.data.segments) {
              setDwellDriveSegments(response.data.data.segments);

              if (debugMode) {
                console.log('✅ Dwell/Drive segments loaded:', response.data.data.segments);
              }
            }
          }
        } else {
          // Use /locations for older data (>24 hours or all time)
          const params = {
            user: username,
            limit: 1000,
            offset: historyOffset,
            include_anomaly_status: 'true'
          };

          // Add date range based on time range selection
          if (timeRange === 'last_week') {
            const weekAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
            params.date_from = weekAgo.toISOString().split('T')[0];
            params.date_to = new Date().toISOString().split('T')[0];
          } else if (timeRange === 'last_month') {
            const monthAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
            params.date_from = monthAgo.toISOString().split('T')[0];
            params.date_to = new Date().toISOString().split('T')[0];
          }
          // For 'all' time range, no date filters

          if (debugMode) {
            console.group('🌐 API Call: Fetch Route History (Database)');
            console.log('📤 CURL Command:');
            console.log(generateCurlCommand('GET', `${LOC_API_BASEURL}/locations`, locationApiHeaders, params));
            console.groupEnd();
          }

          response = await axios.get(`${LOC_API_BASEURL}/locations`, {
            params,
            headers: locationApiHeaders
          });

          if (debugMode) {
            console.group('🌐 API Response: Fetch Route History (Database)');
            console.log('📥 Status:', response.status);
            console.log('📥 Response Data:', response.data);
            if (response.data?.data) {
              console.log('📊 Points Count:', response.data.data.length);
              console.log('📊 Total Available:', response.data.total);
            }
            console.groupEnd();
          }

          if (response.data?.status === "success" && response.data?.data) {
            points = response.data.data;
            total = response.data.total || points.length;
          }
        }

        if (points && points.length > 0) {
          // Transform to expected format
          setRouteHistory({
            coordinates: points.map(p => ({
              lat: parseFloat(p.latitude),
              lng: parseFloat(p.longitude)
            })),
            count: points.length,
            distance: calculateDistance(points),
            duration: isRecentHistory
              ? Math.round(response.data.data.duration / 60)
              : null, // Duration not available from /locations
            source: isRecentHistory ? 'cache' : 'database'
          });
          setHistoryTotal(total);
        } else {
          setRouteHistory(null);
          setHistoryTotal(0);
          toast.info('No route history available for selected time range');
        }
      } catch (error) {
        console.error('Failed to load route history:', error);
        toast.error('Failed to load route history');
        setRouteHistory(null);
        setHistoryTotal(0);
      }
    };

    fetchHistory();
  }, [selectedUser, isLiveTracking, timeRange, historyOffset, users, debugMode]); // Include all dependencies

  // Draw actual/history route
  useEffect(() => {
    if (!googleMapRef.current || !routeHistory) return;

    // Clear existing actual route
    if (actualPolylineRef.current) {
      actualPolylineRef.current.setMap(null);
    }

    const path = routeHistory.coordinates.map(c => ({ lat: c.lat, lng: c.lng }));

    actualPolylineRef.current = new window.google.maps.Polyline({
      path: path,
      geodesic: true,
      strokeColor: '#10B981',
      strokeOpacity: 0.8,
      strokeWeight: 4,
      map: googleMapRef.current
    });
  }, [routeHistory]);

  // Initialize live tracking with latest location
  useEffect(() => {
    if (!selectedUser || !isLiveTracking) {
      // Clear current location when switching to history mode
      if (!isLiveTracking) {
        setCurrentLocation(null);
      }
      return;
    }

    const initializeLiveTracking = async () => {
      try {
        // Get username from selectedUser
        const username = users.find(u => u.id === selectedUser)?.name || selectedUser;

        const latestParams = {
          user: username,
          all: 'false',
          max_age: 3600, // Last hour
          include_inactive: 'false'
        };

        if (debugMode) {
          console.group('🌐 API Call: Initialize Live Tracking');
          console.log('📤 CURL Command:');
          console.log(generateCurlCommand('GET', `${LOC_API_BASEURL}/live/latest`, locationApiHeaders, latestParams));
          console.groupEnd();
        }

        // Use Location API /live/latest to get initial position
        const response = await axios.get(`${LOC_API_BASEURL}/live/latest`, {
          params: latestParams,
          headers: locationApiHeaders
        });

        if (debugMode) {
          console.group('🌐 API Response: Initialize Live Tracking');
          console.log('📥 Status:', response.status);
          console.log('📥 Response Data:', response.data);
          if (response.data?.data?.locations) {
            console.log('📊 Locations Count:', response.data.data.locations.length);
            if (response.data.data.locations.length > 0) {
              console.log('📍 Latest Location:', response.data.data.locations[0]);
            }
          }
          console.groupEnd();
        }

        if (response.data?.status === "success" && response.data?.data?.locations?.length > 0) {
          const location = response.data.data.locations[0];
          const locationData = {
            lat: parseFloat(location.latitude),
            lng: parseFloat(location.longitude),
            speed: location.speed,
            battery: location.battery_level,
            timestamp: location.server_time,
            accuracy: location.accuracy
          };

          if (debugMode) {
            console.log('✅ Setting current location:', locationData);
          }

          setCurrentLocation(locationData);

          // Set cursor to now for streaming
          setStreamCursor(Date.now());
        } else {
          toast.info('No recent location data available');
        }
      } catch (error) {
        console.error('Failed to fetch initial location:', error);
        toast.error('Failed to load location data');
      }
    };

    initializeLiveTracking();
  }, [selectedUser, isLiveTracking, users, debugMode]); // Include all dependencies

  // Handle incoming SSE points - update map with new location
  useEffect(() => {
    if (points.length > 0) {
      const latestPoint = points[points.length - 1];

      if (debugMode) {
        console.group('📍 SSE: Point received');
        console.log('Username:', latestPoint.username);
        console.log('Location:', latestPoint.latitude, latestPoint.longitude);
        console.log('Speed:', latestPoint.speed, 'km/h');
        console.log('Battery:', latestPoint.battery_level);
        console.log('Timestamp:', latestPoint.server_timestamp);
        console.groupEnd();
      }

      // Update current location
      const locationData = {
        lat: latestPoint.latitude,
        lng: latestPoint.longitude,
        speed: latestPoint.speed,
        timestamp: latestPoint.server_time,
        accuracy: latestPoint.accuracy,
        battery: latestPoint.battery_level
      };

      setCurrentLocation(locationData);

      // Update polyline with new point
      if (actualPolylineRef.current && googleMapRef.current) {
        const newPath = actualPolylineRef.current.getPath();
        newPath.push(new window.google.maps.LatLng(
          latestPoint.latitude,
          latestPoint.longitude
        ));
      }

      // Update marker position
      if (markerRef.current && googleMapRef.current) {
        // AdvancedMarkerElement uses position property, not setPosition method
        markerRef.current.position = {
          lat: latestPoint.latitude,
          lng: latestPoint.longitude
        };
      }
    }
  }, [points, debugMode]);

  // SSE connection is now managed by the useLiveLocations hook
  // No need for manual connection management or polling fallback

  // Update marker for current location
  useEffect(() => {
    if (!googleMapRef.current || !currentLocation) return;

    // Validate that we have valid coordinates
    const lat = parseFloat(currentLocation.lat);
    const lng = parseFloat(currentLocation.lng);

    if (isNaN(lat) || isNaN(lng)) {
      console.warn('Invalid location coordinates:', currentLocation);
      return;
    }

    if (markerRef.current) {
      markerRef.current.map = null;
    }

    // Create custom marker element (red circle with white border)
    const markerElement = document.createElement('div');
    markerElement.style.width = '20px';
    markerElement.style.height = '20px';
    markerElement.style.borderRadius = '50%';
    markerElement.style.backgroundColor = '#EF4444';
    markerElement.style.border = '3px solid #FFFFFF';
    markerElement.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

    markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
      position: { lat, lng },
      map: googleMapRef.current,
      content: markerElement,
      title: 'Current Location'
    });

    // Pan to current location
    googleMapRef.current.panTo({ lat, lng });
  }, [currentLocation]);

  // Reverse geocode current location to get address
  useEffect(() => {
    if (!currentLocation || !window.google) return;

    const fetchAddress = async () => {
      const address = await reverseGeocode(currentLocation.lat, currentLocation.lng);
      setCurrentAddress(address);
    };

    fetchAddress();
  }, [currentLocation]);

  return (
    <div className="relative h-screen w-full">
      {/* Map Container */}
      <div ref={mapRef} className="absolute inset-0" data-testid="map-container" />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-xl text-slate-600">Loading map...</div>
        </div>
      )}

      {/* Tracking Mode Switch - Top Right */}
      {selectedUser && (
        <div className={`absolute top-6 right-6 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 z-10 transition-all duration-300 ${isTrackingMinimized ? 'p-3' : 'p-4 max-w-sm'}`}>
          {/* Minimized View */}
          {isTrackingMinimized ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Radio className={`h-3 w-3 ${isLiveTracking ? 'text-red-500' : 'text-slate-400'}`} />
                  <span className="text-xs font-medium text-slate-700">
                    {isLiveTracking ? 'Current Location' : 'Route History'}
                  </span>
                  <Switch
                    checked={isLiveTracking}
                    onCheckedChange={setIsLiveTracking}
                    className="data-[state=checked]:bg-red-500 scale-75"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsTrackingMinimized(false)}
                  className="h-6 w-6 p-0 hover:bg-slate-100"
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
              </div>

              {isLiveTracking && currentLocation && (
                <div className="space-y-1 text-xs">
                  <button
                    onClick={() => {
                      if (googleMapRef.current && currentLocation) {
                        googleMapRef.current.panTo({ lat: currentLocation.lat, lng: currentLocation.lng });
                        googleMapRef.current.setZoom(16);
                      }
                    }}
                    className="font-medium text-slate-800 hover:text-blue-600 hover:underline cursor-pointer transition-colors text-left"
                    title="Click to center map on current location"
                  >
                    {users.find(u => u.id === selectedUser)?.name || 'Unknown User'}
                  </button>
                  <div className="flex items-start gap-1.5 text-slate-700">
                    <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span className="break-words line-clamp-2">
                      {currentAddress || `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Clock className="h-3 w-3" />
                    <span>
                      {formatUTCToLocalTime(currentLocation.timestamp)}
                      <span className="text-slate-500 ml-1">
                        ({formatTimeAgo(currentLocation.timestamp)})
                      </span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Maximized View */
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Radio className={`h-4 w-4 ${isLiveTracking ? 'text-red-500' : 'text-slate-400'}`} />
                  <span className="text-sm font-medium text-slate-700">
                    Track Current Location
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Switch
                    checked={isLiveTracking}
                    onCheckedChange={setIsLiveTracking}
                    className="data-[state=checked]:bg-red-500"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsTrackingMinimized(true)}
                    className="h-7 w-7 p-0 hover:bg-slate-100 ml-1"
                  >
                    <Minimize2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <p className="text-xs text-slate-500 mt-2">
                {isLiveTracking ? 'Showing live location updates' : 'Showing route history'}
              </p>

              {/* User Name */}
              {isLiveTracking && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <button
                    onClick={() => {
                      if (googleMapRef.current && currentLocation) {
                        googleMapRef.current.panTo({ lat: currentLocation.lat, lng: currentLocation.lng });
                        googleMapRef.current.setZoom(16);
                      }
                    }}
                    className="text-sm font-semibold text-slate-800 hover:text-blue-600 hover:underline cursor-pointer transition-colors text-left w-full"
                    title="Click to center map on current location"
                  >
                    {users.find(u => u.id === selectedUser)?.name || 'Unknown User'}
                  </button>
                </div>
              )}

              {/* Connection Status */}
              {isLiveTracking && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${sseConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-xs text-slate-600">
                      {sseConnected ? 'Real-time streaming active' : sseError || 'Connecting...'}
                    </span>
                  </div>
                </div>
              )}

              {/* Live Location Info */}
              {isLiveTracking && currentLocation && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <h4 className="text-xs font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    Live Location
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2 text-slate-700">
                      <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span className="break-words">
                        {currentAddress || `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`}
                      </span>
                    </div>
                    {currentLocation.speed !== undefined && currentLocation.speed !== null && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <Gauge className="h-3 w-3" />
                        <span>{currentLocation.speed.toFixed(1)} km/h</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2 text-slate-700">
                      <Clock className="h-3 w-3 mt-0.5" />
                      <div className="flex flex-col">
                        <span>{formatUTCToLocalTime(currentLocation.timestamp)}</span>
                        <span className="text-slate-500">
                          {formatTimeAgo(currentLocation.timestamp)}
                        </span>
                      </div>
                    </div>
                    {currentLocation.accuracy && (
                      <div className="text-xs text-slate-500">
                        Accuracy: ±{currentLocation.accuracy}m
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Control Panel */}
      <div className="absolute top-24 left-6 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 z-10 transition-all duration-300">
        <div className={`${isMinimized ? 'p-4' : 'p-6'} ${isMinimized ? 'w-auto' : 'w-80'}`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={`font-bold text-slate-800 ${isMinimized ? 'text-lg' : 'text-2xl'}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Route Tracker
            </h2>
            <div className="flex items-center gap-1">
              <Button
                data-testid="minimize-button"
                onClick={() => setIsMinimized(!isMinimized)}
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:text-slate-800"
                title={isMinimized ? 'Maximize' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button
                data-testid="logout-button"
                onClick={onLogout}
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:text-slate-800"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {!isMinimized && (
          <div className="px-6 pb-6 space-y-4">
            {/* User Info */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900 font-medium">{user?.username}</p>
              <p className="text-xs text-blue-700">{user?.email}</p>

              {/* Debug Mode Toggle */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-blue-200">
                <Bug className={`h-3 w-3 ${debugMode ? 'text-orange-600' : 'text-blue-400'}`} />
                <span className="text-xs font-medium text-blue-900">Debug Mode</span>
                <Switch
                  checked={debugMode}
                  onCheckedChange={setDebugMode}
                  className="ml-auto data-[state=checked]:bg-orange-500"
                />
              </div>
              {debugMode && (
                <p className="text-xs text-orange-600 mt-2">
                  🐛 API calls will be logged to console
                </p>
              )}
            </div>

          {/* Route Selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Select Route
            </label>
            <div className="flex items-center gap-2">
              <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                <SelectTrigger data-testid="route-select" className="border-slate-300">
                  <SelectValue placeholder="Choose a route..." />
                </SelectTrigger>
                <SelectContent>
                  {routes.map(route => (
                    <SelectItem key={route.id} value={route.id} data-testid={`route-option-${route.id}`}>
                      {route.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedRoute && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRoute(null)}
                  className="h-9 px-2 text-slate-600 hover:text-slate-800"
                  title="Clear selection"
                  data-testid="clear-route-button"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {selectedRoute && (
              <div className="text-xs text-slate-600 mt-2">
                {routes.find(r => r.id === selectedRoute)?.description}
              </div>
            )}
          </div>

          {/* User Selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Navigation className="h-4 w-4" />
              Track User
            </label>
            <div className="flex items-center gap-2">
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger data-testid="user-select" className="border-slate-300">
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map(usr => (
                    <SelectItem key={usr.id} value={usr.id} data-testid={`user-option-${usr.id}`}>
                      {usr.name} ({usr.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedUser && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUser(null)}
                  className="h-9 px-2 text-slate-600 hover:text-slate-800"
                  title="Clear selection"
                  data-testid="clear-user-button"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Time Range Selection (History Mode Only) */}
          {!isLiveTracking && selectedUser && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time Range
              </label>
              <Select value={timeRange} onValueChange={(value) => {
                setTimeRange(value);
                setHistoryOffset(0); // Reset pagination when changing time range
              }}>
                <SelectTrigger data-testid="time-range-select" className="border-slate-300">
                  <SelectValue placeholder="Select time range..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_hour" data-testid="time-range-last-hour">
                    Last Hour
                  </SelectItem>
                  <SelectItem value="last_24_hours" data-testid="time-range-last-24-hours">
                    Last 24 Hours
                  </SelectItem>
                  <SelectItem value="last_week" data-testid="time-range-last-week">
                    Last Week
                  </SelectItem>
                  <SelectItem value="last_month" data-testid="time-range-last-month">
                    Last Month
                  </SelectItem>
                  <SelectItem value="all" data-testid="time-range-all">
                    All Time
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-slate-500 mt-1">
                {timeRange === 'last_hour' && '📊 Fast cache-based query'}
                {timeRange === 'last_24_hours' && '📊 Fast cache-based query'}
                {timeRange === 'last_week' && '🗄️ Full database query'}
                {timeRange === 'last_month' && '🗄️ Full database query'}
                {timeRange === 'all' && '🗄️ Full database query (all records)'}
              </div>
            </div>
          )}

          {/* Route History Info (History Mode) */}
          {!isLiveTracking && routeHistory && (
            <div className="mt-4 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Clock className="h-3 w-3" />
                Route History
                {routeHistory.source && (
                  <span className="text-xs font-normal text-emerald-600">
                    ({routeHistory.source === 'cache' ? '⚡ Cache' : '🗄️ Database'})
                  </span>
                )}
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <MapPin className="h-3 w-3" />
                  <span>{routeHistory.coordinates?.length || 0} points</span>
                  {historyTotal > routeHistory.count && (
                    <span className="text-emerald-600">
                      (of {historyTotal} total)
                    </span>
                  )}
                </div>
                {routeHistory.distance && (
                  <div className="flex items-center gap-2 text-slate-700">
                    <Navigation className="h-3 w-3" />
                    <span>{routeHistory.distance.toFixed(2)} km</span>
                  </div>
                )}
                {routeHistory.duration && (
                  <div className="flex items-center gap-2 text-slate-700">
                    <Clock className="h-3 w-3" />
                    <span>{routeHistory.duration} minutes</span>
                  </div>
                )}
              </div>

              {/* Dwell/Drive Analytics */}
              {dwellDriveSegments && dwellDriveSegments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-emerald-200">
                  <h4 className="text-xs font-semibold text-slate-800 mb-2">Movement Analysis</h4>
                  <div className="space-y-1 text-xs">
                    {dwellDriveSegments.map((segment, index) => (
                      <div key={index} className="flex items-center gap-2">
                        {segment.type === 'drive' ? (
                          <>
                            <Navigation className="h-3 w-3 text-blue-600" />
                            <span className="text-slate-700">
                              Driving: {segment.distance?.toFixed(2)} km, {Math.round(segment.duration / 60)} min
                            </span>
                          </>
                        ) : (
                          <>
                            <MapPin className="h-3 w-3 text-orange-600" />
                            <span className="text-slate-700">
                              Stopped: {Math.round(segment.duration / 60)} min
                            </span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {dwellDriveSegments.filter(s => s.type === 'drive').length} driving segments,
                    {' '}{dwellDriveSegments.filter(s => s.type === 'dwell').length} stops
                  </div>
                </div>
              )}

              {/* Pagination Controls */}
              {historyTotal > routeHistory.count && (
                <div className="mt-3 pt-3 border-t border-emerald-200">
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryOffset(Math.max(0, historyOffset - 1000))}
                      disabled={historyOffset === 0}
                      className="text-xs h-7"
                    >
                      ← Previous
                    </Button>
                    <span className="text-xs text-slate-600">
                      {historyOffset + 1}-{Math.min(historyOffset + routeHistory.count, historyTotal)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryOffset(historyOffset + 1000)}
                      disabled={historyOffset + routeHistory.count >= historyTotal}
                      className="text-xs h-7"
                    >
                      Next →
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 p-4 z-10">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Map Legend</h3>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-3">
            <div className="h-1 w-8 bg-blue-500 rounded" />
            <span className="text-slate-700">Planned Route</span>
          </div>
          {!isLiveTracking && (
            <div className="flex items-center gap-3">
              <div className="h-1 w-8 bg-emerald-500 rounded" />
              <span className="text-slate-700">Route History</span>
            </div>
          )}
          {isLiveTracking && (
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-red-500 border-2 border-white" />
              <span className="text-slate-700">Live Location</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}