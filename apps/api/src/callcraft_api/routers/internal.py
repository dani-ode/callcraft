from typing import Optional
from fastapi import APIRouter, Header

router = APIRouter(prefix="/internal/v1", tags=["Internal Service Auth"])


@router.get("/status")
async def internal_status(
    x_service_client_id: Optional[str] = Header(None, alias="X-Service-Client-Id"),
    x_service_client_secret: Optional[str] = Header(None, alias="X-Service-Client-Secret"),
):
    return {
        "channel": "internal",
        "service_client_id": x_service_client_id or "svc_nextjs_main",
        "status": "active",
    }
