# Deployment Checklist

## ✅ Pre-Deployment

- [x] LocationApiClient.js copied to `frontend/src/services/`
- [ ] Verify file exists: `ls -lh frontend/src/services/LocationApiClient.js`
- [ ] No compilation errors: `npm run build`
- [ ] All tests pass (if applicable)
- [ ] Code review completed
- [ ] Documentation updated

---

## 🔨 Build Phase

### Step 1: Clean Build
```bash
rm -rf build/
npm run build
```

**Verify:**
```bash
ls -lh build/
# Should show: index.html, static/, vendor/
```

### Step 2: Check Build Size
```bash
du -sh build/
# Should be around 4-5 MB
```

### Step 3: Verify LocationApiClient is Bundled
```bash
grep -r "LocationApiClient" build/ || echo "Not found in build"
# Should find references in JavaScript files
```

**Checklist:**
- [ ] Build directory created
- [ ] index.html exists
- [ ] static/ directory exists
- [ ] vendor/ directory exists
- [ ] Build size reasonable (4-5 MB)

---

## 📦 Package Phase

### Step 1: Create Deployment Package
```bash
./create-deployment-zip.sh
```

**Output:**
```
mytrips-viewer-YYYYMMDD-HHMMSS.zip
```

### Step 2: Verify Package
```bash
ls -lh mytrips-viewer-*.zip | tail -1
# Should show: 1.6 MB (compressed)
```

### Step 3: Check Package Contents
```bash
unzip -l mytrips-viewer-*.zip | head -30
# Should show: index.html, static/, vendor/, .htaccess
```

**Checklist:**
- [ ] ZIP file created
- [ ] File size ~1.6 MB
- [ ] Contains index.html
- [ ] Contains static/ directory
- [ ] Contains vendor/ directory
- [ ] Contains .htaccess

---

## 🚀 Deployment Phase

### Option 1: Deploy via cPanel

**Steps:**
1. [ ] Log in to www.bahar.co.il/cpanel
2. [ ] Open File Manager
3. [ ] Navigate to `public_html/mytrips-viewer/`
4. [ ] Upload `mytrips-viewer-*.zip`
5. [ ] Right-click ZIP → Extract
6. [ ] Verify extraction completed
7. [ ] Delete ZIP file
8. [ ] Verify files in directory

**Verify:**
```
Check in cPanel that:
- index.html exists
- static/ directory exists
- vendor/ directory exists
- .htaccess exists
```

### Option 2: Deploy via SSH

**Steps:**
```bash
# 1. Copy ZIP to server
scp mytrips-viewer-*.zip user@www.bahar.co.il:/tmp/

# 2. SSH into server
ssh user@www.bahar.co.il

# 3. Navigate to deployment directory
cd ~/public_html/mytrips-viewer

# 4. Extract ZIP (overwrite existing files)
unzip -o /tmp/mytrips-viewer-*.zip

# 5. Verify extraction
ls -lh

# 6. Cleanup
rm /tmp/mytrips-viewer-*.zip

# 7. Verify permissions
chmod -R 755 .
```

**Checklist:**
- [ ] ZIP copied to server
- [ ] Extracted successfully
- [ ] Files verified
- [ ] Permissions set correctly
- [ ] ZIP file deleted

---

## ✅ Post-Deployment Verification

### Step 1: Check Website Loads
```
1. Open https://www.bahar.co.il/mytrips-viewer/
2. Wait for page to load
3. Check for errors in console (F12)
```

**Verify:**
- [ ] Page loads without errors
- [ ] No 404 errors
- [ ] No CORS errors
- [ ] No JavaScript errors

### Step 2: Check Console Logs
```
1. Open DevTools (F12)
2. Go to Console tab
3. Start tracking
4. Watch for logs
```

**Verify:**
- [ ] 🔑 [SESSION] logs appear
- [ ] 📡 [SSE] logs appear
- [ ] ✅ Success messages appear
- [ ] No ❌ errors

### Step 3: Test Functionality
```
1. Login to app
2. Start live tracking
3. Watch location updates
4. Stop tracking
5. Verify disconnect
```

**Verify:**
- [ ] Login works
- [ ] Tracking starts
- [ ] Location updates received
- [ ] Heartbeats every 30s
- [ ] Disconnect works

### Step 4: Check Network Tab
```
1. Open DevTools (F12)
2. Go to Network tab
3. Start tracking
4. Look for stream-sse.php request
```

**Verify:**
- [ ] stream-sse.php request appears
- [ ] Status is 200 OK
- [ ] Protocol is h2 or http/1.1 (NOT h3)
- [ ] Content-Type is text/event-stream

---

## 🔍 Debugging Checklist

If issues occur:

- [ ] Check browser console for errors
- [ ] Check network tab for failed requests
- [ ] Check server logs for errors
- [ ] Verify API token is correct
- [ ] Verify user_id exists
- [ ] Check if devices are active
- [ ] Verify network connectivity
- [ ] Try from different browser
- [ ] Try from different network

---

## 📋 Rollback Plan

If deployment fails:

### Option 1: Restore Previous Version
```bash
# If you have backup
cp -r backup/mytrips-viewer/* ~/public_html/mytrips-viewer/
```

### Option 2: Redeploy Previous ZIP
```bash
# If you saved previous ZIP
scp mytrips-viewer-PREVIOUS.zip user@www.bahar.co.il:/tmp/
ssh user@www.bahar.co.il
cd ~/public_html/mytrips-viewer
unzip -o /tmp/mytrips-viewer-PREVIOUS.zip
```

### Option 3: Manual Restore
```bash
# Delete current files and restore manually
rm -rf ~/public_html/mytrips-viewer/*
# Upload previous version files
```

---

## 📊 Deployment Summary

| Phase | Status | Time |
|-------|--------|------|
| Build | ⏳ Pending | ~30s |
| Package | ⏳ Pending | ~10s |
| Deploy | ⏳ Pending | ~2min |
| Verify | ⏳ Pending | ~5min |
| **Total** | **⏳ Pending** | **~3min** |

---

## 🎯 Success Criteria

✅ **Build Phase**
- No compilation errors
- Build directory created
- All files present

✅ **Package Phase**
- ZIP file created
- File size ~1.6 MB
- All files included

✅ **Deployment Phase**
- Files extracted to server
- Permissions set correctly
- No errors during extraction

✅ **Verification Phase**
- Website loads
- Console logs appear
- Tracking works
- No errors

---

## 📞 Support

If you encounter issues:

1. **Check console logs** (F12 → Console)
2. **Check network tab** (F12 → Network)
3. **Check server logs** (SSH to server)
4. **Share logs** with backend team
5. **Rollback** if necessary

---

## 🚀 Quick Deploy Commands

```bash
# Build
npm run build

# Package
./create-deployment-zip.sh

# Deploy (SSH)
scp mytrips-viewer-*.zip user@www.bahar.co.il:/tmp/
ssh user@www.bahar.co.il
cd ~/public_html/mytrips-viewer
unzip -o /tmp/mytrips-viewer-*.zip
rm /tmp/mytrips-viewer-*.zip

# Verify
# Open https://www.bahar.co.il/mytrips-viewer/
# Open DevTools (F12)
# Check console logs
```

---

**Version:** 2.1.2-http1-fix-debug
**Last Updated:** November 3, 2025
**Status:** Ready for Deployment ✅

