#!/bin/bash

# Deployment ZIP creation script for MyTrips Viewer
# This script builds the frontend and creates a deployment-ready ZIP file
# with only the necessary files for production deployment
#
# Note: This app uses existing backend APIs:
# - mytrips-api.bahar.co.il (MyTrips API)
# - www.bahar.co.il/location (Location API)

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BUILD_DIR="./build"
TEMP_DEPLOY_DIR="./deploy-temp"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
PACKAGE_NAME="mytrips-viewer-${TIMESTAMP}.zip"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  MyTrips Viewer - Deployment ZIP Creator              ║${NC}"
echo -e "${BLUE}║  Target: www.bahar.co.il/mytrips-viewer/               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Clean previous build
echo -e "${YELLOW}[1/5] Cleaning previous build...${NC}"
if [ -d "$BUILD_DIR" ]; then
    rm -rf "$BUILD_DIR"
    echo -e "${GREEN}✓ Previous build cleaned${NC}"
else
    echo -e "${GREEN}✓ No previous build found${NC}"
fi

# Clean temp directory if exists
if [ -d "$TEMP_DEPLOY_DIR" ]; then
    rm -rf "$TEMP_DEPLOY_DIR"
fi

echo ""

# Step 2: Build the application
echo -e "${YELLOW}[2/5] Building frontend for production...${NC}"
echo -e "${CYAN}Running: npm run build${NC}"
bash -c "source ~/.zshrc 2>/dev/null || true; NODE_ENV=production npm run build"

if [ ! -d "$BUILD_DIR" ]; then
    echo -e "${RED}✗ Build failed - build directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build completed successfully${NC}"
echo ""

# Step 3: Copy .htaccess to build directory
echo -e "${YELLOW}[3/5] Adding .htaccess configuration...${NC}"
if [ -f ".htaccess" ]; then
    cp .htaccess "$BUILD_DIR/.htaccess"
    echo -e "${GREEN}✓ .htaccess copied to build directory${NC}"
else
    echo -e "${YELLOW}⚠ .htaccess not found - skipping${NC}"
fi
echo ""

# Step 4: Verify build
echo -e "${YELLOW}[4/5] Verifying build...${NC}"

# Check for index.html
if [ ! -f "$BUILD_DIR/index.html" ]; then
    echo -e "${RED}✗ Build verification failed - index.html not found${NC}"
    exit 1
fi

# Check for static assets
if [ ! -d "$BUILD_DIR/static" ]; then
    echo -e "${RED}✗ Build verification failed - static directory not found${NC}"
    exit 1
fi

# Check base path in index.html
if grep -q "/mytrips-viewer/" "$BUILD_DIR/index.html"; then
    echo -e "${GREEN}✓ Base path configured correctly (/mytrips-viewer/)${NC}"
else
    echo -e "${YELLOW}⚠ Base path may not be configured correctly${NC}"
fi

# Display build size
BUILD_SIZE=$(du -sh "$BUILD_DIR" | cut -f1)
echo -e "${GREEN}✓ Build verified - Size: $BUILD_SIZE${NC}"
echo ""

# Step 5: Create deployment ZIP
echo -e "${YELLOW}[5/5] Creating deployment ZIP package...${NC}"

# Create temporary deployment directory
mkdir -p "$TEMP_DEPLOY_DIR"

# Copy only deployment-relevant files
echo -e "${CYAN}Copying deployment files...${NC}"

# Copy all files from build directory
cp -r "$BUILD_DIR"/* "$TEMP_DEPLOY_DIR/"

# Copy .htaccess if it exists in build
if [ -f "$BUILD_DIR/.htaccess" ]; then
    cp "$BUILD_DIR/.htaccess" "$TEMP_DEPLOY_DIR/.htaccess"
fi

# List what's being included
echo -e "${CYAN}Package will include:${NC}"
echo "  - index.html"
echo "  - .htaccess (Apache configuration)"
echo "  - asset-manifest.json"
echo "  - static/ (JS, CSS, and other assets)"
if [ -d "$BUILD_DIR/vendor" ]; then
    echo "  - vendor/ (fonts, images, scripts)"
fi
echo ""

# Create ZIP file (excluding macOS metadata files)
cd "$TEMP_DEPLOY_DIR"
zip -r "../$PACKAGE_NAME" . -x "*.DS_Store" -x "__MACOSX/*" -x "._*" > /dev/null 2>&1
cd ..

# Clean up temp directory
rm -rf "$TEMP_DEPLOY_DIR"

echo -e "${GREEN}✓ Deployment package created successfully!${NC}"
echo ""

# Display package information
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Deployment Package Information                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Package Name:${NC}     $PACKAGE_NAME"
PACKAGE_SIZE=$(du -h "$PACKAGE_NAME" | cut -f1)
echo -e "${CYAN}Package Size:${NC}     $PACKAGE_SIZE"
echo -e "${CYAN}Build Size:${NC}       $BUILD_SIZE"
echo -e "${CYAN}Created:${NC}          $(date)"
echo ""

# Show package contents summary
echo -e "${CYAN}Package Contents:${NC}"
unzip -l "$PACKAGE_NAME" | head -20
TOTAL_FILES=$(unzip -l "$PACKAGE_NAME" | tail -1 | awk '{print $2}')
if [ "$TOTAL_FILES" -gt 20 ]; then
    echo "... and $((TOTAL_FILES - 20)) more files"
fi
echo ""

# Calculate SHA-256 checksum
if command -v shasum &> /dev/null; then
    echo -e "${CYAN}SHA-256 Checksum:${NC}"
    shasum -a 256 "$PACKAGE_NAME"
    echo ""
fi

# Deployment instructions
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Deployment Instructions                               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Option 1: cPanel File Manager (Recommended)${NC}"
echo "  1. Log in to cPanel at www.bahar.co.il/cpanel"
echo "  2. Open File Manager"
echo "  3. Navigate to public_html/mytrips-viewer/"
echo "  4. Backup existing files (optional)"
echo "  5. Upload $PACKAGE_NAME"
echo "  6. Right-click the ZIP file and select 'Extract'"
echo "  7. Delete the ZIP file after extraction"
echo ""
echo -e "${YELLOW}Option 2: SCP + SSH${NC}"
echo "  # Upload the package"
echo "  scp $PACKAGE_NAME user@www.bahar.co.il:/tmp/"
echo ""
echo "  # SSH to server and deploy"
echo "  ssh user@www.bahar.co.il"
echo "  cd ~/public_html/mytrips-viewer"
echo "  unzip -o /tmp/$PACKAGE_NAME"
echo "  rm /tmp/$PACKAGE_NAME"
echo ""
echo -e "${YELLOW}Option 3: FTP${NC}"
echo "  1. Connect via FTP client (FileZilla, etc.)"
echo "  2. Navigate to public_html/mytrips-viewer/"
echo "  3. Upload and extract $PACKAGE_NAME"
echo ""
echo -e "${CYAN}Target URL:${NC}       https://www.bahar.co.il/mytrips-viewer/"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}📝 BACKEND CONFIGURATION:${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "  This app uses existing backend APIs:"
echo "  • MyTrips API:    mytrips-api.bahar.co.il"
echo "  • Location API:   www.bahar.co.il/location"
echo ""
echo "  No backend deployment needed - frontend is standalone!"
echo ""
echo -e "${GREEN}✅ Deployment package ready!${NC}"
echo ""

