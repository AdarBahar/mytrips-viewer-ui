# Mobile App Login Implementation Guide

## 🎯 Quick Start

### Backend URL
```
https://www.bahar.co.il/mytrips-viewer-api
```

### Authentication Endpoints
```
POST /auth/app-login      - Email-based login
POST /auth/login          - Username-based JWT login
POST /auth/register       - User registration
GET  /auth/me             - Get current user info
```

---

## 📱 iOS Implementation (Swift)

### 1. Login Request
```swift
import Foundation

struct LoginRequest: Codable {
    let email: String
    let password: String
}

struct LoginResponse: Codable {
    let authenticated: Bool
    let user_id: Int
    let message: String?
}

func appLogin(email: String, password: String) async throws -> LoginResponse {
    let url = URL(string: "https://www.bahar.co.il/mytrips-viewer-api/auth/app-login")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let body = LoginRequest(email: email, password: password)
    request.httpBody = try JSONEncoder().encode(body)
    
    let (data, response) = try await URLSession.shared.data(for: request)
    
    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode == 200 else {
        throw NSError(domain: "Login failed", code: -1)
    }
    
    return try JSONDecoder().decode(LoginResponse.self, from: data)
}
```

### 2. Store Token in Keychain
```swift
import Security

func storeToken(_ token: String, userId: Int) {
    let tokenData = "app-login:\(userId)".data(using: .utf8)!
    
    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccount as String: "mytrips_token",
        kSecValueData as String: tokenData
    ]
    
    SecItemDelete(query as CFDictionary)
    SecItemAdd(query as CFDictionary, nil)
}

func retrieveToken() -> String? {
    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccount as String: "mytrips_token",
        kSecReturnData as String: true
    ]
    
    var result: AnyObject?
    SecItemCopyMatching(query as CFDictionary, &result)
    
    if let data = result as? Data,
       let token = String(data: data, encoding: .utf8) {
        return token
    }
    return nil
}
```

### 3. Use Token in API Calls
```swift
func fetchUserData(token: String) async throws {
    let url = URL(string: "https://www.bahar.co.il/mytrips-viewer-api/auth/me")!
    var request = URLRequest(url: url)
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    
    let (data, response) = try await URLSession.shared.data(for: request)
    
    guard let httpResponse = response as? HTTPURLResponse else {
        throw NSError(domain: "Request failed", code: -1)
    }
    
    if httpResponse.statusCode == 401 {
        // Token expired - redirect to login
        throw NSError(domain: "Token expired", code: 401)
    }
    
    // Process response
}
```

---

## 🤖 Android Implementation (Kotlin)

### 1. Login Request
```kotlin
import retrofit2.http.POST
import retrofit2.http.Body

data class LoginRequest(
    val email: String,
    val password: String
)

data class LoginResponse(
    val authenticated: Boolean,
    val user_id: Int,
    val message: String?
)

interface AuthService {
    @POST("auth/app-login")
    suspend fun appLogin(@Body request: LoginRequest): LoginResponse
}
```

### 2. Store Token in SharedPreferences
```kotlin
import android.content.Context
import android.content.SharedPreferences

class TokenManager(context: Context) {
    private val prefs: SharedPreferences = 
        context.getSharedPreferences("auth", Context.MODE_PRIVATE)
    
    fun saveToken(userId: Int) {
        val token = "app-login:$userId"
        prefs.edit().putString("token", token).apply()
    }
    
    fun getToken(): String? {
        return prefs.getString("token", null)
    }
    
    fun clearToken() {
        prefs.edit().remove("token").apply()
    }
}
```

### 3. Use Token in API Calls
```kotlin
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import retrofit2.Retrofit

class AuthInterceptor(private val tokenManager: TokenManager) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): okhttp3.Response {
        val token = tokenManager.getToken()
        
        val request = chain.request().newBuilder()
            .apply {
                if (token != null) {
                    addHeader("Authorization", "Bearer $token")
                }
            }
            .build()
        
        val response = chain.proceed(request)
        
        if (response.code == 401) {
            // Token expired - redirect to login
            tokenManager.clearToken()
        }
        
        return response
    }
}

val client = OkHttpClient.Builder()
    .addInterceptor(AuthInterceptor(tokenManager))
    .build()

val retrofit = Retrofit.Builder()
    .baseUrl("https://www.bahar.co.il/mytrips-viewer-api/")
    .client(client)
    .build()
```

---

## 🌐 React Native Implementation

### 1. Login Request
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

const appLogin = async (email, password) => {
  try {
    const response = await fetch(
      'https://www.bahar.co.il/mytrips-viewer-api/auth/app-login',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};
```

### 2. Store Token
```javascript
const handleLogin = async (email, password) => {
  try {
    const result = await appLogin(email, password);
    
    if (result.authenticated) {
      const token = `app-login:${result.user_id}`;
      
      // Store token
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify({
        id: result.user_id,
        email: email
      }));
      
      // Navigate to dashboard
      navigation.navigate('Dashboard');
    }
  } catch (error) {
    Alert.alert('Login Failed', error.message);
  }
};
```

### 3. Use Token in API Calls
```javascript
const fetchUserData = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    const response = await fetch(
      'https://www.bahar.co.il/mytrips-viewer-api/auth/me',
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (response.status === 401) {
      // Token expired
      await AsyncStorage.removeItem('token');
      navigation.navigate('Login');
      return;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
  }
};
```

---

## 🔄 Token Refresh Pattern

### Check Token on App Start
```javascript
// React Native example
useEffect(() => {
  const checkToken = async () => {
    const token = await AsyncStorage.getItem('token');
    
    if (token) {
      try {
        // Verify token is still valid
        const response = await fetch(
          'https://www.bahar.co.il/mytrips-viewer-api/auth/me',
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
        
        if (response.ok) {
          // Token valid - go to dashboard
          navigation.navigate('Dashboard');
        } else {
          // Token invalid - go to login
          await AsyncStorage.removeItem('token');
          navigation.navigate('Login');
        }
      } catch (error) {
        navigation.navigate('Login');
      }
    } else {
      navigation.navigate('Login');
    }
  };
  
  checkToken();
}, []);
```

---

## 📊 Response Formats

### Success (200 OK)
```json
{
  "authenticated": true,
  "user_id": 123,
  "message": "Login successful"
}
```

### Failure (400 Bad Request)
```json
{
  "authenticated": false,
  "message": "Invalid credentials"
}
```

### Unauthorized (401)
```json
{
  "detail": "Invalid token"
}
```

---

## ✅ Implementation Checklist

- [ ] Implement login endpoint call
- [ ] Parse response correctly
- [ ] Store token securely (Keychain/Keystore/AsyncStorage)
- [ ] Add Authorization header to all requests
- [ ] Handle 401 responses
- [ ] Implement logout
- [ ] Test with invalid credentials
- [ ] Test with network errors
- [ ] Test token persistence
- [ ] Implement error messages

---

**Version:** 1.0
**Last Updated:** November 3, 2025
**Status:** ✅ READY FOR IMPLEMENTATION

