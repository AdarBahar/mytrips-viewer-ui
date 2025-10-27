import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { LogOut, MapPin, Navigation, Clock, Gauge } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const LOC_API_BASEURL = process.env.REACT_APP_LOC_API_BASEURL;
const LOC_API_TOKEN = process.env.REACT_APP_LOC_API_TOKEN;

export default function MapDashboard({ user, onLogout }) {
  const [routes, setRoutes] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [routeHistory, setRouteHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const plannedPolylineRef = useRef(null);
  const actualPolylineRef = useRef(null);
  const markerRef = useRef(null);

  const token = localStorage.getItem('token');

  // Check if it's an app-login token (format: "app-login:user_id")
  const isAppLoginToken = token && token.startsWith('app-login:');

  // Only send Authorization header if it's a real JWT token
  const axiosConfig = isAppLoginToken ? {} : {
    headers: { Authorization: `Bearer ${token}` }
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

  // Fetch and display route history
  useEffect(() => {
    if (!googleMapRef.current || !selectedUser) return;

    const fetchHistory = async () => {
      try {
        const response = await axios.get(`${API}/history/${selectedUser}`, axiosConfig);
        setRouteHistory(response.data);
      } catch (error) {
        toast.error('Failed to load route history');
      }
    };

    fetchHistory();
  }, [selectedUser]);

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

  // Poll for real-time location
  useEffect(() => {
    if (!selectedUser) return;

    const pollLocation = async () => {
      try {
        const response = await axios.get(`${API}/location/${selectedUser}`, axiosConfig);
        setCurrentLocation(response.data);
      } catch (error) {
        console.error('Failed to fetch location:', error);
      }
    };

    pollLocation();
    const interval = setInterval(pollLocation, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [selectedUser]);

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

      {/* Control Panel */}
      <div className="absolute top-6 left-6 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 p-6 w-80 z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Route Tracker
          </h2>
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

        <div className="space-y-4">
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
          </div>

          {/* Current Location Info */}
          {currentLocation && (
            <div className="mt-4 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
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
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 p-4 z-10">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Map Legend</h3>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-3">
            <div className="h-1 w-8 bg-blue-500 rounded" />
            <span className="text-slate-700">Planned Route</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-1 w-8 bg-emerald-500 rounded" />
            <span className="text-slate-700">Actual Route (History)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-red-500 border-2 border-white" />
            <span className="text-slate-700">Current Location</span>
          </div>
        </div>
      </div>
    </div>
  );
}