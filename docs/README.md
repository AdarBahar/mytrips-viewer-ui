# API Documentation

This directory contains API documentation for the MyTrips Viewer application.

## 📖 Location API Documentation

The Location API provides real-time location tracking and historical route data for the MyTrips Viewer application.

### Files

- **[location-api-openapi.yaml](location-api-openapi.yaml)** - OpenAPI 3.0 specification in YAML format
- **[location-api-openapi.json](location-api-openapi.json)** - OpenAPI 3.0 specification in JSON format
- **[location-api-swagger.html](location-api-swagger.html)** - Interactive Swagger UI documentation

### Viewing the Documentation

#### Option 1: Swagger UI (Recommended)

Open `location-api-swagger.html` in your browser to view the interactive API documentation with a user-friendly interface.

```bash
# From the docs directory
open location-api-swagger.html
```

#### Option 2: Online Swagger Editor

1. Go to [Swagger Editor](https://editor.swagger.io/)
2. Copy the contents of `location-api-openapi.yaml`
3. Paste into the editor

#### Option 3: VS Code

Install the "OpenAPI (Swagger) Editor" extension and open the YAML file.

## 🔑 Authentication

All Location API endpoints require **dual authentication**:

```bash
Authorization: Bearer {LOC_API_TOKEN}
X-API-Token: {LOC_API_TOKEN}
```

Both headers must be present with the same token value.

## 📍 Key Endpoints

### Users

**GET** `/users.php`
- Get list of all users with optional location data
- Parameters: `with_location_data`, `include_counts`, `include_metadata`

### Live Tracking

**GET** `/live/latest.php`
- Get the most recent location for a user
- Parameters: `user`, `all`, `max_age`, `include_inactive`
- **New in v1.0.0**: Added `all` and `include_inactive` parameters

**GET** `/live/stream.php`
- Stream location updates using cursor-based polling
- Parameters: `user`, `since`
- Returns: New location points and updated cursor

### Route History

**GET** `/live/history.php`
- Get cached location history (fast, for recent data)
- Best for: Last hour, last 24 hours
- Parameters: `user`, `duration`, `limit`, `offset`

**GET** `/locations.php`
- Get location history from database
- Best for: Date ranges, historical data
- Parameters: `user`, `date_from`, `date_to`, `limit`, `offset`

## 🔄 Recent Changes

### Version 1.0.0 (2024-10-28)

#### `/live/latest.php` Endpoint Updates

**Added Parameters**:
- `all` (string: "true" | "false", default: "false")
  - When `false`: Returns location only for the specified user
  - When `true`: Returns locations for all users
  
- `include_inactive` (string: "true" | "false", default: "false")
  - When `false`: Excludes inactive users from results
  - When `true`: Includes inactive users

**Example Request**:
```bash
curl -X GET 'https://www.bahar.co.il/location/api/live/latest.php?user=Adar&all=false&max_age=3600&include_inactive=false' \
  -H 'Authorization: Bearer {token}' \
  -H 'X-API-Token: {token}' \
  -H 'Accept: application/json'
```

#### Debug Mode Feature

Added comprehensive debug mode to the frontend application:
- Toggle debug mode in the Route Tracker card
- Logs CURL commands for all API requests
- Displays full API responses in browser console
- Helps troubleshoot API integration issues

## 🛠️ Testing the API

### Using CURL

```bash
# Get users list
curl -X GET 'https://www.bahar.co.il/location/api/users.php?with_location_data=true' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'X-API-Token: YOUR_TOKEN' \
  -H 'Accept: application/json'

# Get latest location
curl -X GET 'https://www.bahar.co.il/location/api/live/latest.php?user=Adar&all=false&max_age=3600&include_inactive=false' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'X-API-Token: YOUR_TOKEN' \
  -H 'Accept: application/json'

# Stream location updates
curl -X GET 'https://www.bahar.co.il/location/api/live/stream.php?user=Adar&since=1698765432000' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'X-API-Token: YOUR_TOKEN' \
  -H 'Accept: application/json'
```

### Using the Debug Mode

1. Open the MyTrips Viewer application
2. Log in with your credentials
3. Toggle the "Debug Mode" switch in the Route Tracker card
4. Open browser console (F12)
5. Select a user and enable live tracking
6. View the logged CURL commands and responses

## 📊 Response Format

All endpoints return JSON responses with the following structure:

### Success Response
```json
{
  "status": "success",
  "data": {
    // Endpoint-specific data
  }
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Error description"
}
```

## 🔗 Related Documentation

- [Main README](../README.md) - Project overview and setup
- [AUTHENTICATION.md](../AUTHENTICATION.md) - Authentication guide
- [DEPLOYMENT.md](../DEPLOYMENT.md) - Deployment instructions

## 📝 Notes

- The Location API is a production service hosted at `https://www.bahar.co.il/location/api`
- All timestamps are in ISO 8601 format or Unix milliseconds
- Coordinates are returned as strings (latitude, longitude)
- Speed is measured in km/h
- Accuracy is measured in meters
- Battery level is a percentage (0-100)

---

**Last Updated:** 2024-10-28  
**API Version:** 1.0.0

