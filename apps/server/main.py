import os
import socketio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

# Import routers
from routes import auth, territory, leaderboard
# Import socket handlers and the sio instance
from socket_handlers import sio
# Import db management functions
from db import get_db_pool

fastapi_app = FastAPI(title="Hex Territory API", version="0.1.0")

# Setup CORS to allow common dev origins and any port variations
cors_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
]
env_cors = os.getenv("CORS_ORIGIN")
if env_cors:
    for origin in env_cors.replace(",", " ").split():
        if origin not in cors_origins:
            cors_origins.append(origin)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom exception handlers to match Express JSON error formats
from middleware.auth import AuthException

@fastapi_app.exception_handler(AuthException)
async def auth_exception_handler(request, exc: AuthException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.error_message}
    )

@fastapi_app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    if isinstance(exc.detail, dict):
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(status_code=exc.status_code, content={"error": str(exc.detail)})

# Lifespan events
@fastapi_app.on_event("startup")
async def startup_event():
    # Warm up database connection pool on start
    try:
        await get_db_pool()
        print("Database connection pool initialized successfully")
    except Exception as e:
        print(f"Failed to initialize database connection pool: {e}")

@fastapi_app.on_event("shutdown")
async def shutdown_event():
    from db import pool
    if pool:
        await pool.close()
        print("Database connection pool closed")

# API routes
fastapi_app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
fastapi_app.include_router(territory.router, prefix="/api/territory", tags=["territory"])
fastapi_app.include_router(leaderboard.router, prefix="/api/leaderboard", tags=["leaderboard"])

@fastapi_app.get("/health")
async def health():
    return {"status": "ok"}

@fastapi_app.get("/db-check")
async def db_check():
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            time_now = await conn.fetchval("SELECT NOW()")
            return {"connected": True, "time": time_now.isoformat() + "Z"}
    except Exception as e:
        return {"connected": False, "error": str(e)}

# Mount Socket.IO at the root path. This must go at the end so it only catches
# paths not handled by other routers (like /socket.io).
# Since it is mounted inside fastapi_app, FastAPI's CORSMiddleware will intercept
# and handle standard HTTP preflight OPTIONS requests for all routes cleanly.
socket_app = socketio.ASGIApp(sio)
fastapi_app.mount("/", socket_app)

app = fastapi_app

