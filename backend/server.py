from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# SECURITY: Debug mode configuration
# When DEBUG_MODE is false, sensitive data (emails, tokens, API responses) will not be logged
DEBUG_MODE = os.environ.get('DEBUG_MODE', 'false').lower() == 'true'
if DEBUG_MODE:
    logging.warning("⚠️  DEBUG MODE IS ENABLED - Sensitive data will be logged. DO NOT USE IN PRODUCTION!")

# Mock authentication configuration
MOCK_AUTH_ENABLED = os.environ.get('MOCK_AUTH_ENABLED', 'false').lower() == 'true'
if MOCK_AUTH_ENABLED:
    logging.warning("⚠️  MOCK AUTHENTICATION IS ENABLED - DO NOT USE IN PRODUCTION!")
    MOCK_USERNAME = os.environ.get('MOCK_USERNAME', 'testuser')
    MOCK_PASSWORD = os.environ.get('MOCK_PASSWORD', 'password123')
    MOCK_USER_EMAIL = os.environ.get('MOCK_USER_EMAIL', 'testuser@example.com')
    MOCK_USER_ID = os.environ.get('MOCK_USER_ID', 'mock-user-123')

# MongoDB connection (only if not using mock auth)
if not MOCK_AUTH_ENABLED:
    mongo_url = os.environ.get('MONGO_URL')
    if not mongo_url:
        raise ValueError("MONGO_URL environment variable is required when MOCK_AUTH_ENABLED is false")
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'route_tracker_db')]
else:
    client = None
    db = None

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET')
if not SECRET_KEY or SECRET_KEY == 'CHANGE_THIS_TO_A_SECURE_RANDOM_SECRET_IN_PRODUCTION':
    if MOCK_AUTH_ENABLED:
        logging.warning("⚠️  Using default JWT secret - DO NOT USE IN PRODUCTION!")
        SECRET_KEY = 'dev-secret-key-not-for-production'
    else:
        raise ValueError("JWT_SECRET environment variable must be set to a secure random value in production")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: EmailStr
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class AppLoginRequest(BaseModel):
    email: EmailStr
    password: str

class AppLoginResponse(BaseModel):
    authenticated: bool
    user_id: Optional[str] = None
    message: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class RouteData(BaseModel):
    id: str
    name: str
    description: str
    coordinates: List[dict]  # [{lat, lng}]
    distance: float
    estimated_time: int

class TrackableUser(BaseModel):
    id: str
    name: str
    status: str

class LocationData(BaseModel):
    user_id: str
    lat: float
    lng: float
    timestamp: datetime
    speed: Optional[float] = None
    heading: Optional[float] = None

class RouteHistory(BaseModel):
    user_id: str
    coordinates: List[dict]
    timestamps: List[str]

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        # Mock mode: return mock user
        if MOCK_AUTH_ENABLED:
            if user_id == MOCK_USER_ID:
                return User(
                    id=MOCK_USER_ID,
                    username=MOCK_USERNAME,
                    email=MOCK_USER_EMAIL,
                    created_at=datetime.now(timezone.utc)
                )
            else:
                raise HTTPException(status_code=401, detail="User not found")

        # Database mode
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")

        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])

        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Auth routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Mock mode doesn't support registration
    if MOCK_AUTH_ENABLED:
        raise HTTPException(status_code=501, detail="Registration not available in mock mode")

    # Check if user exists
    existing = await db.users.find_one({"$or": [{"username": user_data.username}, {"email": user_data.email}]})
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists")

    user = User(
        username=user_data.username,
        email=user_data.email
    )

    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['password'] = hash_password(user_data.password)

    await db.users.insert_one(doc)

    access_token = create_access_token({"sub": user.id})
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    # Use mock authentication if enabled
    if MOCK_AUTH_ENABLED:
        if credentials.username == MOCK_USERNAME and credentials.password == MOCK_PASSWORD:
            user_obj = User(
                id=MOCK_USER_ID,
                username=MOCK_USERNAME,
                email=MOCK_USER_EMAIL,
                created_at=datetime.now(timezone.utc)
            )
            access_token = create_access_token({"sub": user_obj.id})
            return Token(access_token=access_token, token_type="bearer", user=user_obj)
        else:
            raise HTTPException(status_code=401, detail="Invalid credentials")

    # MongoDB authentication
    user = await db.users.find_one({"username": credentials.username})
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if isinstance(user.get('created_at'), str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])

    user_obj = User(**{k: v for k, v in user.items() if k != 'password'})
    access_token = create_access_token({"sub": user_obj.id})

    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.post("/auth/app-login", response_model=AppLoginResponse)
