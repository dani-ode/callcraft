from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from callcraft_api.config import settings
from callcraft_api.routers import admin, health, internal, public

app = FastAPI(
    title=settings.app_name,
    description="AI-Powered Dynamic Multimodal Execution Engine & Gateway",
    version="0.1.0",
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health.router)
app.include_router(public.router)
app.include_router(internal.router)
app.include_router(admin.router)
