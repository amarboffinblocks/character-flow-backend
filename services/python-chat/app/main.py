"""
youruniverse.ai - Python Chat Microservice
==========================================
Handles AI chat completions, streaming responses, and character interactions.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from loguru import logger
import redis.asyncio as redis

from app.config import settings
from app.routers import chat, health


# ============================================
# Redis Connection
# ============================================

redis_client: redis.Redis | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    global redis_client
    
    # Startup
    logger.info("Starting Python Chat Microservice...")
    
    if settings.REDIS_URL:
        try:
            redis_client = redis.from_url(settings.REDIS_URL)
            await redis_client.ping()
            logger.info("Redis connected")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}")
            redis_client = None
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    if redis_client:
        await redis_client.close()
        logger.info("Redis disconnected")


# ============================================
# FastAPI Application
# ============================================

app = FastAPI(
    title="youruniverse.ai Chat Service",
    description="AI Chat Microservice for character interactions",
    version="1.0.0",
    lifespan=lifespan,
)

# ============================================
# CORS Middleware
# ============================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# Routes
# ============================================

app.include_router(health.router, tags=["Health"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chat"])


# ============================================
# Root Endpoint
# ============================================

@app.get("/")
async def root():
    return {
        "service": "youruniverse.ai Chat Service",
        "version": "1.0.0",
        "status": "running",
    }

