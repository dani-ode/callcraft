from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from callcraft_api.db.repository import Repository
from callcraft_api.db.session import get_db_session

router = APIRouter(prefix="/internal/v1", tags=["Internal Service Auth"])


class CreateSpecRequest(BaseModel):
    name: str = Field(..., description="Call Spec name")
    slug: str = Field(..., description="API slug")
    description: Optional[str] = Field(None)
    response_schema: Dict[str, Any] = Field(..., description="JSON Schema of target output")
    system_prompt: Optional[str] = Field(None)


class CreateApiKeyRequest(BaseModel):
    name: str = Field(..., description="Key description name")
    environment: str = Field("production")


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


@router.get("/specs")
async def list_specs(
    user_id: str = "usr_default_dev_01",
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    specs = await Repository.list_call_specs(db, user_id)
    return specs


@router.post("/specs")
async def create_spec(
    payload: CreateSpecRequest,
    user_id: str = "usr_default_dev_01",
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")
    
    spec = await Repository.create_call_spec(
        db=db,
        user_id=user_id,
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
        response_schema=payload.response_schema,
        system_prompt=payload.system_prompt,
    )
    return spec


@router.get("/templates")
async def list_templates(db: Optional[AsyncSession] = Depends(get_db_session)):
    templates = await Repository.list_templates(db)
    return templates


@router.get("/keys")
async def list_keys(
    user_id: str = "usr_default_dev_01",
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    keys = await Repository.list_api_credentials(db, user_id)
    return keys


@router.post("/keys")
async def create_key(
    payload: CreateApiKeyRequest,
    user_id: str = "usr_default_dev_01",
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")
    
    cred, secret_key = await Repository.create_api_credential(
        db=db, user_id=user_id, name=payload.name, environment=payload.environment
    )
    return {
        "credential": cred,
        "secret_key": secret_key,
    }


@router.get("/logs")
async def list_logs(
    user_id: str = "usr_default_dev_01",
    limit: int = 50,
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    logs = await Repository.list_api_requests(db, user_id, limit)
    return logs
