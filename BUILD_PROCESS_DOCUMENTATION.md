# Build Process Documentation

## Overview

The frontend build process has been updated to embed environment variables at build time, eliminating the need for `.env.production` files in production deployments.

## Key Changes

### 1. **No `.env.production` File in Production**
- ✅ Environment variables are passed to the build command
- ✅ No `.env` files needed in production deployment
- ✅ All configuration is embedded in the compiled JavaScript bundle
- ✅ Secrets are never exposed in the deployed package

### 2. **Build Process Flow**

```bash
# Development (uses frontend/.env)
npm start

# Production (uses environment variables passed at build time)
make build REACT_APP_GOOGLE_MAPS_API_KEY=xxx REACT_APP_LOC_API_TOKEN=xxx
```

### 3. **Environment Variables**

The following environment variables are embedded at build time:

| Variable | Purpose | Default | Required |
|----------|---------|---------|----------|
| `REACT_APP_GOOGLE_MAPS_API_KEY` | Google Maps API key | None | ✅ Yes |
| `REACT_APP_LOC_API_TOKEN` | Location API token | None | ✅ Yes |
| `REACT_APP_LOC_API_BASEURL` | Location API endpoint | `https://mytrips-api.bahar.co.il/location/api` | ❌ No |
| `REACT_APP_MYTRIPS_API_BASEURL` | MyTrips API endpoint | `https://mytrips-api.bahar.co.il` | ❌ No |

### 4. **Build Command**

```bash
# Basic build (uses default API endpoints)
make build \
  REACT_APP_GOOGLE_MAPS_API_KEY="your-google-maps-key" \
  REACT_APP_LOC_API_TOKEN="your-location-api-token"

# Custom endpoints (if needed)
make build \
  REACT_APP_GOOGLE_MAPS_API_KEY="your-google-maps-key" \
  REACT_APP_LOC_API_TOKEN="your-location-api-token" \
  REACT_APP_LOC_API_BASEURL="https://custom-api.example.com/location/api" \
  REACT_APP_MYTRIPS_API_BASEURL="https://custom-api.example.com"
```

### 5. **Build Output**

The build process displays which environment variables are being used:

```
🏗️  Building frontend for production...
📋 Environment variables:
   REACT_APP_GOOGLE_MAPS_API_KEY: [set]
   REACT_APP_LOC_API_TOKEN: [set]
   REACT_APP_LOC_API_BASEURL: https://mytrips-api.bahar.co.il/location/api
   REACT_APP_MYTRIPS_API_BASEURL: https://mytrips-api.bahar.co.il

📦 Creating deployment package...
✅ Build complete!
📁 Build directory: ./build/
📦 Deployment package: mytrips-viewer-20251113-132400.tar.gz
```

## Deployment Process

### 1. **Build on CI/CD Server**

```bash
# Set environment variables from secrets management
export REACT_APP_GOOGLE_MAPS_API_KEY="$(aws secretsmanager get-secret-value --secret-id google-maps-key --query SecretString --output text)"
export REACT_APP_LOC_API_TOKEN="$(aws secretsmanager get-secret-value --secret-id loc-api-token --query SecretString --output text)"

# Build the package
make build
```

### 2. **Deploy Package**

```bash
# Copy package to production server
scp mytrips-viewer-*.tar.gz user@www.bahar.co.il:/tmp/

# Extract on production server
ssh user@www.bahar.co.il
cd /var/www/mytrips-viewer
tar -xzf /tmp/mytrips-viewer-*.tar.gz
```

### 3. **No Configuration Needed**

- ✅ No `.env` files to create
- ✅ No environment variables to set on server
- ✅ All configuration is in the compiled bundle
- ✅ Ready to serve immediately

## Security Benefits

1. **No Secrets in Repository**
   - `.env.production` is in `.gitignore`
   - Secrets never committed to git
   - No accidental exposure in version control

2. **No Secrets in Deployment Package**
   - Secrets only embedded at build time
   - Package contains only compiled code
   - Safe to store in artifact repositories

3. **Secrets Management**
   - Use CI/CD secrets management (GitHub Secrets, AWS Secrets Manager, etc.)
   - Secrets never exposed in logs
   - Rotation is simple - just rebuild

## Development vs Production

### Development (frontend/.env)
```bash
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_GOOGLE_MAPS_API_KEY="dev-key"
LOC_API_TOKEN="dev-token"
```

### Production (build-time variables)
```bash
REACT_APP_GOOGLE_MAPS_API_KEY="prod-key"
REACT_APP_LOC_API_TOKEN="prod-token"
REACT_APP_LOC_API_BASEURL="https://mytrips-api.bahar.co.il/location/api"
REACT_APP_MYTRIPS_API_BASEURL="https://mytrips-api.bahar.co.il"
```

## Troubleshooting

### Build fails with "REACT_APP_GOOGLE_MAPS_API_KEY is not defined"

**Solution**: Pass the environment variable to the build command:
```bash
make build REACT_APP_GOOGLE_MAPS_API_KEY="your-key" REACT_APP_LOC_API_TOKEN="your-token"
```

### API calls fail with 404 errors

**Solution**: Verify the API endpoints are correct:
```bash
# Check what was embedded in the build
grep -r "mytrips-api.bahar.co.il" build/static/js/
```

### Wrong API endpoint in production

**Solution**: Rebuild with correct endpoint:
```bash
make build \
  REACT_APP_GOOGLE_MAPS_API_KEY="key" \
  REACT_APP_LOC_API_TOKEN="token" \
  REACT_APP_LOC_API_BASEURL="https://correct-endpoint.com/location/api"
```

## Files Modified

- `Makefile` - Updated build process to pass environment variables
- `frontend/.env.production.example` - Template for environment variables
- `.gitignore` - Ensures `.env.production` is never committed

## References

- [Create React App - Environment Variables](https://create-react-app.dev/docs/adding-custom-environment-variables/)
- [Node.js Environment Variables](https://nodejs.org/en/learn/how-to-work-with-environment-variables-in-nodejs)

