# Quick Start Guide

Get the Route Tracker application running in under 5 minutes!

## 🚀 Super Quick Start

```bash
# 1. Install dependencies
make install

# 2. Copy environment files (first time only)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Start the application
make dev
```

**That's it!** 🎉

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Login: `testuser` / `password123`

---

## 📝 Detailed Steps

### Step 1: Install Dependencies

```bash
make install
```

This will:
- Create Python virtual environment in `backend/venv/`
- Install Python dependencies from `backend/requirements.txt`
- Install Node.js dependencies from `package.json`

**Time**: ~2-3 minutes

---

### Step 2: Configure Environment (First Time Only)

```bash
# Copy environment templates
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**For development**, the default values work out of the box! ✅

**Optional**: Add your own Google Maps API key for production use:
1. Get a key at: https://console.cloud.google.com/apis/credentials
2. Edit `backend/.env` and `frontend/.env`
3. Replace `YOUR_GOOGLE_MAPS_API_KEY_HERE` with your key

---

### Step 3: Start the Application

```bash
make dev
```

This starts both:
- **Backend** on http://localhost:8000 (FastAPI)
- **Frontend** on http://localhost:3000 (React)

**Time**: ~10-20 seconds

---

## 🎯 Using the Application

### 1. Open Your Browser

Navigate to: **http://localhost:3000**

### 2. Login

Use the default mock credentials:
- **Username**: `testuser`
- **Password**: `password123`

### 3. Explore

You'll see:
- Interactive map with Google Maps
- Mock route data
- User dashboard
- Real-time location tracking interface

---

## 🛑 Stopping the Application

Press `Ctrl+C` in the terminal where `make dev` is running.

Or in a new terminal:
```bash
make stop
```

---

## 🔧 Common Commands

```bash
# Show all available commands
make help

# Start both services
make dev

# Start backend only
make dev-backend

# Start frontend only
make dev-frontend

# Build for production
make build

# Clean build artifacts
make clean

# Stop all services
make stop
```

---

## 🐛 Troubleshooting

### "Port already in use"

```bash
make stop
# Then try again
make dev
```

### "Command not found: make"

**macOS**: Install Xcode Command Line Tools
```bash
xcode-select --install
```

**Linux**: Install build-essential
```bash
sudo apt-get install build-essential
```

**Windows**: Use WSL or run commands manually (see README.md)

### Backend won't start

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend won't start

```bash
rm -rf node_modules
npm install
```

### Still having issues?

Check the full [README.md](README.md) for detailed troubleshooting.

---

## 📚 Next Steps

- **Read the full README**: [README.md](README.md)
- **Security guidelines**: [SECURITY.md](SECURITY.md)
- **API documentation**: http://localhost:8000/docs (when running)
- **Customize the app**: Edit files in `frontend/src/` and `backend/`

---

## 🎓 What's Running?

### Backend (Port 8000)
- FastAPI server with auto-reload
- Mock authentication (no database needed)
- RESTful API endpoints
- JWT token authentication
- CORS enabled for localhost:3000

### Frontend (Port 3000)
- React development server
- Hot module replacement (auto-refresh on changes)
- Tailwind CSS for styling
- Google Maps integration
- Axios for API calls

---

## 💡 Tips

1. **Development Mode**: Both servers auto-reload when you make changes
2. **Mock Data**: The app uses mock data by default (no database needed)
3. **API Docs**: Visit http://localhost:8000/docs for interactive API documentation
4. **Logs**: Watch the terminal for backend logs and browser console for frontend logs
5. **Environment**: All configuration is in `.env` files (never commit these!)

---

## 🚀 Ready for Production?

See [README.md](README.md) for production deployment instructions, including:
- Generating secure JWT secrets
- Configuring real MongoDB database
- Setting up CORS for your domain
- Building optimized frontend
- Security best practices

---

**Happy coding!** 🎉

