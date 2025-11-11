# Login System - Complete Summary

## 📋 Overview

The MyTrips Viewer application uses a **two-method authentication system**:

1. **App Login** - Email-based, stateless authentication
2. **JWT Login** - Username-based, traditional JWT authentication

Both methods authenticate against the backend and return tokens for API access.

---

## 🎯 Key Information

### Backend URL
```
https://www.bahar.co.il/mytrips-viewer-api
```

### Authentication Endpoints
```
POST /auth/app-login      - Email login (returns user_id)
POST /auth/login          - Username login (returns JWT token)
POST /auth/register       - User registration
GET  /auth/me             - Get current user (requires token)
```

---

## 🔐 App Login (Recommended for Mobile)

### Request
```
POST /auth/app-login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Response (Success)
```json
{
  "authenticated": true,
  "user_id": 123,
  "message": "Login successful"
}
```

### Response (Failure)
```json
{
  "authenticated": false,
  "message": "Invalid credentials"
}
```

### Token Format
```
app-login:123
```

---

## 🔑 JWT Login (Alternative)

### Request
```
POST /auth/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "password123"
}
```

### Response (Success)
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

### Token Format
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 💾 Token Storage

### iOS
```swift
// Use Keychain
SecItemAdd(query, nil)
```

### Android
```kotlin
// Use Keystore
SharedPreferences.edit().putString("token", token)
```

### Web
```javascript
// Use localStorage
localStorage.setItem('token', token)
```

---

## 🔄 Using Token in API Calls

### Header Format
```
Authorization: Bearer {token}
```

### Example Request
```
GET /auth/me
Authorization: Bearer app-login:123
```

### Example Response
```json
{
  "id": 123,
  "username": "john_doe",
  "email": "john@example.com"
}
```

---

## 📊 Complete Login Flow

```
1. User enters email & password
   ↓
2. POST /auth/app-login
   ↓
3. Backend validates credentials
   ↓
4. Return user_id (if valid) or error (if invalid)
   ↓
5. Store token: "app-login:{user_id}"
   ↓
6. Store user data locally
   ↓
7. Navigate to dashboard
   ↓
8. Use token in Authorization header for all API calls
   ↓
9. If 401 response: clear token and redirect to login
```

---

## 🧪 Testing Endpoints

### Test App Login
```bash
curl -X POST https://www.bahar.co.il/mytrips-viewer-api/auth/app-login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Test Get Current User
```bash
curl -X GET https://www.bahar.co.il/mytrips-viewer-api/auth/me \
  -H "Authorization: Bearer app-login:123"
```

---

## ⚠️ HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | OK | Success |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Invalid/expired token |
| 500 | Server Error | Backend error |

---

## 🔒 Security Checklist

✅ **DO:**
- Use HTTPS for all requests
- Store tokens securely (Keychain/Keystore)
- Include token in Authorization header
- Handle 401 responses
- Clear tokens on logout
- Validate input before sending

❌ **DON'T:**
- Send tokens in URL parameters
- Store tokens in plain text
- Log tokens to console
- Use HTTP (always HTTPS)
- Store passwords
- Hardcode credentials

---

## 📱 Mobile Implementation Steps

1. **Implement login endpoint call**
   - POST /auth/app-login with email & password
   - Parse response and extract user_id

2. **Store token securely**
   - iOS: Keychain
   - Android: Keystore
   - React Native: AsyncStorage

3. **Add token to API requests**
   - Include Authorization header
   - Format: `Bearer app-login:{user_id}`

4. **Handle token expiration**
   - Check for 401 responses
   - Clear token and redirect to login

5. **Implement logout**
   - Clear stored token
   - Clear stored user data
   - Redirect to login screen

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `LOGIN_FLOW_DOCUMENTATION.md` | Complete login flow details |
| `MOBILE_LOGIN_IMPLEMENTATION_GUIDE.md` | Code examples for iOS, Android, React Native |
| `AUTHENTICATION_API_REFERENCE.md` | API endpoint reference |
| `LOGIN_SYSTEM_SUMMARY.md` | This file - quick reference |

---

## 🎯 Quick Reference

### App Login (Recommended)
```
Endpoint: POST /auth/app-login
Input: email, password
Output: user_id
Token: app-login:{user_id}
```

### JWT Login (Alternative)
```
Endpoint: POST /auth/login
Input: username, password
Output: access_token
Token: eyJhbGc...
```

### Use Token
```
Header: Authorization: Bearer {token}
Endpoint: GET /auth/me
```

### Handle Errors
```
401 Unauthorized → Clear token, redirect to login
400 Bad Request → Show error message
500 Server Error → Show error message
```

---

## 🚀 Next Steps

1. Review `LOGIN_FLOW_DOCUMENTATION.md` for complete details
2. Choose implementation language (iOS/Android/React Native)
3. Follow code examples in `MOBILE_LOGIN_IMPLEMENTATION_GUIDE.md`
4. Reference `AUTHENTICATION_API_REFERENCE.md` for API details
5. Test with cURL commands provided
6. Implement error handling
7. Test with invalid credentials
8. Test token persistence

---

**Version:** 1.0
**Last Updated:** November 3, 2025
**Status:** ✅ COMPLETE AND READY FOR MOBILE IMPLEMENTATION

