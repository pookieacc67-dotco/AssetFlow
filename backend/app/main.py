import os
import sys

# Ensure backend directory is in sys.path so 'app.*' imports resolve cleanly
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.db.connection import DBConnection
from app.routers import auth, assets, bookings, ai_agents, users, maintenance, audit

@asynccontextmanager
async def lifespan(app: FastAPI):
    # This automatically boots up the SQLite schema on startup
    print("[AssetFlow API] Starting up and initializing databases...")
    DBConnection()
    yield
    print("[AssetFlow API] Shutting down...")

app = FastAPI(
    title="AssetFlow API",
    description="Multi-tenant Enterprise Asset & Resource Booking backend",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration for production-ready frontend access (Vercel & custom domains)
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "").strip()
if allowed_origins_env and allowed_origins_env != "*":
    origins = [orig.strip() for orig in allowed_origins_env.split(",") if orig.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # Reflect requesting origins to support Vercel deployment URLs and preview branches safely with credentials
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"https?://.*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Health check
@app.get("/api/health", tags=["System"])
def health_check():
    return {"status": "healthy", "service": "AssetFlow", "version": "1.0.0"}

# Mount module routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(assets.router, prefix="/api/assets", tags=["Assets & Inventory"])
app.include_router(bookings.router, prefix="/api/bookings", tags=["Resource Bookings"])
app.include_router(users.router, prefix="/api/users", tags=["Users & Access"])
app.include_router(maintenance.router, prefix="/api/maintenance", tags=["Maintenance Operations"])
app.include_router(audit.router, prefix="/api/audits", tags=["Visual Audits"])
app.include_router(ai_agents.router, prefix="/api/ai", tags=["AI Copilots"])

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)
