"""Configuration settings for Python Chat Microservice."""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "youruniverse-chat"
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str = ""
    
    # Redis
    REDIS_URL: str = ""
    
    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000"]
    
    # JWT (for validating tokens from Node.js API)
    JWT_ACCESS_SECRET: str = ""
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 10
    RATE_LIMIT_WINDOW: int = 60  # seconds
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

