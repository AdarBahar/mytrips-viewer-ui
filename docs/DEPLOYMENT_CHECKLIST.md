# Production Deployment Checklist

Use this checklist before deploying to production.

---

## 📋 Pre-Deployment

### Environment Configuration

#### Frontend
- [ ] Copy `frontend/.env.production.example` to `frontend/.env.production`
- [ ] Set `REACT_APP_BACKEND_URL` to production API URL
- [ ] Set `REACT_APP_GOOGLE_MAPS_API_KEY` with production key
- [ ] Verify Google Maps API key has domain restrictions
- [ ] Remove any development-only code or console.log statements

#### Backend
- [ ] Copy `backend/.env.production.example` to `backend/.env`
- [ ] Set `MOCK_AUTH_ENABLED="false"`
- [ ] Generate secure `JWT_SECRET` (run: `openssl rand -hex 32`)
- [ ] Set `LOC_API_TOKEN` with production token
- [ ] Set `MYTRIPS_API_BASEURL` to production URL
- [ ] Set `CORS_ORIGINS` to your frontend domain(s) (NOT `*`)
- [ ] Verify all API endpoints are accessible

### Security
- [ ] All secrets are in `.env` files (not hardcoded)
- [ ] `.env` files are in `.gitignore`
- [ ] Google Maps API key is restricted to production domain
- [ ] CORS is configured for specific domains only
- [ ] HTTPS is enabled for all endpoints
- [ ] JWT secret is strong and random
- [ ] No sensitive data in frontend code

### Code Quality
- [ ] All tests pass
- [ ] No console errors in browser
- [ ] No deprecation warnings
- [ ] Code is linted and formatted
- [ ] Dependencies are up to date

---

## 🏗️ Build Process

### Option 1: Traditional Build

```bash
# 1. Build frontend
make build

# 2. Verify build output
ls -la build/

# 3. Test build locally (optional)
npx serve -s build -l 3000
```

### Option 2: Docker Build

```bash
# 1. Build Docker images
make docker-build

# 2. Verify images
docker images | grep mytrips
```

---

## 🚀 Deployment

### Option A: Static Hosting + VPS

#### Deploy Frontend (Choose one)

**Netlify:**
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=build
```

**Vercel:**
```bash
npm install -g vercel
npm run build
vercel --prod
```

**AWS S3:**
```bash
npm run build
aws s3 sync build/ s3://your-bucket/ --delete
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

#### Deploy Backend (VPS)

```bash
# 1. SSH to server
ssh user@your-server.com

# 2. Clone/pull code
git clone https://github.com/yourusername/mytrips-ui2.git
cd mytrips-ui2

# 3. Install backend dependencies
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt gunicorn

# 4. Configure environment
cp .env.production.example .env
nano .env  # Edit with your values

# 5. Set up systemd service (see DEPLOYMENT.md)
sudo cp mytrips-backend.service /etc/systemd/system/
sudo systemctl enable mytrips-backend
sudo systemctl start mytrips-backend

# 6. Configure Nginx (see DEPLOYMENT.md)
sudo cp nginx.conf /etc/nginx/sites-available/mytrips
sudo ln -s /etc/nginx/sites-available/mytrips /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 7. Set up SSL
sudo certbot --nginx -d yourdomain.com
```

### Option B: Docker Deployment

```bash
# 1. SSH to server
ssh user@your-server.com

# 2. Clone/pull code
git clone https://github.com/yourusername/mytrips-ui2.git
cd mytrips-ui2

# 3. Configure environment
cp backend/.env.production.example backend/.env
nano backend/.env  # Edit with your values

# 4. Start with Docker Compose
make docker-up

# 5. Verify containers are running
docker ps

# 6. View logs
make docker-logs
```

---

## ✅ Post-Deployment Verification

### Frontend Checks
- [ ] Website loads at production URL
- [ ] No console errors in browser DevTools
- [ ] Google Maps loads correctly
- [ ] All routes work (refresh on any page)
- [ ] Static assets load (check Network tab)
- [ ] HTTPS is working (green padlock)
- [ ] Mobile responsive design works

### Backend Checks
- [ ] API health check responds: `curl https://api.yourdomain.com/health`
- [ ] Login works with real credentials
- [ ] Users endpoint returns data: `curl https://api.yourdomain.com/api/users`
- [ ] Location API integration works
- [ ] CORS headers are correct
- [ ] Logs show no errors

### Performance Checks
- [ ] Page load time < 3 seconds
- [ ] Lighthouse score > 90
- [ ] Gzip compression enabled
- [ ] Static assets cached properly
- [ ] API response time < 500ms

### Security Checks
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] Security headers present (check with securityheaders.com)
- [ ] No secrets exposed in frontend code
- [ ] CORS only allows your domain
- [ ] Rate limiting works (if configured)

---

## 🔧 Troubleshooting

### Frontend Issues

**White screen / blank page:**
- Check browser console for errors
- Verify `REACT_APP_BACKEND_URL` is correct
- Check if build files exist in `build/`
- Verify Nginx/server is serving files correctly

**API calls failing:**
- Check CORS configuration
- Verify backend URL is correct
- Check if backend is running
- Look at Network tab in DevTools

**Google Maps not loading:**
- Verify API key is correct
- Check domain restrictions on API key
- Look for errors in console

### Backend Issues

**500 Internal Server Error:**
- Check backend logs: `sudo journalctl -u mytrips-backend -f`
- Verify environment variables are set
- Check if external APIs are accessible

**CORS errors:**
- Verify `CORS_ORIGINS` in backend `.env`
- Check if frontend domain matches CORS config
- Restart backend after changing CORS

**Authentication failing:**
- Verify `MOCK_AUTH_ENABLED="false"`
- Check MyTrips API is accessible
- Verify `LOC_API_TOKEN` is correct
- Check logs for API errors

---

## 📊 Monitoring

### Set Up Monitoring

- [ ] Configure uptime monitoring (UptimeRobot, Pingdom, etc.)
- [ ] Set up error tracking (Sentry, Rollbar, etc.)
- [ ] Configure log aggregation (if needed)
- [ ] Set up alerts for downtime
- [ ] Monitor API response times

### Regular Checks

- [ ] Check logs daily for errors
- [ ] Monitor disk space
- [ ] Check SSL certificate expiry
- [ ] Review API usage/quotas
- [ ] Check for security updates

---

## 🔄 Rollback Plan

If something goes wrong:

### Frontend Rollback
```bash
# Revert to previous build
git checkout <previous-commit>
npm run build
# Re-deploy build/
```

### Backend Rollback
```bash
# Revert code
git checkout <previous-commit>

# Restart service
sudo systemctl restart mytrips-backend
```

### Docker Rollback
```bash
# Stop current containers
make docker-down

# Checkout previous version
git checkout <previous-commit>

# Rebuild and restart
make docker-build
make docker-up
```

---

## 📞 Support

If you encounter issues:

1. Check logs first
2. Review this checklist
3. Consult DEPLOYMENT.md for detailed instructions
4. Check environment variables
5. Verify external API connectivity

---

**Last Updated:** 2025-10-27

