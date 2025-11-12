# Deployment Guide for www.bahar.co.il/mytrips-viewer/

## ✅ Production Deployment Guide

The application is deployed as a **static frontend** at:
**https://www.bahar.co.il/mytrips-viewer/**

**Important**: No backend server is required for production. The frontend calls external APIs directly.

---

## 📦 Build Information

**Last Updated:** 2025-10-27
**Build Location:** `./build/`
**Base Path:** `/mytrips-viewer/`
**Build Size:**
- JavaScript: ~137 kB (gzipped)
- CSS: ~9 kB (gzipped)

## 🏗️ API Architecture

The application uses **two separate external APIs**:

### 1. MyTrips API (`https://mytrips-api.bahar.co.il`)
- **Purpose**: User authentication
- **Endpoint**: `/auth/app-login`
- **Authentication**: Email/password credentials
- **Called by**: Frontend directly

### 2. Location API (`https://mytrips-api.bahar.co.il/location/api`)
- **Purpose**: User locations, route history, driving records
- **Endpoints**:
  - `/users.php` - Get list of users with location data
  - `/locations.php` - Get location history for a user
  - `/driving-records.php` - Get driving records
- **Authentication**:
  - `Authorization: Bearer {LOC_API_TOKEN}`
  - `X-API-Token: {LOC_API_TOKEN}`
- **Called by**: Frontend directly

**Note**: The backend (`backend/server.py`) is **NOT deployed** in production. It's only used for local development.

---

## 📁 Files to Deploy

Upload the entire contents of the `./build/` directory to your web server:

```
build/
├── index.html              # Main HTML file
├── asset-manifest.json     # Asset manifest
├── static/                 # Static assets (JS, CSS)
│   ├── css/
│   │   └── main.9b48a3f0.css
│   └── js/
│       └── main.d3e2cccf.js
└── vendor/                 # Fonts and local assets
    └── fonts/
```

---

## 🚀 Deployment Steps

### Step 1: Build the Application

```bash
make build
```

This will:
- Build the production bundle
- Create a timestamped deployment package (e.g., `mytrips-viewer-20251027-163623.tar.gz`)
- Display deployment instructions

**Output:**
```
✅ Build complete!
📁 Build directory: ./build/
📦 Deployment package: mytrips-viewer-20251027-163623.tar.gz
📊 Package size: 1.6M
```

### Step 2: Deploy the Package

Choose one of the following deployment methods:

#### **Option 1: Upload and Extract Package (Recommended)**

1. **Upload the package to your server:**
   ```bash
   scp mytrips-viewer-*.tar.gz user@www.bahar.co.il:/tmp/
   ```

2. **SSH into your server:**
   ```bash
   ssh user@www.bahar.co.il
   ```

3. **Navigate to the deployment directory:**
   ```bash
   cd /path/to/www.bahar.co.il/public_html/mytrips-viewer
   # Or create it if it doesn't exist:
   mkdir -p /path/to/www.bahar.co.il/public_html/mytrips-viewer
   cd /path/to/www.bahar.co.il/public_html/mytrips-viewer
   ```

4. **Extract the package:**
   ```bash
   tar -xzf /tmp/mytrips-viewer-*.tar.gz
   ```

5. **Set proper permissions:**
   ```bash
   chmod -R 755 .
   ```

6. **Clean up:**
   ```bash
   rm /tmp/mytrips-viewer-*.tar.gz
   ```

#### **Option 2: Manual Upload (FTP/SFTP)**

1. **Connect to your server:**
   ```bash
   sftp user@www.bahar.co.il
   ```

2. **Navigate to the web root:**
   ```bash
   cd /path/to/www.bahar.co.il/public_html
   ```

