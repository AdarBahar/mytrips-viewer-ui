# Backend Deployment Guide for www.bahar.co.il

## 🚨 Current Issue

The SSE proxy endpoint at `/api/location/live/sse` is implemented in the backend, but **the backend is not deployed** in production. This causes a 404 error when the frontend tries to connect to the SSE stream.

---

## ✅ Solution: Deploy the Backend

The backend needs to be deployed at `https://www.bahar.co.il/mytrips-viewer-api/` to serve the SSE proxy endpoint.

---

## 🚀 Deployment Options

### Option 1: Docker Deployment (Recommended)

#### Step 1: Build Docker Image

```bash
# From project root
docker-compose build backend
```

#### Step 2: Configure Environment

Create `backend/.env` with production values:

```bash
# Production mode
MOCK_AUTH_ENABLED=false

# JWT Secret (generate a secure random key)
JWT_SECRET="your-secure-random-secret-here"

# API Configuration
LOC_API_TOKEN="your-location-api-token"
MYTRIPS_API_BASEURL="https://mytrips-api.bahar.co.il"

# CORS Configuration
CORS_ORIGINS="https://www.bahar.co.il,https://www.bahar.co.il/mytrips-viewer"

# Debug mode (set to false in production)
DEBUG_MODE=false
```

#### Step 3: Run Backend

```bash
# Start backend container
docker-compose up -d backend

# View logs
docker-compose logs -f backend

# Stop backend
docker-compose down
```

The backend will run on `http://localhost:8000` inside the container.

---

### Option 2: Manual Deployment (VPS/Shared Hosting)

#### Step 1: SSH to Server

```bash
ssh user@www.bahar.co.il
```

#### Step 2: Clone Repository

```bash
cd /var/www/bahar.co.il
git clone https://github.com/AdarBahar/mytrips-viewer-ui.git
cd mytrips-viewer-ui
```

#### Step 3: Set Up Python Environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt gunicorn
```

#### Step 4: Configure Environment

```bash
cp .env.example .env
nano .env  # Edit with production values
```

#### Step 5: Run with Gunicorn

```bash
gunicorn server:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 127.0.0.1:8000 \
  --access-logfile /var/log/mytrips/access.log \
  --error-logfile /var/log/mytrips/error.log \
  --daemon
```

---

### Option 3: Systemd Service (Linux)

#### Step 1: Create Service File

Create `/etc/systemd/system/mytrips-backend.service`:

```ini
[Unit]
Description=MyTrips Backend API
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/var/www/bahar.co.il/mytrips-viewer-ui/backend
Environment="PATH=/var/www/bahar.co.il/mytrips-viewer-ui/backend/venv/bin"
ExecStart=/var/www/bahar.co.il/mytrips-viewer-ui/backend/venv/bin/gunicorn server:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 127.0.0.1:8000 \
  --access-logfile /var/log/mytrips/access.log \
  --error-logfile /var/log/mytrips/error.log
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### Step 2: Enable and Start Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable mytrips-backend
sudo systemctl start mytrips-backend
sudo systemctl status mytrips-backend
```

---

## 🔧 Nginx Configuration

Configure Nginx to proxy requests to the backend:

Create `/etc/nginx/sites-available/mytrips`:

```nginx
upstream mytrips_backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    listen [::]:80;
    server_name www.bahar.co.il;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.bahar.co.il;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/www.bahar.co.il/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.bahar.co.il/privkey.pem;

    # Frontend (static files)
    location /mytrips-viewer/ {
        alias /var/www/bahar.co.il/mytrips-viewer/;
        try_files $uri $uri/ /mytrips-viewer/index.html;
    }

    # Backend API Proxy
    location /mytrips-viewer-api/ {
        proxy_pass http://mytrips_backend/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/mytrips /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## ✅ Verification

### Test Backend Health

```bash
curl https://www.bahar.co.il/mytrips-viewer-api/health
```

Expected response:
```json
{"status": "ok"}
```

### Test SSE Endpoint

```bash
curl -N \
  -H 'Accept: text/event-stream' \
  "https://www.bahar.co.il/mytrips-viewer-api/location/live/sse?users=Adar&heartbeat=2&limit=1"
```

Expected: SSE stream with location events

### Test in Browser

1. Open https://www.bahar.co.il/mytrips-viewer/
2. Open DevTools (F12)
3. Go to Network tab
4. Filter by "sse"
5. Should see request to `/mytrips-viewer-api/location/live/sse`
6. Status should be 200 (not 404)

---

## 🔐 Environment Variables

### Required for Production

```bash
# API Authentication
LOC_API_TOKEN=<your-token>
MYTRIPS_API_BASEURL=https://mytrips-api.bahar.co.il

# JWT Secret (generate with: openssl rand -hex 32)
JWT_SECRET=<secure-random-secret>

# CORS
CORS_ORIGINS=https://www.bahar.co.il,https://www.bahar.co.il/mytrips-viewer

# Debug (set to false in production)
DEBUG_MODE=false
```

---

## 📊 Monitoring

### View Logs

```bash
# Systemd service
sudo journalctl -u mytrips-backend -f

# Docker
docker-compose logs -f backend

# Gunicorn
tail -f /var/log/mytrips/access.log
tail -f /var/log/mytrips/error.log
```

### Health Check

```bash
curl https://www.bahar.co.il/mytrips-viewer-api/health
```

---

## 🚨 Troubleshooting

### Backend returns 502 Bad Gateway

**Cause:** Backend not running or not responding
**Solution:**
```bash
sudo systemctl status mytrips-backend
sudo systemctl restart mytrips-backend
```

### SSE returns 404

**Cause:** Backend not deployed or route not registered
**Solution:**
1. Verify backend is running
2. Check Nginx proxy configuration
3. Verify `/api/location/live/sse` endpoint exists

### SSE returns 401

**Cause:** LOC_API_TOKEN not set or invalid
**Solution:**
1. Check `LOC_API_TOKEN` in `backend/.env`
2. Verify token is valid
3. Check backend logs for errors

---

## ✅ Deployment Checklist

- [ ] Backend code deployed to server
- [ ] Python virtual environment created
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] `backend/.env` configured with production values
- [ ] Gunicorn or Docker running backend
- [ ] Nginx configured to proxy `/mytrips-viewer-api/` to backend
- [ ] SSL certificate configured
- [ ] Backend health check passing
- [ ] SSE endpoint responding with 200
- [ ] Frontend can connect to SSE stream
- [ ] Live location updates working

---

## 📚 References

- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Gunicorn Documentation](https://gunicorn.org/)
- [Nginx Proxy Configuration](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [Systemd Service Files](https://www.freedesktop.org/software/systemd/man/systemd.service.html)