async def app_login(credentials: AppLoginRequest):
    """
    Stateless authentication endpoint for mobile/web apps.
    Authenticates against MyTrips API.
    Returns authentication status and user_id without creating a session.

    Security: Uses LOC_API_TOKEN and MYTRIPS_API_BASEURL.
    """
    LOC_API_TOKEN = os.environ.get('LOC_API_TOKEN')
    MYTRIPS_API_BASEURL = os.environ.get('MYTRIPS_API_BASEURL')

    if not LOC_API_TOKEN:
        logging.error("LOC_API_TOKEN not configured")
        return AppLoginResponse(
            authenticated=False,
            message="Authentication service unavailable"
        )

    if not MYTRIPS_API_BASEURL:
        logging.error("MYTRIPS_API_BASEURL not configured")
        return AppLoginResponse(
            authenticated=False,
            message="Authentication service unavailable"
        )

    # Use mock authentication if enabled
    if MOCK_AUTH_ENABLED:
        # In mock mode, accept the mock user credentials
        if credentials.email == MOCK_USER_EMAIL and credentials.password == MOCK_PASSWORD:
            return AppLoginResponse(
                authenticated=True,
                user_id=MOCK_USER_ID,
                message="Authentication successful"
            )
        else:
            # Generic error message for security
            return AppLoginResponse(
                authenticated=False,
                message="Invalid credentials"
            )

    # Production mode: authenticate against MyTrips API
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Call MyTrips API app-login endpoint
            login_url = f"{MYTRIPS_API_BASEURL}/auth/app-login"

            # SECURITY: Only log sensitive data in debug mode
            if DEBUG_MODE:
                logging.debug(f"Attempting login to MyTrips API: {login_url}")
                logging.debug(f"Email: {credentials.email}")
            else:
                # Log request ID or non-sensitive identifier instead
                logging.info(f"Attempting login to MyTrips API")

            response = await client.post(
                login_url,
                json={
                    "email": credentials.email,
                    "password": credentials.password
                },
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            )

            # SECURITY: Only log response body in debug mode (may contain tokens)
            if DEBUG_MODE:
                logging.debug(f"MyTrips API response status: {response.status_code}")
                logging.debug(f"MyTrips API response body: {response.text[:500]}")
            else:
                logging.info(f"MyTrips API response status: {response.status_code}")

            # Check response status
            if response.status_code == 200:
                data = response.json()

                # MyTrips API returns: {"authenticated": true, "user_id": "...", "message": "..."}
                authenticated = data.get('authenticated', False)
                user_id = data.get('user_id')
                message = data.get('message', 'Authentication successful')

                if authenticated and user_id:
                    logging.info(f"Login successful for user: {user_id}")
                    return AppLoginResponse(
                        authenticated=True,
                        user_id=str(user_id),
                        message=message
                    )
                else:
                    logging.warning(f"MyTrips API returned authenticated=false: {data}")
                    return AppLoginResponse(
                        authenticated=False,
                        message=message or "Invalid email or password"
                    )

            elif response.status_code == 401 or response.status_code == 403:
                # Invalid credentials
                return AppLoginResponse(
                    authenticated=False,
                    message="Invalid credentials"
                )

            else:
                # Other error
                logging.error(f"MyTrips API error: {response.status_code} - {response.text}")
                return AppLoginResponse(
                    authenticated=False,
                    message="Authentication service error"
                )

    except httpx.TimeoutException:
        logging.error("MyTrips API timeout")
        return AppLoginResponse(
            authenticated=False,
            message="Authentication service timeout"
        )

    except Exception as e:
        logging.error(f"App login error: {str(e)}")
        return AppLoginResponse(
            authenticated=False,
            message="Authentication failed"
        )

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# Mock data endpoints
@api_router.get("/routes", response_model=List[RouteData])
async def get_routes():
    """Mock endpoint - returns sample routes (public in mock mode)"""
    mock_routes = [
        RouteData(
            id="route-1",
            name="Downtown Loop",
            description="City center patrol route",
            coordinates=[
                {"lat": 40.7589, "lng": -73.9851},
                {"lat": 40.7614, "lng": -73.9776},
                {"lat": 40.7580, "lng": -73.9855},
                {"lat": 40.7505, "lng": -73.9934},
                {"lat": 40.7489, "lng": -73.9680},
                {"lat": 40.7589, "lng": -73.9851}
            ],
            distance=5.2,
            estimated_time=45
        ),
        RouteData(
            id="route-2",
            name="Westside Highway",
            description="Coastal route along the waterfront",
            coordinates=[
                {"lat": 40.7489, "lng": -74.0060},
                {"lat": 40.7589, "lng": -74.0080},
                {"lat": 40.7689, "lng": -74.0020},
                {"lat": 40.7789, "lng": -73.9940},
                {"lat": 40.7889, "lng": -73.9820}
            ],
            distance=8.5,
            estimated_time=60
        ),
        RouteData(
            id="route-3",
            name="East Side Express",
            description="Fast route through eastern districts",
            coordinates=[
                {"lat": 40.7580, "lng": -73.9680},
                {"lat": 40.7680, "lng": -73.9600},
                {"lat": 40.7780, "lng": -73.9520},
                {"lat": 40.7880, "lng": -73.9440},
                {"lat": 40.7980, "lng": -73.9360}
            ],
            distance=12.3,
            estimated_time=90
        )
    ]
    return mock_routes

