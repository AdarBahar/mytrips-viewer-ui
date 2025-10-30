# Quick Deployment Reference

## 🚀 One-Command Build & Package

```bash
make build
```

**What it does:**
- ✅ Builds optimized production bundle
- ✅ Creates timestamped `.tar.gz` package
- ✅ Shows deployment instructions
- ✅ Package ready to upload!

---

## 📦 Deploy to www.bahar.co.il/mytrips-viewer/

### Quick Deploy (3 commands)

```bash
# 1. Build and package
make build

# 2. Upload package
scp mytrips-viewer-*.tar.gz user@www.bahar.co.il:/tmp/

# 3. SSH and extract
ssh user@www.bahar.co.il "cd /path/to/mytrips-viewer && tar -xzf /tmp/mytrips-viewer-*.tar.gz && chmod -R 755 ."
```

---

## 📋 Full Deployment Checklist

### Before Deployment
- [ ] Code changes committed
- [ ] Tests passing
- [ ] Environment variables configured

### Build
```bash
make build
```

### Deploy
```bash
# Upload
scp mytrips-viewer-*.tar.gz user@www.bahar.co.il:/tmp/

# Extract on server
ssh user@www.bahar.co.il
cd /var/www/bahar.co.il/mytrips-viewer
tar -xzf /tmp/mytrips-viewer-*.tar.gz
chmod -R 755 .
rm /tmp/mytrips-viewer-*.tar.gz
exit
```

### Verify
- [ ] Visit https://www.bahar.co.il/mytrips-viewer/
- [ ] Test login
- [ ] Test map loading
- [ ] Check browser console (no errors)
- [ ] Test on mobile

---

## 🔧 Common Commands

```bash
# Clean old builds and packages
make clean

# Build fresh
make build

# List deployment packages
ls -lh mytrips-viewer-*.tar.gz

# View package contents
tar -tzf mytrips-viewer-*.tar.gz | head -20

# Extract package locally (for testing)
mkdir test-deploy
tar -xzf mytrips-viewer-*.tar.gz -C test-deploy
```

---

## 🌐 URLs

- **Frontend:** https://www.bahar.co.il/mytrips-viewer/
- **Backend:** https://www.bahar.co.il/mytrips-api
- **Local Dev:** http://localhost:3000

---

## 📁 Server Paths

```bash
# Web root (example - adjust for your server)
/var/www/bahar.co.il/public_html/mytrips-viewer/

# Or
/home/user/public_html/mytrips-viewer/
```

---

## ⚙️ Server Configuration

### Apache (.htaccess)
Already included in the package! Just extract and it works.

### Nginx
Add to server block:
```nginx
location /mytrips-viewer/ {
    alias /var/www/bahar.co.il/mytrips-viewer/;
    try_files $uri $uri/ /mytrips-viewer/index.html;
}
```

---

## 🔄 Update Deployment

```bash
# 1. Make changes
# 2. Build
make build

# 3. Deploy
scp mytrips-viewer-*.tar.gz user@www.bahar.co.il:/tmp/
ssh user@www.bahar.co.il "cd /path/to/mytrips-viewer && tar -xzf /tmp/mytrips-viewer-*.tar.gz"

# 4. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)
```

---

## 🐛 Troubleshooting

### Package not created?
```bash
# Check if build succeeded
ls -la build/

# Try clean build
make clean
make build
```

### Upload failed?
```bash
# Test SSH connection
ssh user@www.bahar.co.il

# Check permissions
ls -la /tmp/
```

### Extraction failed?
```bash
# Check if package is valid
tar -tzf mytrips-viewer-*.tar.gz

# Check disk space on server
ssh user@www.bahar.co.il "df -h"
```

### Site not loading?
- Check .htaccess is present
- Check file permissions (755 for dirs, 644 for files)
- Check server error logs
- Check browser console

---

## 📚 Full Documentation

- **[DEPLOYMENT_BAHAR.md](./DEPLOYMENT_BAHAR.md)** - Complete deployment guide for www.bahar.co.il
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - General deployment documentation
- **[README.md](./README.md)** - Main documentation

---

## 💡 Tips

- Package names include timestamp for easy tracking
- Old packages are cleaned with `make clean`
- Always test locally before deploying
- Keep a backup of the previous deployment
- Use hard refresh (Cmd+Shift+R) after deployment

---

**Last Updated:** 2025-10-27

