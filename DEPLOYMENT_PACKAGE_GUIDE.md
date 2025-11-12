# Deployment Package Guide

## Which File to Use?

### ✅ **Use the SMALLER file (1.0MB)**
```
mytrips-viewer-20251112-164726.tar.gz (1.0MB)
```

### ❌ **Do NOT use the larger file (1.6MB)**
```
mytrips-viewer-20251112-164645.tar.gz (1.6MB)
```

---

## Why the Size Difference?

### Smaller File (1.0MB) - ✅ CORRECT
- **Excludes source maps** (`.map` files)
- **Excludes macOS metadata** (`._*` files, `.DS_Store`)
- **Optimized for production**
- **Faster upload and extraction**

### Larger File (1.6MB) - ❌ NOT RECOMMENDED
- **Includes source maps** (2 `.map` files)
- **Larger file size**
- **Slower to upload**
- **Not needed for production**

---

## What Are Source Maps?

Source maps (`.map` files) are debugging files that:
- Map minified code back to original source code
- Used for debugging in browser DevTools
- **Not needed in production**
- Add unnecessary size to deployment

---

## What Are macOS Metadata Files?

Files like `._*` and `.DS_Store`:
- Created by macOS Finder
- Store folder metadata
- **Not needed for deployment**
- Can cause issues on Linux servers

The `deploy.sh` script correctly excludes these with:
```bash
tar -czf "$PACKAGE_NAME" \
    --exclude='._*' \
    --exclude='.DS_Store' \
    --exclude='*.map' \
    -C "$BUILD_DIR" .
```

---

## Deployment Instructions

### 1. Upload the Smaller File

```bash
scp mytrips-viewer-20251112-164726.tar.gz user@www.bahar.co.il:/tmp/
```

### 2. Extract on Server

```bash
ssh user@www.bahar.co.il
cd /path/to/www.bahar.co.il/public_html/mytrips-viewer
tar -xzf /tmp/mytrips-viewer-20251112-164726.tar.gz
```

### 3. Verify Extraction

```bash
ls -la
# Should see: index.html, static/, vendor/, .htaccess, etc.
```

### 4. Set Permissions

```bash
chmod -R 755 .
```

---

## File Contents

Both files contain the same production-ready files:

```
./
├── index.html              # Main HTML file
├── asset-manifest.json     # Asset manifest
├── .htaccess              # Apache configuration
├── static/                # CSS, JS bundles
│   ├── css/
│   ├── js/
│   └── media/
└── vendor/                # Third-party assets
    ├── fonts/
    ├── images/
    └── scripts/
```

---

## Why Multiple Files?

The `deploy.sh` script creates a new tar.gz file each time you run it with a timestamp:

```
mytrips-viewer-YYYYMMDD-HHMMSS.tar.gz
```

This allows you to:
- Keep multiple deployment versions
- Rollback if needed
- Track deployment history

**Recommendation:** Delete old files after successful deployment to save space.

---

## Cleanup Old Files

```bash
# Keep only the latest 2 files
ls -t mytrips-viewer-*.tar.gz | tail -n +3 | xargs rm -f
```

---

## Verification Checklist

After extraction, verify:

- [ ] `index.html` exists
- [ ] `static/` directory exists with CSS and JS
- [ ] `vendor/` directory exists with fonts and images
- [ ] `.htaccess` file exists (for Apache routing)
- [ ] No `._*` files present
- [ ] No `.DS_Store` files present
- [ ] No `.map` files present

---

## Size Comparison

| File | Size | Source Maps | macOS Files | Status |
|------|------|-------------|-------------|--------|
| 1.0MB | ✅ Smaller | ❌ Excluded | ❌ Excluded | ✅ USE THIS |
| 1.6MB | ❌ Larger | ✅ Included | ❌ Excluded | ❌ Don't use |

---

## Questions?

- **Why are source maps included in the larger file?**
  - The build process generates them; the script should exclude them
  - The smaller file correctly excludes them

- **Will the application work without source maps?**
  - Yes! Source maps are only for debugging
  - Production doesn't need them

- **Can I use the larger file?**
  - Technically yes, but it's wasteful
  - Use the smaller file for faster deployment

---

## Next Steps

1. ✅ Use the **1.0MB file** for deployment
2. ✅ Upload to server
3. ✅ Extract and verify
4. ✅ Test the application
5. ✅ Delete old tar.gz files to save space

