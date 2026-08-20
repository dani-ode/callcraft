from fastapi import APIRouter

router = APIRouter(prefix="/admin/v1", tags=["Admin Platform RBAC"])


@router.get("/status")
async def admin_status():
    return {
        "channel": "admin",
        "system_status": "healthy",
        "active_models": ["gemini-1.5-flash", "gpt-4o", "claude-3-5-sonnet", "deepseek-v3"],
    }
