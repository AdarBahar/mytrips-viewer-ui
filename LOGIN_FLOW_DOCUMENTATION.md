# Complete Login Flow Documentation

## 📋 Overview

The MyTrips Viewer application supports **two authentication methods**:

1. **App Login** (Stateless) - Email/Password based
2. **JWT Login** (Traditional) - Username/Password based

Both methods authenticate against the backend API and return tokens for subsequent API calls.

---

## 🔐 Authentication Methods

### Method 1: App Login (Stateless)

**Use Case:** Email-based authentication without session management

**Endpoint:**
```
POST /auth/app-login
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (Success):**
```json
{
  "authenticated": true,
  "user_id": 123,
  "message": "Login successful"
}
```

**Response (Failure):**
```json
{
  "authenticated": false,
  "message": "Invalid credentials"
}
```

**Token Format:**
```
app-login:{user_id}
```

**Storage:**
```javascript
localStorage.setItem('token', `app-login:${result.user_id}`);
localStorage.setItem('user', JSON.stringify({
  id: result.user_id,
  email: formData.email,
  username: formData.email.split('@')[0],
  authenticated: true
}));
```

---

### Method 2: JWT Login (Traditional)

**Use Case:** Username-based authentication with JWT token

**Endpoint:**
```
POST /auth/login
```

**Request:**
```json
{
  "username": "john_doe",
  "password": "password123"
}
```

**Response (Success):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

**Response (Failure):**
```json
{
  "detail": "Invalid credentials"
}
```

**Token Format:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Storage:**
```javascript
localStorage.setItem('token', access_token);
localStorage.setItem('user', JSON.stringify(user));
```

---

## 📝 Registration Flow

**Endpoint:**
```
POST /auth/register
```

**Request:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (Success):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

**Note:** Registration always returns JWT token (not app-login format)

---

## 🔄 Complete Login Flow

### Step 1: User Submits Credentials
```javascript
// AuthPage.js - handleSubmit()
const formData = {
  email: "user@example.com",
  password: "password123"
};
```

### Step 2: Call Authentication Service
```javascript
// authService.js - appLogin()
const response = await axios.post(`${API}/auth/app-login`, {
  email,
  password
});
```

### Step 3: Backend Validates Credentials
- Backend checks email/password against database
- Returns user_id if valid
- Returns error message if invalid

### Step 4: Store Token & User Data
```javascript
// App.js - handleLogin()
localStorage.setItem('token', token);
localStorage.setItem('user', JSON.stringify(userData));
setIsAuthenticated(true);
setUser(userData);
```

### Step 5: Redirect to Dashboard
```javascript
// App.js - Routes
isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/auth" />
```

### Step 6: Use Token in API Calls
```javascript
// MapDashboard.js
const token = localStorage.getItem('token');
// Token is used for subsequent API calls
```

---

## 🔑 Token Usage

### In API Requests

**For Location API (SSE Session):**
```javascript
const response = await axios.post(
  `${LOC_API_BASEURL}/live/session.php`,
  { user_id, device_ids, duration },
  {
    headers: {
      'X-API-Token': LOC_API_TOKEN,
      'Accept': 'application/json'
    }
  }
);
```

**For JWT-Protected Endpoints:**
```javascript
const response = await axios.get(`${API}/auth/me`, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 💾 Local Storage Structure

### After Login
```javascript
localStorage = {
  token: "app-login:123" or "eyJhbGc...",
  user: {
    id: 123,
    email: "user@example.com",
    username: "john_doe",
    authenticated: true
  }
}
```

### On Logout
```javascript
localStorage.removeItem('token');
localStorage.removeItem('user');
```

---

## 🔄 Session Persistence

### On App Load
```javascript
// App.js - useEffect
const token = localStorage.getItem('token');
const userData = localStorage.getItem('user');

if (token && userData) {
  setIsAuthenticated(true);
  setUser(JSON.parse(userData));
}
```

**Result:** User stays logged in across page refreshes

---

## 🚀 Backend Configuration

### Environment Variables
```
REACT_APP_BACKEND_URL=https://www.bahar.co.il/mytrips-viewer-api
```

### API Endpoints
```
POST   /auth/app-login      - Email-based login
POST   /auth/login          - Username-based JWT login
POST   /auth/register       - User registration
GET    /auth/me             - Get current user (requires Bearer token)
```

---

## 📱 For Mobile App Implementation

### 1. Implement App Login Endpoint
```
POST /auth/app-login
Request: { email, password }
Response: { authenticated, user_id, message }
```

### 2. Store Token Securely
- **iOS:** Use Keychain
- **Android:** Use Keystore
- **Web:** localStorage (with XSS protection)

### 3. Include Token in Requests
```
Authorization: Bearer {token}
```

### 4. Handle Token Expiration
- Check response status codes
- Redirect to login on 401 Unauthorized
- Refresh token if available

### 5. Implement Logout
- Clear stored token
- Clear stored user data
- Redirect to login screen

---

## ⚠️ Security Considerations

### ✅ DO
- ✅ Use HTTPS for all API calls
- ✅ Store tokens securely (Keychain/Keystore on mobile)
- ✅ Include token in Authorization header
- ✅ Handle 401 responses (token expired)
- ✅ Clear tokens on logout

### ❌ DON'T
- ❌ Store tokens in plain text
- ❌ Send tokens in URL parameters
- ❌ Log tokens to console in production
- ❌ Store passwords
- ❌ Use HTTP (always use HTTPS)

---

## 🔍 Error Handling

### Invalid Credentials
```json
{
  "authenticated": false,
  "message": "Invalid credentials"
}
```

### Network Error
```javascript
catch (error) {
  return {
    authenticated: false,
    message: error.response?.data?.message || 'Authentication failed'
  };
}
```

### Token Expired
```
HTTP 401 Unauthorized
```

---

## 📊 API Response Formats

### Success Response
```json
{
  "status": "success",
  "data": {
    "access_token": "...",
    "user": { ... }
  }
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Invalid credentials",
  "detail": "Email or password is incorrect"
}
```

---

## 🎯 Implementation Checklist for Mobile

- [ ] Implement POST /auth/app-login endpoint call
- [ ] Parse response and extract user_id
- [ ] Store token securely (Keychain/Keystore)
- [ ] Store user data locally
- [ ] Implement token refresh logic
- [ ] Add Authorization header to all API calls
- [ ] Handle 401 responses
- [ ] Implement logout functionality
- [ ] Test with invalid credentials
- [ ] Test with network errors
- [ ] Test token persistence across app restarts

---

**Version:** 1.0
**Last Updated:** November 3, 2025
**Status:** ✅ COMPLETE