@api_router.get("/users", response_model=List[TrackableUser])
async def get_trackable_users():
    """
    Get users with location data from Location API.
    Falls back to mock data if API is unavailable.
    """
    LOC_API_BASEURL = os.environ.get('LOC_API_BASEURL')
    LOC_API_TOKEN = os.environ.get('LOC_API_TOKEN')

    # If mock mode or API not configured, return mock data
    if MOCK_AUTH_ENABLED or not LOC_API_BASEURL or not LOC_API_TOKEN:
        logging.info("Using mock users data")
        mock_users = [
            TrackableUser(id="user-1", name="Driver A - John Smith", status="active"),
            TrackableUser(id="user-2", name="Driver B - Sarah Johnson", status="active"),
            TrackableUser(id="user-3", name="Driver C - Mike Davis", status="on_break"),
            TrackableUser(id="user-4", name="Driver D - Emily Chen", status="active"),
            TrackableUser(id="user-5", name="Driver E - Robert Wilson", status="inactive")
        ]
        return mock_users

    # Fetch from Location API
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            api_url = f"{LOC_API_BASEURL}/users.php"

            logging.info(f"Fetching users from Location API: {api_url}")

            response = await client.get(
                api_url,
                params={
                    "with_location_data": "true",
                    "include_counts": "true",
                    "include_metadata": "true"
                },
                headers={
                    "Authorization": f"Bearer {LOC_API_TOKEN}",
                    "X-API-Token": LOC_API_TOKEN,
                    "Accept": "application/json"
                }
            )

            if response.status_code == 200:
                data = response.json()

                # Response format: {"status": "success", "data": {"users": [...], "count": N}}
                if data.get('status') == 'success' and data.get('data', {}).get('users'):
                    users = []
                    for user in data['data']['users']:
                        # Map API response to TrackableUser model
                        users.append(TrackableUser(
                            id=str(user.get('id')),
                            name=user.get('display_name') or user.get('username'),
                            status="active"  # Default status, can be enhanced later
                        ))

                    logging.info(f"Fetched {len(users)} users from Location API")
                    return users
                else:
                    logging.warning(f"Location API returned no users: {data}")
            else:
                logging.error(f"Location API error: {response.status_code} - {response.text}")

        # Fallback to mock data on error
        logging.warning("Falling back to mock users data")
        return [
            TrackableUser(id="user-1", name="Driver A - John Smith", status="active"),
            TrackableUser(id="user-2", name="Driver B - Sarah Johnson", status="active"),
        ]

    except Exception as e:
        logging.error(f"Error fetching users from Location API: {str(e)}")
        # Fallback to mock data
        return [
            TrackableUser(id="user-1", name="Driver A - John Smith", status="active"),
            TrackableUser(id="user-2", name="Driver B - Sarah Johnson", status="active"),
        ]

# Simulated location tracking
import random
location_state = {}

