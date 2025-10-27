# Production Deployment Guide

This guide covers how to build and deploy the MyTrips UI application to production.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Frontend Build](#frontend-build)
3. [Backend Deployment](#backend-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Deployment Options](#deployment-options)
6. [Docker Deployment](#docker-deployment)
7. [Nginx Configuration](#nginx-configuration)
8. [Security Checklist](#security-checklist)

---

## 🚀 Quick Start

### Build Everything

```bash
# 1. Build frontend
make build

# 2. The production build will be in ./build/
ls -la build/
```

---

## 🎨 Frontend Build

### Option 1: Using Make (Recommended)

```bash
make build
```

### Option 2: Using npm/yarn directly

```bash
npm run build
# or
yarn build
```

### Build Output

The build creates an optimized production bundle in the `./build/` directory:

```
build/
├── index.html           # Main HTML file
├── static/
│   ├── css/            # Minified CSS
│   ├── js/             # Minified JavaScript bundles
│   └── media/          # Images and other assets
├── vendor/             # Third-party libraries
└── asset-manifest.json # Asset mapping
```

### Build Configuration

The build process:
- ✅ Minifies JavaScript and CSS
- ✅ Optimizes images
- ✅ Generates source maps
- ✅ Hashes filenames for cache busting
- ✅ Tree-shakes unused code
- ✅ Bundles all dependencies

---

## 🔧 Backend Deployment

### Production Server Setup

#### 1. Install Dependencies

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### 2. Configure Environment

Create `backend/.env` with production values:

```bash
# Production mode
MOCK_AUTH_ENABLED="false"

# JWT Secret (generate a secure random key)
JWT_SECRET="your-secure-random-secret-here"

# API Endpoints
LOC_API_TOKEN="your-location-api-token"
LOC_API_BASEURL="https://www.bahar.co.il/location/api"
MYTRIPS_API_BASEURL="https://mytrips-api.bahar.co.il"

# CORS (set to your frontend domain)
CORS_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
```

#### 3. Run with Gunicorn (Production WSGI Server)

Install Gunicorn:
```bash
pip install gunicorn
```

Run the server:
```bash
gunicorn server:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --access-logfile - \
  --error-logfile -
```

#### 4. Run as a System Service (Linux)

Create `/etc/systemd/system/mytrips-backend.service`:

```ini
[Unit]
Description=MyTrips Backend API
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/var/www/mytrips/backend
Environment="PATH=/var/www/mytrips/backend/venv/bin"
ExecStart=/var/www/mytrips/backend/venv/bin/gunicorn server:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 127.0.0.1:8000 \
  --access-logfile /var/log/mytrips/access.log \
  --error-logfile /var/log/mytrips/error.log

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable mytrips-backend
sudo systemctl start mytrips-backend
sudo systemctl status mytrips-backend
```

---

## 🌍 Environment Configuration

### Frontend Environment Variables

Create `frontend/.env.production`:

```bash
# Backend API URL (production)
REACT_APP_BACKEND_URL=https://api.yourdomain.com

# Google Maps API Key (restricted to your domain)
REACT_APP_GOOGLE_MAPS_API_KEY="your-production-google-maps-key"
```

**Important:** The frontend `.env` file is embedded in the build, so:
- ✅ Use a Google Maps API key restricted to your domain
- ✅ Never put secrets in frontend environment variables
- ✅ Rebuild the frontend if you change environment variables

### Backend Environment Variables

See [Backend Deployment](#backend-deployment) section above.

---

## 📦 Deployment Options

### Option 1: Static Hosting + API Server

**Frontend:** Deploy to static hosting (Netlify, Vercel, S3, etc.)  
**Backend:** Deploy to VPS, cloud server, or container platform

#### Deploy Frontend to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build
npm run build

# Deploy
netlify deploy --prod --dir=build
```

#### Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Build
npm run build

# Deploy
vercel --prod
```

#### Deploy Frontend to AWS S3 + CloudFront

```bash
# Build
npm run build

# Upload to S3
aws s3 sync build/ s3://your-bucket-name/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

### Option 2: Single Server (VPS)

Deploy both frontend and backend on the same server using Nginx.

See [Nginx Configuration](#nginx-configuration) below.

### Option 3: Docker

See [Docker Deployment](#docker-deployment) below.

---

## 🐳 Docker Deployment

### Create Dockerfiles

#### Frontend Dockerfile

Create `frontend/Dockerfile`:

```dockerfile
# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build for production
RUN yarn build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### Backend Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy application
COPY server.py .

# Expose port
EXPOSE 8000

# Run with gunicorn
CMD ["gunicorn", "server:app", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000"]
```

### Docker Compose

Create `docker-compose.yml` in the root:

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file:
      - ./backend/.env
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
```

### Deploy with Docker

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## 🌐 Nginx Configuration

### Serve Frontend + Proxy Backend

Create `/etc/nginx/sites-available/mytrips`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend - serve static files
    root /var/www/mytrips/build;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/mytrips /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Add SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 🔒 Security Checklist

Before deploying to production:

### Frontend
- [ ] Use production Google Maps API key with domain restrictions
- [ ] Set `REACT_APP_BACKEND_URL` to HTTPS production URL
- [ ] Remove any console.log statements
- [ ] Enable HTTPS only
- [ ] Set proper CORS headers

### Backend
- [ ] Generate secure `JWT_SECRET` (use `openssl rand -hex 32`)
- [ ] Set `MOCK_AUTH_ENABLED="false"`
- [ ] Configure proper `CORS_ORIGINS` (not `*`)
- [ ] Use HTTPS for all API endpoints
- [ ] Keep `.env` file secure (never commit)
- [ ] Use environment variables for all secrets
- [ ] Enable rate limiting
- [ ] Set up logging and monitoring

### Infrastructure
- [ ] Enable firewall (allow only 80, 443, 22)
- [ ] Keep system packages updated
- [ ] Set up automated backups
- [ ] Configure SSL/TLS certificates
- [ ] Set up monitoring and alerts
- [ ] Use a reverse proxy (Nginx)
- [ ] Enable gzip compression
- [ ] Set security headers

---

## 📊 Monitoring

### Backend Logs

```bash
# View systemd logs
sudo journalctl -u mytrips-backend -f

# View log files
tail -f /var/log/mytrips/access.log
tail -f /var/log/mytrips/error.log
```

### Nginx Logs

```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 🔄 Updates and Rollbacks

### Update Frontend

```bash
# Pull latest code
git pull

# Rebuild
npm run build

# Copy to web root
sudo cp -r build/* /var/www/mytrips/build/

# Clear cache
sudo systemctl reload nginx
```

### Update Backend

```bash
# Pull latest code
git pull

# Restart service
sudo systemctl restart mytrips-backend
```

---

## 📞 Support

For issues or questions:
- Check logs first
- Review environment variables
- Verify API connectivity
- Check firewall rules

---

**Last Updated:** 2025-10-27

