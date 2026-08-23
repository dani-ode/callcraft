from typing import Optional
from fastapi import Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from callcraft_api.db.models import AppInit
from callcraft_api.db.session import get_db_session
from callcraft_api.routers.internal._deps import router


APP_INIT_ID = "app_01HZX01INIT00000000001"


class UpdateAppInitRequest(BaseModel):
    app_name: Optional[str] = Field(None)
    app_icon: Optional[str] = Field(None)
    tagline: Optional[str] = Field(None)
    description: Optional[str] = Field(None)
    favicon_url: Optional[str] = Field(None)
    disable_landing_page: Optional[bool] = Field(None)
    default_registration_status: Optional[str] = Field(None)
    require_email_verification: Optional[bool] = Field(None)


def _serialize_app_init(app_setting) -> dict:
    return {
        "id": app_setting.id,
        "appName": app_setting.app_name,
        "appIcon": app_setting.app_icon,
        "tagline": app_setting.tagline,
        "description": app_setting.description,
        "faviconUrl": app_setting.favicon_url,
        "disableLandingPage": app_setting.disable_landing_page,
        "defaultRegistrationStatus": app_setting.default_registration_status,
        "requireEmailVerification": app_setting.require_email_verification,
    }


@router.get("/status")
async def internal_status(
    x_service_client_id: Optional[str] = Header(None, alias="X-Service-Client-Id"),
    x_service_client_secret: Optional[str] = Header(None, alias="X-Service-Client-Secret"),
):
    return {
        "channel": "internal",
        "serviceClientId": x_service_client_id or "",
        "status": "active",
    }


@router.get("/app-init")
async def get_app_init(db: Optional[AsyncSession] = Depends(get_db_session)):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    stmt = select(AppInit).where(AppInit.id == APP_INIT_ID)
    res = await db.execute(stmt)
    app_setting = res.scalar_one_or_none()
    if not app_setting:
        app_setting = AppInit(
            id=APP_INIT_ID,
            app_name="Callcraft",
            app_icon="Feather",
            tagline="Multimodal AI Execution Gateway",
            description="Dynamic AI Tool Calling, Structured JSON Coercion, and Multimodal API Gateway.",
            favicon_url="/favicon.ico",
            disable_landing_page=False,
            default_registration_status="pending_verification",
            require_email_verification=True,
        )
        db.add(app_setting)
        await db.commit()
        await db.refresh(app_setting)

    return _serialize_app_init(app_setting)


@router.put("/app-init")
async def update_app_init(
    payload: UpdateAppInitRequest,
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    stmt = select(AppInit).where(AppInit.id == APP_INIT_ID)
    res = await db.execute(stmt)
    app_setting = res.scalar_one_or_none()
    if not app_setting:
        app_setting = AppInit(id=APP_INIT_ID)
        db.add(app_setting)

    if payload.app_name is not None:
        app_setting.app_name = payload.app_name
    if payload.app_icon is not None:
        app_setting.app_icon = payload.app_icon
    if payload.tagline is not None:
        app_setting.tagline = payload.tagline
    if payload.description is not None:
        app_setting.description = payload.description
    if payload.favicon_url is not None:
        app_setting.favicon_url = payload.favicon_url
    if payload.disable_landing_page is not None:
        app_setting.disable_landing_page = payload.disable_landing_page
    if payload.default_registration_status is not None:
        app_setting.default_registration_status = payload.default_registration_status
    if payload.require_email_verification is not None:
        app_setting.require_email_verification = payload.require_email_verification

    await db.commit()
    await db.refresh(app_setting)
    return _serialize_app_init(app_setting)