@api_router.get("/location/{user_id}", response_model=LocationData)
async def get_user_location(user_id: str):
    """
    Get latest location for a user from Location API.
    Falls back to mock data if API is unavailable.
    """
    LOC_API_BASEURL = os.environ.get('LOC_API_BASEURL')
    LOC_API_TOKEN = os.environ.get('LOC_API_TOKEN')

    # If mock mode or API not configured, return mock data
    if MOCK_AUTH_ENABLED or not LOC_API_BASEURL or not LOC_API_TOKEN:
        logging.info(f"Using mock location data for user {user_id}")
        # Initialize or update location state with some movement
        if user_id not in location_state:
            location_state[user_id] = {
                "lat": 40.7589 + random.uniform(-0.01, 0.01),
                "lng": -73.9851 + random.uniform(-0.01, 0.01),
                "heading": random.uniform(0, 360)
            }
        else:
            # Simulate movement
            location_state[user_id]["lat"] += random.uniform(-0.0005, 0.0005)
            location_state[user_id]["lng"] += random.uniform(-0.0005, 0.0005)
            location_state[user_id]["heading"] = (location_state[user_id]["heading"] + random.uniform(-10, 10)) % 360

        return LocationData(
            user_id=user_id,
            lat=location_state[user_id]["lat"],
            lng=location_state[user_id]["lng"],
            timestamp=datetime.now(timezone.utc),
            speed=random.uniform(20, 60),
            heading=location_state[user_id]["heading"]
        )

    # Fetch from Location API - get latest location (limit=1)
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            api_url = f"{LOC_API_BASEURL}/locations.php"

            logging.info(f"Fetching latest location for user {user_id} from Location API")

            response = await client.get(
                api_url,
                params={
                    "user": user_id,
                    "limit": "1",
                    "offset": "0"
                },
                headers={
                    "Authorization": f"Bearer {LOC_API_TOKEN}",
                    "X-API-Token": LOC_API_TOKEN,
                    "Accept": "application/json"
                }
            )

            if response.status_code == 200:
                data = response.json()

                # Response format: {"success": true, "data": [...]}
                if data.get('success') and data.get('data') and len(data['data']) > 0:
                    location = data['data'][0]

                    # Parse server_time to datetime
                    server_time_str = location.get('server_time')
                    try:
                        timestamp = datetime.strptime(server_time_str, '%Y-%m-%d %H:%M:%S')
                        timestamp = timestamp.replace(tzinfo=timezone.utc)
                    except:
                        timestamp = datetime.now(timezone.utc)

                    logging.info(f"Fetched location for user {user_id}: lat={location.get('latitude')}, lng={location.get('longitude')}")

                    return LocationData(
                        user_id=str(location.get('user_id')),
                        lat=location.get('latitude'),
                        lng=location.get('longitude'),
                        timestamp=timestamp,
                        speed=location.get('speed'),
                        heading=location.get('bearing')
                    )
                else:
                    logging.warning(f"No location data found for user {user_id}")
            else:
                logging.error(f"Location API error: {response.status_code} - {response.text}")

        # Fallback to mock data on error
        logging.warning(f"Falling back to mock location data for user {user_id}")
        if user_id not in location_state:
            location_state[user_id] = {
                "lat": 40.7589,
                "lng": -73.9851,
                "heading": 0
            }

        return LocationData(
            user_id=user_id,
            lat=location_state[user_id]["lat"],
            lng=location_state[user_id]["lng"],
            timestamp=datetime.now(timezone.utc),
            speed=0,
            heading=location_state[user_id]["heading"]
        )

    except Exception as e:
        logging.error(f"Error fetching location from API: {str(e)}")
        # Fallback to mock data
        if user_id not in location_state:
            location_state[user_id] = {
                "lat": 40.7589,
                "lng": -73.9851,
                "heading": 0
            }

        return LocationData(
            user_id=user_id,
            lat=location_state[user_id]["lat"],
            lng=location_state[user_id]["lng"],
            timestamp=datetime.now(timezone.utc),
            speed=0,
            heading=location_state[user_id]["heading"]
        )

