# Authentication Guide

This application supports **two authentication methods**: **App Login** (stateless) and **JWT Login** (token-based).

---

## 🔐 Authentication Methods

### 1. **App Login** (Stateless Authentication)

**Endpoint:** `POST /api/app-login`

**Use Case:**
- Mobile applications
- Simple web apps
- Scenarios where you don't want to manage JWT tokens
- Quick authentication checks

**How it works:**
1. Client sends email + password to local backend `/api/app-login`
2. Backend forwards credentials to **MyTrips API** (`MYTRIPS_API_BASEURL/auth/app-login`)
3. MyTrips API validates credentials and returns response
4. Backend returns `authenticated: true/false` and `user_id` to client
5. **No session or token is created**
6. Client stores `user_id` locally
7. For sensitive operations, re-authenticate

**Request:**
```json
{
  "email": "testuser@example.com",
  "password": "password123"
}
```

**Response (Success):**
```json
{
  "authenticated": true,
  "user_id": "mock-user-123",
  "message": "Authentication successful"
}
```

**Response (Failure):**
```json
{
  "authenticated": false,
  "message": "Invalid credentials"
}
```

**Security Features:**
- ✅ No password storage on client
- ✅ Generic error messages (doesn't reveal if email exists)
- ✅ Uses `LOC_API_TOKEN` for MyTrips API authentication
- ✅ Authenticates against external MyTrips API (`MYTRIPS_API_BASEURL`)
- ✅ Stateless (no server-side session)
- ✅ 10-second timeout for API calls

---

### 2. **JWT Login** (Token-Based Authentication)

**Endpoint:** `POST /api/auth/login`

**Use Case:**
- Traditional web applications
- When you need persistent authentication
- API access with bearer tokens

**How it works:**
1. Client sends username + password
2. Server validates credentials
3. Server returns JWT access token + user data
4. Client stores token (localStorage/sessionStorage)
5. Client includes token in `Authorization` header for API calls

**Request:**
```json
{
  "username": "testuser",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "mock-user-123",
    "username": "testuser",
    "email": "testuser@example.com",
    "created_at": "2025-10-27T10:00:00Z"
  }
}
```

**Using the Token:**
```javascript
// Include in API requests
axios.get('/api/routes', {
  headers: {
    Authorization: `Bearer ${access_token}`
  }
});
```

---

## 🚀 Quick Start

### Development Mode (Mock Authentication)

The application is configured for **mock authentication** by default (no MongoDB required).

**Test Credentials:**

| Method | Field | Value |
|--------|-------|-------|
| **App Login** | Email | `testuser@example.com` |
| | Password | `password123` |
| **JWT Login** | Username | `testuser` |
| | Password | `password123` |

### Using App Login (Frontend)

```javascript
import { appLogin } from './services/authService';

const handleLogin = async () => {
  const result = await appLogin({
    email: 'testuser@example.com',
    password: 'password123'
  });

  if (result.authenticated) {
    // Store user info
    localStorage.setItem('userId', result.user_id);
    localStorage.setItem('email', email);
    // Redirect to dashboard
  } else {
    // Show error
    alert(result.message);
  }
};
```

### Using JWT Login (Frontend)

```javascript
import { jwtLogin } from './services/authService';

const handleLogin = async () => {
  const result = await jwtLogin({
    username: 'testuser',
    password: 'password123'
  });

  if (result.success) {
    const { access_token, user } = result.data;
    // Store token
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(user));
    // Redirect to dashboard
  } else {
    // Show error
    alert(result.error);
  }
};
```

---

## 🔧 Configuration

### Environment Variables

**Backend (`backend/.env`):**
```bash
# Mock Authentication (for development)
MOCK_AUTH_ENABLED="true"
MOCK_USERNAME="testuser"
MOCK_PASSWORD="password123"
MOCK_USER_EMAIL="testuser@example.com"
MOCK_USER_ID="mock-user-123"

# Location API Token (for app-login endpoint)
LOC_API_TOKEN="4Q9j0INedMHobgNdJx+PqcXesQjifyl9LCE+W2phLdI="

# API Base URLs
LOC_API_BASEURL="https://www.bahar.co.il/location/api"
MYTRIPS_API_BASEURL="https://mytrips-api.bahar.co.il"

# JWT Configuration
JWT_SECRET="CHANGE_THIS_TO_A_SECURE_RANDOM_SECRET_IN_PRODUCTION"
```

**Frontend (`frontend/.env`):**
```bash
# Backend API URL
REACT_APP_BACKEND_URL=http://localhost:8000

# Location API Token (optional, for client-side validation)
LOC_API_TOKEN="4Q9j0INedMHobgNdJx+PqcXesQjifyl9LCE+W2phLdI="
```

---

## 📱 Mobile App Integration

### React Native Example

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

const mobileLogin = async (email, password) => {
  const result = await appLogin({ email, password });
  
  if (result.authenticated) {
    await AsyncStorage.setItem('userId', result.user_id);
    await AsyncStorage.setItem('email', email);
    return true;
  }
  
  return false;
};
```

---

## 🔒 Security Best Practices

### App Login
1. ✅ **Never store passwords** on the client
2. ✅ **Re-authenticate** for sensitive operations
3. ✅ **Use HTTPS** in production
4. ✅ **Implement rate limiting** on the server
5. ✅ **Keep `LOC_API_TOKEN` secret**
6. ✅ **Secure `MYTRIPS_API_BASEURL`** - ensure it points to a trusted API
7. ✅ **Handle API timeouts** gracefully (10-second timeout configured)

### JWT Login
1. ✅ **Store tokens securely** (httpOnly cookies preferred)
2. ✅ **Implement token refresh** for long sessions
3. ✅ **Validate tokens** on every request
4. ✅ **Use strong JWT secrets** (generate with `openssl rand -hex 32`)
5. ✅ **Set appropriate token expiration** (default: 24 hours)

---

## 🧪 Testing

### Test App Login

**Development Mode (Mock):**
```bash
# Set MOCK_AUTH_ENABLED="true" in backend/.env
curl -X POST http://localhost:8000/api/app-login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"password123"}'
```

**Expected Response:**
```json
{
  "authenticated": true,
  "user_id": "mock-user-123",
  "message": "Authentication successful"
}
```

**Production Mode (MyTrips API):**
```bash
# Set MOCK_AUTH_ENABLED="false" in backend/.env
curl -X POST http://localhost:8000/api/app-login \
  -H "Content-Type: application/json" \
  -d '{"email":"adar.bahar@gmail.com","password":"admin123"}'
```

**Expected Response:**
```json
{
  "authenticated": true,
  "user_id": "01K5P68329YFSCTV777EB4GM9P",
  "message": "Authentication successful"
}
```

### Test JWT Login

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'
```

**Expected Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {...}
}
```

---

## 🎯 Which Method Should I Use?

| Scenario | Recommended Method |
|----------|-------------------|
| Mobile app | **App Login** |
| Simple web app | **App Login** |
| Complex web app with many API calls | **JWT Login** |
| Need persistent sessions | **JWT Login** |
| Quick authentication checks | **App Login** |
| Need to track user sessions | **JWT Login** |

---

## 🚨 Production Deployment

### Before deploying to production:

1. **Disable Mock Authentication:**
   ```bash
   MOCK_AUTH_ENABLED="false"
   ```

2. **Configure MyTrips API:**
   ```bash
   MYTRIPS_API_BASEURL="https://mytrips-api.bahar.co.il"
   LOC_API_BASEURL="https://www.bahar.co.il/location/api"
   ```

3. **Set up MongoDB (for JWT authentication):**
   ```bash
   MONGO_URL="mongodb://your-mongo-server:27017"
   DB_NAME="route_tracker_db"
   ```

4. **Generate secure secrets:**
   ```bash
   # JWT Secret
   openssl rand -hex 32

   # LOC API Token
   openssl rand -base64 32
   ```

5. **Update environment variables:**
   ```bash
   JWT_SECRET="<generated-jwt-secret>"
   LOC_API_TOKEN="<generated-loc-token>"
   ```

6. **Enable HTTPS** and configure CORS properly

7. **Implement rate limiting** on authentication endpoints

8. **Verify MyTrips API connectivity** and response format

---

## 📚 API Reference

See `frontend/src/services/authService.js` for complete API documentation and usage examples.

---

**Need help?** Check the implementation guide or contact the development team.

