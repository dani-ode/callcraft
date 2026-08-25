import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Callcraft Data Plane API"
    app_env: str = "development"
    port: int = 8080

    postgres_user: str = "callcraft_user"
    postgres_password: str = "secret_password"
    postgres_db: str = "callcraft_db"
    postgres_host: str = "127.0.0.1"
    postgres_port: int = 5432

    database_url: Optional[str] = None
    redis_url: Optional[str] = None
    redis_password: Optional[str] = None

    master_encryption_key: str = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    service_client_id: str = "svc_nextjs_main"
    service_client_secret: str = "sec_live_default_nextjs_service_secret_key_12345"

    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None

    @property
    def resolved_database_url(self) -> str:
        if self.database_url:
            url = self.database_url
            if url.startswith("postgres://"):
                return url.replace("postgres://", "postgresql+asyncpg://", 1)
            if url.startswith("postgresql://") and "+asyncpg" not in url:
                return url.replace("postgresql://", "postgresql+asyncpg://", 1)
            return url
        return f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"

    @property
    def resolved_redis_url(self) -> str:
        if self.redis_url:
            return self.redis_url
        if self.redis_password:
            return f"redis://:{self.redis_password}@127.0.0.1:6379"
        return "redis://127.0.0.1:6379"


settings = Settings()