3. **Create the mytrips-viewer directory (if it doesn't exist):**
   ```bash
   mkdir -p mytrips-viewer
   cd mytrips-viewer
   ```

4. **Upload all files from the build directory:**
   ```bash
   put -r /Users/adar.bahar/Code/mytrips-ui2/build/* .
   ```

5. **Set proper permissions:**
   ```bash
   chmod -R 755 .
   ```

### Option 2: Using rsync (Recommended)

```bash
# Sync the build directory to the server
rsync -avz --delete \
  ./build/ \
  user@www.bahar.co.il:/path/to/www.bahar.co.il/public_html/mytrips-viewer/

# Example with specific path:
rsync -avz --delete \
  ./build/ \
  adar@www.bahar.co.il:/var/www/bahar.co.il/mytrips-viewer/
```

### Option 3: Using SCP

```bash
# Copy the entire build directory
scp -r ./build/* user@www.bahar.co.il:/path/to/www.bahar.co.il/public_html/mytrips-viewer/
```

---

## ⚙️ Server Configuration

### Apache (.htaccess)

The `.htaccess` file is **automatically included** in the build package. It contains:

```apache
# Enable rewrite engine
RewriteEngine On

# Redirect all requests to index.html for client-side routing
RewriteBase /mytrips-viewer/
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /mytrips-viewer/index.html [L]

# Enable gzip compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType application/font-woff "access plus 1 year"
  ExpiresByType application/font-woff2 "access plus 1 year"
</IfModule>

# Security headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
  Header set Content-Security-Policy "connect-src 'self' https://www.bahar.co.il https://bahar.co.il https://mytrips-api.bahar.co.il https://maps.googleapis.com https://api.amplitude.com https://api.eu.amplitude.com https://sr-client-cfg.eu.amplitude.com https://api.brevo.com https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com"
</IfModule>
```

**Note**: The `.htaccess` file is automatically copied to the build directory during `make build`.

### Nginx Configuration

If using Nginx, add this to your server block:

```nginx
location /mytrips-viewer/ {
    alias /var/www/bahar.co.il/mytrips-viewer/;
    try_files $uri $uri/ /mytrips-viewer/index.html;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header X-Content-Type-Options "nosniff";
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
}
```

---

## 🔧 Environment Variables

The frontend uses the following environment variables (embedded at build time):

### Production (`.env.production`)

```bash
# Backend API URL (MyTrips API for authentication)
REACT_APP_BACKEND_URL=https://mytrips-api.bahar.co.il

# Google Maps API Key
# Get your key from: https://console.cloud.google.com/apis/credentials
# IMPORTANT: Restrict this key to www.bahar.co.il domain
REACT_APP_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY_HERE

# Location API Configuration
# Contact your Location API administrator for the token
REACT_APP_LOC_API_TOKEN=YOUR_LOCATION_API_TOKEN_HERE
REACT_APP_LOC_API_BASEURL=https://mytrips-api.bahar.co.il/location/api

# MyTrips API (for authentication)
REACT_APP_MYTRIPS_API_BASEURL=https://mytrips-api.bahar.co.il
```

**Important**: These values are **embedded into the JavaScript bundle** at build time. To change them:
1. Update `.env.production`
2. Run `make build` to rebuild
3. Redeploy the new build

### Development (`.env`)

```bash
# Backend API URL (local development)
REACT_APP_BACKEND_URL=http://localhost:8000

# Google Maps API Key
# Get your key from: https://console.cloud.google.com/apis/credentials
REACT_APP_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY_HERE

# Location API Configuration
# Contact your Location API administrator for the token
REACT_APP_LOC_API_TOKEN=YOUR_LOCATION_API_TOKEN_HERE
REACT_APP_LOC_API_BASEURL=https://mytrips-api.bahar.co.il/location/api

# MyTrips API
REACT_APP_MYTRIPS_API_BASEURL=https://mytrips-api.bahar.co.il
```

---

## ✅ Post-Deployment Checklist

- [ ] All files uploaded to `/mytrips-viewer/` directory
- [ ] `.htaccess` file included in deployment (automatically copied during build)
- [ ] Permissions set correctly (755 for directories, 644 for files)
- [ ] MyTrips API accessible at `https://mytrips-api.bahar.co.il/auth/app-login`
- [ ] Location API accessible at `https://mytrips-api.bahar.co.il/location/api`
- [ ] Google Maps API key configured and restricted to `www.bahar.co.il`
- [ ] Test the application at `https://www.bahar.co.il/mytrips-viewer/`
- [ ] Test authentication flow (login with credentials)
- [ ] Test user list loading from Location API
- [ ] Test map loading with Google Maps
- [ ] Check browser console for errors (especially CSP errors)
- [ ] Verify no 404 errors for `/users` or `/routes` endpoints
- [ ] Test on mobile devices

---

## 🧪 Testing

After deployment, test the following:

1. **Access the application:**
   ```
   https://www.bahar.co.il/mytrips-viewer/
   ```

2. **Check routing:**
   - Navigate to `https://www.bahar.co.il/mytrips-viewer/auth`
   - Should load the login page without 404 errors

3. **Test authentication:**
   - Login with your credentials
   - Verify JWT token is stored
   - Check that you're redirected to the map dashboard

4. **Test map functionality:**
   - Verify Google Maps loads correctly
   - Check that user list appears
   - Select a user and verify location marker appears
   - Test route history visualization

5. **Check browser console:**
   - Open DevTools (F12)
   - Look for any errors in the Console tab
   - Check Network tab for failed requests

---

## 🔍 Troubleshooting

### Issue: 404 errors when refreshing the page

**Solution:** Make sure the `.htaccess` file is included in the deployment. It's automatically copied during `make build`.

### Issue: Blank page or "Cannot GET /mytrips-viewer/"

**Solution:**
- Check that all files are uploaded correctly
- Verify the base path in `package.json` is `/mytrips-viewer`
- Check browser console for JavaScript errors

### Issue: 404 errors for `/users` or `/routes` endpoints

**Symptom:**
```
GET https://mytrips-api.bahar.co.il/routes 404 (Not Found)
GET https://mytrips-api.bahar.co.il/users 404 (Not Found)
```

**Solution:** This is expected! The frontend should call the Location API directly, not the MyTrips API. Make sure you've rebuilt with the latest code:
```bash
make clean && make build
```

The frontend should call:
- `https://www.bahar.co.il/location/api/users.php` for users
- Routes are mocked (no API endpoint)

### Issue: CSP errors for Google Maps

**Symptom:**
```
Refused to connect to 'https://maps.googleapis.com/...' because it violates the following Content Security Policy directive
```

**Solution:** Make sure the `.htaccess` file is deployed with the CSP header that includes `https://maps.googleapis.com`. The `.htaccess` file is automatically included in the build.

### Issue: Authentication failing

**Solution:**
- Verify MyTrips API is accessible at `https://mytrips-api.bahar.co.il/auth/app-login`
- Check credentials are correct
- Check browser console for error messages

### Issue: Users not loading

**Solution:**
- Verify Location API is accessible at `https://mytrips-api.bahar.co.il/location/api/users.php`
- Check that `REACT_APP_LOC_API_TOKEN` is set correctly in `.env.production`
- Verify both `Authorization: Bearer` and `X-API-Token` headers are being sent
- Check browser console for 401 or 403 errors

### Issue: Google Maps not loading

**Solution:**
- Check that `REACT_APP_GOOGLE_MAPS_API_KEY` is set correctly in `.env.production`
- Verify the API key is restricted to `www.bahar.co.il` in Google Cloud Console
- Check browser console for API key errors

### Issue: Fonts not loading

**Solution:**
- Verify the `vendor/fonts/` directory was uploaded
- Check that the path to fonts is correct in the HTML

---

## 🔄 Updating the Deployment

When you make changes and need to redeploy:

1. **Make your code changes**

2. **Rebuild the application:**
   ```bash
   make build
   ```

3. **Upload the new build:**
   ```bash
   rsync -avz --delete ./build/ user@www.bahar.co.il:/path/to/mytrips-viewer/
   ```

4. **Clear browser cache or do a hard refresh:**
   - Chrome/Firefox: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

---

## 📊 Monitoring

After deployment, monitor:

- **Server logs** for any errors
- **Browser console** for JavaScript errors
- **Network requests** for failed API calls
- **Google Maps API usage** in Google Cloud Console

---

## 🔐 Security Notes

- ✅ All `.env` files are excluded from the build
- ✅ API keys are embedded in the build (use domain restrictions)
- ✅ Google Maps API key should be restricted to `www.bahar.co.il`
- ✅ Location API token (`LOC_API_TOKEN`) is embedded in the build
- ✅ All API endpoints use HTTPS
- ✅ Content Security Policy (CSP) restricts allowed domains
- ⚠️ **Important**: The `LOC_API_TOKEN` is visible in the JavaScript bundle. Make sure the Location API has proper rate limiting and domain restrictions.

---

## 📞 Support

If you encounter issues:

1. Check the browser console for errors
2. Check server logs
3. Verify all configuration files are correct
4. Test the backend API independently
5. Review the main [DEPLOYMENT.md](./DEPLOYMENT.md) for general deployment guidance

---

**Deployment prepared on:** 2025-10-27  
**Build location:** `./build/`  
**Target URL:** https://www.bahar.co.il/mytrips-viewer/