@api_router.get("/history/{user_id}", response_model=RouteHistory)
async def get_route_history(
    user_id: str,
    limit: int = 100,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None
):
    """
    Get location history for a user from Location API.
    Falls back to mock data if API is unavailable.
    """
    LOC_API_BASEURL = os.environ.get('LOC_API_BASEURL')
    LOC_API_TOKEN = os.environ.get('LOC_API_TOKEN')

    # If mock mode or API not configured, return mock data
    if MOCK_AUTH_ENABLED or not LOC_API_BASEURL or not LOC_API_TOKEN:
        logging.info(f"Using mock history data for user {user_id}")
        # Generate a historical path
        base_lat = 40.7589
        base_lng = -73.9851

        history_coords = []
        timestamps = []

        for i in range(20):
            history_coords.append({
                "lat": base_lat + (i * 0.001) + random.uniform(-0.0002, 0.0002),
                "lng": base_lng + (i * 0.0008) + random.uniform(-0.0002, 0.0002)
            })
            time = datetime.now(timezone.utc) - timedelta(minutes=20-i)
            timestamps.append(time.isoformat())

        return RouteHistory(
            user_id=user_id,
            coordinates=history_coords,
            timestamps=timestamps
        )

    # Fetch from Location API
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            api_url = f"{LOC_API_BASEURL}/locations.php"

            params = {
                "user": user_id,
                "limit": str(limit),
                "offset": "0"
            }

            if date_from:
                params["date_from"] = date_from
            if date_to:
                params["date_to"] = date_to

            logging.info(f"Fetching location history for user {user_id} from Location API")

            response = await client.get(
                api_url,
                params=params,
                headers={
                    "Authorization": f"Bearer {LOC_API_TOKEN}",
                    "X-API-Token": LOC_API_TOKEN,
                    "Accept": "application/json"
                }
            )

            if response.status_code == 200:
                data = response.json()

                # Response format: {"success": true, "data": [...]}
                if data.get('success') and data.get('data'):
                    history_coords = []
                    timestamps = []

                    for location in data['data']:
                        history_coords.append({
                            "lat": location.get('latitude'),
                            "lng": location.get('longitude')
                        })

                        # Parse server_time to ISO format
                        server_time_str = location.get('server_time')
                        try:
                            timestamp = datetime.strptime(server_time_str, '%Y-%m-%d %H:%M:%S')
                            timestamp = timestamp.replace(tzinfo=timezone.utc)
                            timestamps.append(timestamp.isoformat())
                        except:
                            timestamps.append(datetime.now(timezone.utc).isoformat())

                    logging.info(f"Fetched {len(history_coords)} location points for user {user_id}")

                    return RouteHistory(
                        user_id=user_id,
                        coordinates=history_coords,
                        timestamps=timestamps
                    )
                else:
                    logging.warning(f"No location history found for user {user_id}")
            else:
                logging.error(f"Location API error: {response.status_code} - {response.text}")

        # Fallback to mock data on error
        logging.warning(f"Falling back to mock history data for user {user_id}")
        base_lat = 40.7589
        base_lng = -73.9851
        history_coords = []
        timestamps = []

        for i in range(20):
            history_coords.append({
                "lat": base_lat + (i * 0.001),
                "lng": base_lng + (i * 0.0008)
            })
            time = datetime.now(timezone.utc) - timedelta(minutes=20-i)
            timestamps.append(time.isoformat())

        return RouteHistory(
            user_id=user_id,
            coordinates=history_coords,
            timestamps=timestamps
        )

    except Exception as e:
        logging.error(f"Error fetching location history from API: {str(e)}")
        # Fallback to mock data
        base_lat = 40.7589
        base_lng = -73.9851
        history_coords = []
        timestamps = []

        for i in range(20):
            history_coords.append({
                "lat": base_lat + (i * 0.001),
                "lng": base_lng + (i * 0.0008)
            })
            time = datetime.now(timezone.utc) - timedelta(minutes=20-i)
            timestamps.append(time.isoformat())

        return RouteHistory(
            user_id=user_id,
            coordinates=history_coords,
            timestamps=timestamps
        )

# SECURITY: Configure CORS with restrictive defaults
# CORS_ORIGINS should be a comma-separated list of allowed origins
cors_origins_str = os.environ.get('CORS_ORIGINS', '')
if not cors_origins_str:
    # Default to localhost for development
    cors_origins = ['http://localhost:3000', 'http://localhost:5173']
    logging.warning("⚠️  CORS_ORIGINS not set - using development defaults. Set CORS_ORIGINS in production!")
elif cors_origins_str == '*':
    logging.error("❌ CORS_ORIGINS='*' is insecure! Specify allowed origins explicitly.")
    cors_origins = ['*']
else:
    cors_origins = [origin.strip() for origin in cors_origins_str.split(',')]

logging.info(f"CORS allowed origins: {cors_origins}")

# Add CORS middleware BEFORE including routes
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the router in the main app
app.include_router(api_router)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    if client:
        client.close()