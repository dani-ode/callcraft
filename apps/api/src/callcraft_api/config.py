import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Callcraft Data Plane API"
    app_env: str = "development"
    port: int = 8080

    database_url: str = "postgresql+asyncpg://callcraft_user:secret_password@127.0.0.1:5432/callcraft_db"
    redis_url: str = "redis://127.0.0.1:6379"

    master_encryption_key: str = "default_master_key_32_bytes_len!!"
    service_client_id: str = "svc_nextjs_main"
    service_client_secret: str = "default_secret"


settings = Settings()
