import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import { LogOut, MapPin, Navigation, Clock, Gauge, Radio, Minimize2, Maximize2, X } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const LOC_API_BASEURL = process.env.REACT_APP_LOC_API_BASEURL;
const LOC_API_TOKEN = process.env.REACT_APP_LOC_API_TOKEN;

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

export default function MapDashboard({ user, onLogout }) {
  const [routes, setRoutes] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [routeHistory, setRouteHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLiveTracking, setIsLiveTracking] = useState(true); // Track current location by default
  const [isMinimized, setIsMinimized] = useState(false); // Control panel minimize state
  const [streamCursor, setStreamCursor] = useState(0); // Cursor for live stream polling

  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const plannedPolylineRef = useRef(null);
  const actualPolylineRef = useRef(null);
  const markerRef = useRef(null);

  const token = localStorage.getItem('token');

  // Location API headers (always use LOC_API_TOKEN for Location API calls)
  const locationApiHeaders = {
    'Authorization': `Bearer ${LOC_API_TOKEN}`,
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
        const usersRes = await axios.get(`${LOC_API_BASEURL}/users.php`, {
          params: {
            with_location_data: 'true',
            include_counts: 'false',
            include_metadata: 'false'
          },
          headers: {
            'Authorization': `Bearer ${LOC_API_TOKEN}`,
            'X-API-Token': LOC_API_TOKEN,
            'Accept': 'application/json'
          }
        });

        // Parse Location API response format: {"status": "success", "data": {"users": [...]}}
        if (usersRes.data?.status === 'success' && usersRes.data?.data?.users) {
          const users = usersRes.data.data.users.map(user => ({
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
        console.error('Failed to load data:', error);
        toast.error('Failed to load users data');
        // Set empty arrays on error to prevent .map() errors
        setUsers([]);
        if (error.response?.status === 401) {
          onLogout();
        }
      }
    };

    if (token) {
      fetchData();
    }
  }, [token]);

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
      }
      return;
    }

    const fetchHistory = async () => {
      try {
        // Use Location API /live/history.php endpoint
        // Get last 6 hours of tracking history
        const response = await axios.get(`${LOC_API_BASEURL}/live/history.php`, {
          params: {
            user: users.find(u => u.id === selectedUser)?.name || selectedUser,
            duration: 21600, // 6 hours in seconds
            limit: 500
          },
          headers: locationApiHeaders
        });

        if (response.data?.status === "success" && response.data?.data?.points) {
          const points = response.data.data.points;

          // Transform to expected format
          setRouteHistory({
            coordinates: points.map(p => ({
              lat: parseFloat(p.latitude),
              lng: parseFloat(p.longitude)
            })),
            count: points.length,
            distance: calculateDistance(points),
            duration: Math.round(response.data.data.duration / 60) // Convert to minutes
          });
        } else {
          setRouteHistory(null);
          toast.info('No route history available');
        }
      } catch (error) {
        console.error('Failed to load route history:', error);
        toast.error('Failed to load route history');
        setRouteHistory(null);
      }
    };

    fetchHistory();
  }, [selectedUser, isLiveTracking, users]);

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
        // Use Location API /live/latest.php to get initial position
        const response = await axios.get(`${LOC_API_BASEURL}/live/latest.php`, {
          params: {
            user: users.find(u => u.id === selectedUser)?.name || selectedUser,
            max_age: 3600 // Last hour
          },
          headers: locationApiHeaders
        });

        if (response.data?.status === "success" && response.data?.data?.locations?.length > 0) {
          const location = response.data.data.locations[0];
          setCurrentLocation({
            lat: parseFloat(location.latitude),
            lng: parseFloat(location.longitude),
            speed: location.speed,
            battery: location.battery_level,
            timestamp: location.server_time,
            accuracy: location.accuracy
          });

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
  }, [selectedUser, isLiveTracking, users]);

  // Poll for real-time location updates using stream endpoint
  useEffect(() => {
    if (!selectedUser || !isLiveTracking || streamCursor === 0) {
      return;
    }

    const pollLocationStream = async () => {
      try {
        // Use Location API /live/stream.php for real-time updates
        const response = await axios.get(`${LOC_API_BASEURL}/live/stream.php`, {
          params: {
            user: users.find(u => u.id === selectedUser)?.name || selectedUser,
            since: streamCursor
          },
          headers: locationApiHeaders
        });

        if (response.data?.status === "success" && response.data?.data?.points?.length > 0) {
          const points = response.data.data.points;
          const latestPoint = points[points.length - 1]; // Get most recent point

          setCurrentLocation({
            lat: parseFloat(latestPoint.latitude),
            lng: parseFloat(latestPoint.longitude),
            speed: latestPoint.speed,
            timestamp: latestPoint.server_time,
            accuracy: latestPoint.accuracy
          });

          // Update cursor for next poll
          setStreamCursor(response.data.data.cursor);
        }
      } catch (error) {
        console.error('Failed to fetch location stream:', error);
      }
    };

    const interval = setInterval(pollLocationStream, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [selectedUser, isLiveTracking, streamCursor, users]);

  // Update marker for current location
  useEffect(() => {
    if (!googleMapRef.current || !currentLocation) return;

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
      position: { lat: currentLocation.lat, lng: currentLocation.lng },
      map: googleMapRef.current,
      content: markerElement,
      title: 'Current Location'
    });

    // Pan to current location
    googleMapRef.current.panTo({ lat: currentLocation.lat, lng: currentLocation.lng });
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
        <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 p-4 z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Radio className={`h-4 w-4 ${isLiveTracking ? 'text-red-500' : 'text-slate-400'}`} />
              <span className="text-sm font-medium text-slate-700">
                Track Current Location
              </span>
            </div>
            <Switch
              checked={isLiveTracking}
              onCheckedChange={setIsLiveTracking}
              className="data-[state=checked]:bg-red-500"
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {isLiveTracking ? 'Showing live location updates' : 'Showing route history'}
          </p>
        </div>
      )}

      {/* Control Panel */}
      <div className="absolute top-6 left-6 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 z-10 transition-all duration-300">
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

          {/* Current Location Info (Live Tracking) */}
          {isLiveTracking && currentLocation && (
            <div className="mt-4 p-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border border-red-200">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                Live Location
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <MapPin className="h-3 w-3" />
                  <span>{currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}</span>
                </div>
                {currentLocation.speed && (
                  <div className="flex items-center gap-2 text-slate-700">
                    <Gauge className="h-3 w-3" />
                    <span>{currentLocation.speed.toFixed(1)} km/h</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-700">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(currentLocation.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Route History Info (History Mode) */}
          {!isLiveTracking && routeHistory && (
            <div className="mt-4 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Clock className="h-3 w-3" />
                Route History
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <MapPin className="h-3 w-3" />
                  <span>{routeHistory.coordinates?.length || 0} points</span>
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