#!/bin/bash

# Deployment script for www.bahar.co.il/mytrips-viewer/
# This script builds and optionally deploys the application

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BUILD_DIR="./build"
DEPLOY_TARGET="mytrips-viewer"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  MyTrips Viewer - Deployment Script                   ║${NC}"
echo -e "${BLUE}║  Target: www.bahar.co.il/mytrips-viewer/               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Clean previous build
echo -e "${YELLOW}[1/4] Cleaning previous build...${NC}"
if [ -d "$BUILD_DIR" ]; then
    rm -rf "$BUILD_DIR"
    echo -e "${GREEN}✓ Previous build cleaned${NC}"
else
    echo -e "${GREEN}✓ No previous build found${NC}"
fi
echo ""

# Step 2: Build the application
echo -e "${YELLOW}[2/4] Building application...${NC}"
make build

if [ ! -d "$BUILD_DIR" ]; then
    echo -e "${RED}✗ Build failed - build directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build completed successfully${NC}"
echo ""

# Step 3: Verify build
echo -e "${YELLOW}[3/4] Verifying build...${NC}"

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
    echo -e "${RED}✗ Base path not configured correctly${NC}"
    exit 1
fi

# Display build size
BUILD_SIZE=$(du -sh "$BUILD_DIR" | cut -f1)
echo -e "${GREEN}✓ Build verified - Size: $BUILD_SIZE${NC}"
echo ""

# Step 4: Deployment options
echo -e "${YELLOW}[4/4] Deployment options:${NC}"
echo ""
echo "The build is ready in: $BUILD_DIR"
echo ""
echo "Choose deployment method:"
echo "  1) Create deployment package (tar.gz)"
echo "  2) Deploy via rsync (requires server details)"
echo "  3) Deploy via SCP (requires server details)"
echo "  4) Show manual deployment instructions"
echo "  5) Skip deployment (build only)"
echo ""

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo ""
        echo -e "${YELLOW}Creating deployment package...${NC}"
        PACKAGE_NAME="mytrips-viewer-$(date +%Y%m%d-%H%M%S).tar.gz"
        # Exclude macOS metadata files and source maps for cleaner deployment
        tar -czf "$PACKAGE_NAME" \
            --exclude='._*' \
            --exclude='.DS_Store' \
            --exclude='*.map' \
            -C "$BUILD_DIR" .
        echo -e "${GREEN}✓ Package created: $PACKAGE_NAME${NC}"
        echo ""
        echo "Upload this package to your server and extract it:"
        echo "  scp $PACKAGE_NAME user@www.bahar.co.il:/tmp/"
        echo "  ssh user@www.bahar.co.il"
        echo "  cd /path/to/www.bahar.co.il/public_html/mytrips-viewer"
        echo "  tar -xzf /tmp/$PACKAGE_NAME"
        ;;
    
    2)
        echo ""
        read -p "Enter server user@host (e.g., user@www.bahar.co.il): " SERVER
        read -p "Enter remote path (e.g., /var/www/bahar.co.il/mytrips-viewer): " REMOTE_PATH
        echo ""
        echo -e "${YELLOW}Deploying via rsync...${NC}"
        rsync -avz --delete "$BUILD_DIR/" "$SERVER:$REMOTE_PATH/"
        echo -e "${GREEN}✓ Deployment complete!${NC}"
        ;;
    
    3)
        echo ""
        read -p "Enter server user@host (e.g., user@www.bahar.co.il): " SERVER
        read -p "Enter remote path (e.g., /var/www/bahar.co.il/mytrips-viewer): " REMOTE_PATH
        echo ""
        echo -e "${YELLOW}Deploying via SCP...${NC}"
        scp -r "$BUILD_DIR"/* "$SERVER:$REMOTE_PATH/"
        echo -e "${GREEN}✓ Deployment complete!${NC}"
        ;;
    
    4)
        echo ""
        echo -e "${BLUE}Manual Deployment Instructions:${NC}"
        echo ""
        echo "1. Connect to your server:"
        echo "   ssh user@www.bahar.co.il"
        echo ""
        echo "2. Navigate to the web root:"
        echo "   cd /path/to/www.bahar.co.il/public_html"
        echo ""
        echo "3. Create/navigate to the mytrips-viewer directory:"
        echo "   mkdir -p mytrips-viewer"
        echo "   cd mytrips-viewer"
        echo ""
        echo "4. Upload files from: $BUILD_DIR"
        echo ""
        echo "5. Set permissions:"
        echo "   chmod -R 755 ."
        echo ""
        echo "See DEPLOYMENT_BAHAR.md for detailed instructions."
        ;;
    
    5)
        echo ""
        echo -e "${GREEN}Build complete - skipping deployment${NC}"
        ;;
    
    *)
        echo ""
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Deployment Summary                                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Build location:  ${GREEN}$BUILD_DIR${NC}"
echo -e "Build size:      ${GREEN}$BUILD_SIZE${NC}"
echo -e "Target URL:      ${GREEN}https://www.bahar.co.il/mytrips-viewer/${NC}"
echo -e "Backend API:     ${GREEN}https://www.bahar.co.il/mytrips-api${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Ensure backend is deployed at https://www.bahar.co.il/mytrips-api"
echo "  2. Configure server (Apache .htaccess or Nginx config)"
echo "  3. Test the application at https://www.bahar.co.il/mytrips-viewer/"
echo "  4. Check browser console for any errors"
echo ""
echo -e "${GREEN}For detailed deployment instructions, see: DEPLOYMENT_BAHAR.md${NC}"
echo ""

