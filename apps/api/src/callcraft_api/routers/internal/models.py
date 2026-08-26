import ulid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from callcraft_api.db.session import get_db_session
from callcraft_api.db.models import AiModel, AiProvider
from callcraft_api.routers.internal._deps import router, get_current_user_id


class AiModelResponse(BaseModel):
    id: str
    providerId: str
    providerCode: str
    providerName: str
    name: str
    modelIdentifier: str
    supportsImage: bool
    supportsToolCalling: bool
    supportsStructuredOutput: bool
    costPer1kPromptTokens: float
    costPer1kCompletionTokens: float
    isDefault: bool
    isActive: bool


class AiProviderResponse(BaseModel):
    id: str
    code: str
    name: str
    isActive: bool
    modelsCount: Optional[int] = 0


@router.get("/models", response_model=List[AiModelResponse])
async def list_ai_models(
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    stmt = select(AiModel).options(joinedload(AiModel.provider)).where(AiModel.is_active == True).order_by(AiModel.provider_id, AiModel.name)
    res = await db.execute(stmt)
    models = res.scalars().all()

    return [
        AiModelResponse(
            id=m.id,
            providerId=m.provider_id,
            providerCode=m.provider.code if m.provider else "",
            providerName=m.provider.name if m.provider else "",
            name=m.name,
            modelIdentifier=m.model_identifier,
            supportsImage=m.supports_image,
            supportsToolCalling=m.supports_tool_calling,
            supportsStructuredOutput=m.supports_structured_output,
            costPer1kPromptTokens=m.cost_per_1k_prompt_tokens or 0.0,
            costPer1kCompletionTokens=m.cost_per_1k_completion_tokens or 0.0,
            isDefault=m.is_default,
            isActive=m.is_active,
        )
        for m in models
    ]


@router.get("/providers", response_model=List[AiProviderResponse])
async def list_ai_providers(
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    stmt = select(AiProvider).options(joinedload(AiProvider.models)).where(AiProvider.is_active == True).order_by(AiProvider.name)
    res = await db.execute(stmt)
    providers = res.scalars().all()

    return [
        AiProviderResponse(
            id=p.id,
            code=p.code,
            name=p.name,
            isActive=p.is_active,
            modelsCount=len(p.models) if p.models else 0,
        )
        for p in providers
    ]
