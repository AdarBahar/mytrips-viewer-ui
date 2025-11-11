# Authentication API Reference

## 🌐 Base URL
```
https://www.bahar.co.il/mytrips-viewer-api
```

---

## 🔐 Endpoints

### 1. App Login (Email-based)

**Endpoint:**
```
POST /auth/app-login
```

**Description:** Stateless email-based authentication

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200 OK):**
```json
{
  "authenticated": true,
  "user_id": 123,
  "message": "Login successful"
}
```

**Error Response (400 Bad Request):**
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

**Example cURL:**
```bash
curl -X POST https://www.bahar.co.il/mytrips-viewer-api/auth/app-login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

---

### 2. JWT Login (Username-based)

**Endpoint:**
```
POST /auth/login
```

**Description:** Traditional JWT-based authentication

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "john_doe",
  "password": "password123"
}
```

**Success Response (200 OK):**
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

**Error Response (401 Unauthorized):**
```json
{
  "detail": "Invalid credentials"
}
```

**Token Format:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example cURL:**
```bash
curl -X POST https://www.bahar.co.il/mytrips-viewer-api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"john_doe","password":"password123"}'
```

---

### 3. User Registration

**Endpoint:**
```
POST /auth/register
```

**Description:** Create new user account

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Success Response (201 Created):**
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

**Error Response (400 Bad Request):**
```json
{
  "detail": "Email already exists"
}
```

**Example cURL:**
```bash
curl -X POST https://www.bahar.co.il/mytrips-viewer-api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"john_doe","email":"john@example.com","password":"password123"}'
```

---

### 4. Get Current User

**Endpoint:**
```
GET /auth/me
```

**Description:** Get authenticated user information

**Request Headers:**
```
Authorization: Bearer {token}
```

**Success Response (200 OK):**
```json
{
  "id": 123,
  "username": "john_doe",
  "email": "john@example.com"
}
```

**Error Response (401 Unauthorized):**
```json
{
  "detail": "Invalid token"
}
```

**Example cURL:**
```bash
curl -X GET https://www.bahar.co.il/mytrips-viewer-api/auth/me \
  -H "Authorization: Bearer app-login:123"
```

---

## 📊 HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | OK | Request successful |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Invalid/expired token |
| 403 | Forbidden | Access denied |
| 404 | Not Found | Endpoint not found |
| 500 | Server Error | Backend error |

---

## 🔑 Token Usage

### In Request Headers
```
Authorization: Bearer {token}
```

### Example Request
```bash
curl -X GET https://www.bahar.co.il/mytrips-viewer-api/auth/me \
  -H "Authorization: Bearer app-login:123"
```

### Token Types

**App Login Token:**
```
app-login:123
```

**JWT Token:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjoiSm9obiBEb2UiLCJpYXQiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

---

## ⚠️ Error Handling

### Invalid Credentials
```json
{
  "authenticated": false,
  "message": "Invalid credentials"
}
```

### Missing Required Fields
```json
{
  "detail": "Email and password are required"
}
```

### Token Expired
```json
{
  "detail": "Token has expired"
}
```

### Server Error
```json
{
  "detail": "Internal server error"
}
```

---

## 🔄 Common Workflows

### Workflow 1: Login and Access Protected Resource

```
1. POST /auth/app-login
   Request: {email, password}
   Response: {authenticated: true, user_id: 123}

2. Store token: "app-login:123"

3. GET /auth/me
   Header: Authorization: Bearer app-login:123
   Response: {id: 123, username: "...", email: "..."}
```

### Workflow 2: Handle Token Expiration

```
1. GET /auth/me
   Header: Authorization: Bearer {token}
   Response: 401 Unauthorized

2. Clear stored token

3. Redirect to login screen

4. User logs in again
```

### Workflow 3: Register and Login

```
1. POST /auth/register
   Request: {username, email, password}
   Response: {access_token: "...", user: {...}}

2. Store token

3. Navigate to dashboard
```

---

## 🧪 Testing with cURL

### Test App Login
```bash
curl -X POST https://www.bahar.co.il/mytrips-viewer-api/auth/app-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Test Get Current User
```bash
curl -X GET https://www.bahar.co.il/mytrips-viewer-api/auth/me \
  -H "Authorization: Bearer app-login:123"
```

### Test with Invalid Token
```bash
curl -X GET https://www.bahar.co.il/mytrips-viewer-api/auth/me \
  -H "Authorization: Bearer invalid-token"
```

---

## 📱 Mobile Implementation Checklist

- [ ] Implement POST /auth/app-login
- [ ] Parse response and extract user_id
- [ ] Store token securely
- [ ] Implement GET /auth/me
- [ ] Add Authorization header to requests
- [ ] Handle 401 responses
- [ ] Implement logout (clear token)
- [ ] Test all error scenarios
- [ ] Test network failures
- [ ] Test token persistence

---

## 🔒 Security Best Practices

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

**Version:** 1.0
**Last Updated:** November 3, 2025
**Status:** ✅ COMPLETE

