import httpx
from typing import Optional
from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from callcraft_api.db.repository import Repository
from callcraft_api.db.session import get_db_session
from callcraft_api.routers.internal._deps import router, get_current_user_id
from callcraft_engine import validate_ip_or_cidr


class SaveProviderKeyRequest(BaseModel):
    provider: str = Field(..., description="Provider code: gemini, openai, anthropic, or deepseek")
    api_key: str = Field(..., description="Raw AI Provider API key to encrypt and save")
    project_id: Optional[str] = Field(None, description="Project this AI provider key belongs to")


class VerifyProviderKeyRequest(BaseModel):
    provider: str = Field(..., description="Provider code: gemini, openai, anthropic, or deepseek")
    api_key: str = Field(..., description="API key to verify against provider endpoint")


class CreateApiKeyRequest(BaseModel):
    name: str = Field(..., description="Key description name")
    environment: str = Field(..., description="Credential environment: production or development")
    project_id: Optional[str] = Field(None, description="Project this key belongs to")
    ip_whitelist: Optional[list[str]] = Field(default=None, description="Optional array of whitelisted IP addresses / CIDRs")


class UpdateApiKeyWhitelistRequest(BaseModel):
    ip_whitelist: list[str] = Field(..., description="Array of whitelisted IP addresses / CIDR subnets")


@router.get("/keys")
async def list_keys(
    project_id: Optional[str] = None,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    keys = await Repository.list_api_credentials(db, user_id, project_id=project_id)
    return keys


@router.post("/keys")
async def create_key(
    payload: CreateApiKeyRequest,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    if payload.ip_whitelist:
        for ip in payload.ip_whitelist:
            if ip and ip.strip() and not validate_ip_or_cidr(ip.strip()):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid IP address or CIDR subnet format: '{ip}'",
                )

    cred, secret_key = await Repository.create_api_credential(
        db=db, user_id=user_id, name=payload.name, environment=payload.environment,
        ip_whitelist=payload.ip_whitelist, project_id=payload.project_id
    )
    return {
        "credential": cred,
        "secretKey": secret_key,
    }


@router.put("/keys/{key_id}/whitelist")
async def update_key_whitelist(
    key_id: str,
    payload: UpdateApiKeyWhitelistRequest,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    for ip in payload.ip_whitelist:
        if ip and ip.strip() and not validate_ip_or_cidr(ip.strip()):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid IP address or CIDR subnet format: '{ip}'",
            )

    updated_key = await Repository.update_api_credential_ip_whitelist(
        db=db, key_id=key_id, user_id=user_id, ip_whitelist=payload.ip_whitelist
    )
    if not updated_key:
        raise HTTPException(status_code=404, detail="API Key credential not found")

    return updated_key


@router.delete("/keys/{key_id}")
async def delete_key(
    key_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    deleted = await Repository.delete_api_credential(db=db, key_id=key_id, user_id=user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="API Key credential not found or already deleted")

    return {"status": "success", "message": "API Key deleted successfully", "id": key_id}



@router.get("/logs")
async def list_logs(
    project_id: Optional[str] = None,
    user_id: str = Depends(get_current_user_id),
    limit: int = 50,
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    logs = await Repository.list_api_requests(db, user_id, limit, project_id=project_id)
    return logs


@router.post("/providers/save-key")
async def save_provider_key(
    payload: SaveProviderKeyRequest,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    key = payload.api_key.strip()
    provider = payload.provider.lower().strip()
    if not key:
        raise HTTPException(status_code=400, detail="API Key cannot be empty")

    success = await Repository.save_user_ai_provider_key(
        db=db, user_id=user_id, provider_code=provider, raw_api_key=key, project_id=payload.project_id
    )
    if not success:
        raise HTTPException(status_code=400, detail=f"Invalid or unsupported AI provider code: '{provider}'")

    return {
        "success": True,
        "message": f"API Key for '{provider}' encrypted with AES-256-GCM and saved successfully.",
    }


@router.get("/providers/keys")
async def list_provider_keys(
    project_id: Optional[str] = None,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    keys = await Repository.list_user_ai_providers(db, user_id, project_id=project_id)
    return keys


@router.get("/providers/list")
async def list_system_providers(
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    return await Repository.list_ai_providers(db)


@router.post("/providers/verify-key")
async def verify_provider_key(payload: VerifyProviderKeyRequest):
    provider = payload.provider.lower().strip()
    key = payload.api_key.strip()

    if not key:
        raise HTTPException(status_code=400, detail="API Key cannot be empty")

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            if provider == "gemini":
                url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
                resp = await client.get(url)
            elif provider == "openai":
                url = "https://api.openai.com/v1/models"
                resp = await client.get(url, headers={"Authorization": f"Bearer {key}"})
            elif provider == "anthropic":
                url = "https://api.anthropic.com/v1/models"
                resp = await client.get(url, headers={"x-api-key": key, "anthropic-version": "2023-06-01"})
            elif provider in ("deepseek", "ocr"):
                url = "https://api.deepseek.com/models"
                resp = await client.get(url, headers={"Authorization": f"Bearer {key}"})
            elif provider == "mistral":
                url = "https://api.mistral.ai/v1/models"
                resp = await client.get(url, headers={"Authorization": f"Bearer {key}"})
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")

            if resp.status_code == 200:
                return {"valid": True, "statusCode": 200, "message": f"{provider.capitalize()} API Key verified successfully!"}
            else:
                err_msg = resp.json().get("error", {}).get("message", resp.text)
                return {"valid": False, "statusCode": resp.status_code, "message": f"{provider.capitalize()} API Key test failed ({resp.status_code}): {err_msg}"}

        except httpx.RequestError as exc:
            return {"valid": False, "statusCode": 500, "message": f"Connection network error while testing {provider} key: {str(exc)}"}
