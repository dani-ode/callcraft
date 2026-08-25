import ulid
from typing import Any, Dict, Optional
from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from callcraft_api.db.models import CallSpec, CallSpecVersion, Template, TemplateComment
from callcraft_api.db.repository import Repository
from callcraft_api.db.session import get_db_session
from callcraft_api.services.redis_cache import redis_service
from callcraft_api.routers.internal._deps import router, get_current_user_id


class CreateSpecRequest(BaseModel):
    name: str = Field(..., description="Call Spec name")
    slug: str = Field(..., description="API slug")
    project_id: Optional[str] = Field(None, description="Project this spec belongs to")
    description: Optional[str] = Field(None)
    request_schema: Optional[Dict[str, Any]] = Field(None, description="JSON Schema of request payload parameters")
    response_schema: Dict[str, Any] = Field(..., description="JSON Schema of target output")
    positive_prompt: Optional[str] = Field(None, description="Positive prompt instructions")
    extraction_prompt: Optional[str] = Field(None, description="Positive prompt alias")
    negative_prompt: Optional[str] = Field(None, description="Negative prompt (prohibitions & constraints)")
    additional_prompt: Optional[str] = Field(None, description="Default additional prompt user instruction")
    allow_additional_prompt: bool = Field(True, description="Allow request additional prompt")
    allow_pdf_input: bool = Field(True, description="Allow PDF input files")
    use_external_api_key: bool = Field(True, description="Allow external AI API Key & Model Name on request headers")
    external_api_key: Optional[str] = Field(None)
    external_model_name: Optional[str] = Field(None)
    tools_config: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Tool calling configuration JSON")


class UpdateSpecPayload(BaseModel):
    name: Optional[str] = Field(None)
    slug: Optional[str] = Field(None)
    description: Optional[str] = Field(None)
    request_schema: Optional[Dict[str, Any]] = Field(None)
    response_schema: Optional[Dict[str, Any]] = Field(None)
    positive_prompt: Optional[str] = Field(None)
    extraction_prompt: Optional[str] = Field(None)
    negative_prompt: Optional[str] = Field(None)
    additional_prompt: Optional[str] = Field(None)
    allow_additional_prompt: Optional[bool] = Field(None)
    use_external_api_key: Optional[bool] = Field(None)
    external_model_name: Optional[str] = Field(None)
    external_api_key: Optional[str] = Field(None)
    tools_config: Optional[Dict[str, Any]] = Field(None)


class UpdatePublicationRequest(BaseModel):
    is_published: bool = Field(True, description="Whether to publish or unpublish this spec")
    name: Optional[str] = Field(None, description="Public display title")
    category: Optional[str] = Field(None, description="Category tag")
    description: Optional[str] = Field(None, description="Rich Markdown documentation file content")


@router.get("/specs")
async def list_specs(
    project_id: Optional[str] = None,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    specs = await Repository.list_call_specs(db, user_id, project_id=project_id)
    return specs


@router.post("/specs")
async def create_new_spec(
    payload: CreateSpecRequest,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    raw_slug = payload.slug or payload.name
    base_slug = raw_slug.lower().replace(" ", "-")
    slug = base_slug
    check_stmt = select(CallSpec).where(CallSpec.user_id == user_id, CallSpec.slug == slug)
    res = await db.execute(check_stmt)
    if res.scalar_one_or_none():
        slug = f"{base_slug}-{str(ulid.new()).lower()[-4:]}"

    spec = await Repository.create_call_spec(
        db=db,
        user_id=user_id,
        name=payload.name,
        slug=slug,
        project_id=payload.project_id,
        description=payload.description,
        request_schema=payload.request_schema,
        response_schema=payload.response_schema,
        positive_prompt=payload.positive_prompt or payload.extraction_prompt,
        negative_prompt=payload.negative_prompt,
        additional_prompt=payload.additional_prompt,
        allow_additional_prompt=payload.allow_additional_prompt,
        use_external_api_key=payload.use_external_api_key,
        external_model_name=payload.external_model_name,
        external_api_key=payload.external_api_key,
        tools_config=payload.tools_config,
    )
    return spec


@router.post("/specs/{spec_id}/duplicate")
async def duplicate_spec(
    spec_id: str,
    project_id: Optional[str] = None,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    existing = await Repository.get_call_spec(db, user_id, spec_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Call Spec tidak ditemukan")

    target_project_id = project_id or existing.get("projectId") or existing.get("project_id")
    if not target_project_id:
        user_projects = await Repository.list_projects(db, user_id)
        if user_projects:
            target_project_id = user_projects[0]["id"]

    name = existing["name"]
    slug_val = existing["slug"]
    new_name = f"{name} (Clone)"
    base_slug = f"{slug_val}-clone".lower()
    new_slug = f"{base_slug}-{str(ulid.new()).lower()[-6:]}"

    new_spec = await Repository.create_call_spec(
        db=db,
        user_id=user_id,
        name=new_name,
        slug=new_slug,
        project_id=target_project_id,
        description=existing.get("description"),
        request_schema=existing.get("requestSchema"),
        response_schema=existing.get("responseSchema"),
        positive_prompt=existing.get("positivePrompt") or existing.get("extractionPrompt"),
        negative_prompt=existing.get("negativePrompt"),
        additional_prompt=existing.get("additionalPrompt"),
        allow_additional_prompt=existing.get("allowAdditionalPrompt", True),
        use_external_api_key=existing.get("useExternalApiKey", True),
        external_model_name=existing.get("externalModelName"),
        external_api_key=existing.get("externalApiKey"),
        tools_config=existing.get("toolsConfig"),
    )
    return new_spec


@router.get("/specs/{spec_id}")
async def get_spec_by_id(
    spec_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    spec = await Repository.get_call_spec(db, user_id, spec_id)
    if not spec:
        raise HTTPException(status_code=404, detail="Call Spec not found")
    return spec


@router.put("/specs/{spec_id}")
async def update_spec_by_id(
    spec_id: str,
    payload: UpdateSpecPayload,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    spec = await Repository.update_call_spec(
        db=db,
        user_id=user_id,
        spec_id_or_slug=spec_id,
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
        request_schema=payload.request_schema,
        response_schema=payload.response_schema,
        positive_prompt=payload.positive_prompt or payload.extraction_prompt,
        negative_prompt=payload.negative_prompt,
        additional_prompt=payload.additional_prompt,
        allow_additional_prompt=payload.allow_additional_prompt,
        use_external_api_key=payload.use_external_api_key,
        external_model_name=payload.external_model_name,
        external_api_key=payload.external_api_key,
        tools_config=payload.tools_config,
    )
    if not spec:
        raise HTTPException(status_code=404, detail="Call Spec not found")

    # Invalidate Redis cache immediately so subsequent executions load the updated spec & schema
    await redis_service.delete_spec(user_id, spec_id)
    if spec.get("slug"):
        await redis_service.delete_spec(user_id, spec["slug"])
    if payload.slug:
        await redis_service.delete_spec(user_id, payload.slug)

    return spec


@router.delete("/specs/{spec_id}")
async def delete_spec_by_id(
    spec_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    success = await Repository.delete_call_spec(db, user_id, spec_id)
    if not success:
        raise HTTPException(status_code=404, detail="Call Spec tidak ditemukan")

    await redis_service.delete_spec(user_id, spec_id)
    return {"message": "Call Spec berhasil dihapus", "id": spec_id}


@router.get("/specs/{spec_id}/publication")
async def get_spec_publication(
    spec_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    if spec_id == "new":
        return {
            "spec": {
                "id": "new",
                "name": "",
                "slug": "",
                "description": "",
                "isPublished": False,
                "publishedTemplateId": None,
                "requestSchema": None,
                "responseSchema": None,
                "systemPrompt": None,
            },
            "template": None,
            "comments": [],
        }

    spec_data = await Repository.get_call_spec(db, user_id, spec_id)
    if not spec_data:
        raise HTTPException(status_code=404, detail="Call Spec not found")

    stmt = select(CallSpec).where(CallSpec.id == spec_id)
    res = await db.execute(stmt)
    spec_obj = res.scalar_one_or_none()
    if not spec_obj:
        raise HTTPException(status_code=404, detail="Call Spec not found")

    published_tmpl = None
    if spec_obj.published_template_id:
        t_stmt = select(Template).where(Template.id == spec_obj.published_template_id)
        t_res = await db.execute(t_stmt)
        published_tmpl = t_res.scalar_one_or_none()

    comments = []
    if spec_obj.published_template_id:
        c_stmt = select(TemplateComment).where(
            TemplateComment.template_id == spec_obj.published_template_id
        ).order_by(desc(TemplateComment.created_at))
        c_res = await db.execute(c_stmt)
        comments = c_res.scalars().all()

    return {
        "spec": spec_data,
        "template": published_tmpl,
        "comments": comments,
    }


@router.post("/specs/{spec_id}/publication")
async def update_spec_publication(
    spec_id: str,
    payload: UpdatePublicationRequest,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    stmt = select(CallSpec).where(CallSpec.id == spec_id)
    res = await db.execute(stmt)
    spec_obj = res.scalar_one_or_none()
    if not spec_obj:
        raise HTTPException(status_code=404, detail="Call Spec not found")

    spec_data = await Repository.get_call_spec(db, user_id, spec_id)
    safe_spec_data = spec_data or {}

    if payload.is_published:
        tmpl_obj = None
        if spec_obj.published_template_id:
            t_stmt = select(Template).where(Template.id == spec_obj.published_template_id)
            t_res = await db.execute(t_stmt)
            tmpl_obj = t_res.scalar_one_or_none()

        if not tmpl_obj:
            ver_stmt = select(CallSpecVersion).where(
                CallSpecVersion.call_spec_id == spec_obj.id,
                CallSpecVersion.version_number == spec_obj.active_version_number,
            )
            ver_res = await db.execute(ver_stmt)
            ver = ver_res.scalar_one_or_none()
            if not ver:
                raise HTTPException(status_code=400, detail="Call Spec tidak memiliki versi aktif")

            if not payload.category:
                raise HTTPException(status_code=400, detail="Category wajib diisi untuk mempublikasikan spec")

            template_id = f"tmpl_{str(ulid.new())}"
            tmpl_obj = Template(
                id=template_id,
                user_id=user_id,
                code=f"{spec_obj.slug}-pub-{str(ulid.new()).lower()[-4:]}",
                name=payload.name or spec_obj.name,
                description=payload.description or f"# {payload.name or spec_obj.name}\n\n{spec_obj.description or ''}",
                category=payload.category.lower(),
                request_schema=safe_spec_data.get("requestSchema"),
                response_schema=safe_spec_data.get("responseSchema"),
                positive_prompt=safe_spec_data.get("positivePrompt") or safe_spec_data.get("extractionPrompt"),
                negative_prompt=safe_spec_data.get("negativePrompt"),
                is_official=False,
                is_published=True,
                fork_count=1,
                likes_count=1,
                rating_avg=5.00,
                reviews_count=0,
            )
            db.add(tmpl_obj)
            await db.flush()
            spec_obj.published_template_id = template_id
        else:
            if payload.name:
                tmpl_obj.name = payload.name
            if payload.category:
                tmpl_obj.category = payload.category.lower()
            if payload.description is not None:
                tmpl_obj.description = payload.description

            if "responseSchema" in safe_spec_data:
                tmpl_obj.response_schema = safe_spec_data["responseSchema"]
            if "positivePrompt" in safe_spec_data:
                tmpl_obj.positive_prompt = safe_spec_data["positivePrompt"]
            if "negativePrompt" in safe_spec_data:
                tmpl_obj.negative_prompt = safe_spec_data["negativePrompt"]
            tmpl_obj.is_published = True

        spec_obj.is_published = True
    else:
        spec_obj.is_published = False
        if spec_obj.published_template_id:
            t_stmt = select(Template).where(Template.id == spec_obj.published_template_id)
            t_res = await db.execute(t_stmt)
            tmpl_obj = t_res.scalar_one_or_none()
            if tmpl_obj:
                tmpl_obj.is_published = False

    await db.commit()
    await db.refresh(spec_obj)

    return {
        "message": "Publication settings updated successfully!",
        "isPublished": spec_obj.is_published,
        "publishedTemplateId": spec_obj.published_template_id,
    }


class SavePlaygroundStateRequest(BaseModel):
    selectedCredentialId: Optional[str] = None
    checkedStates: Dict[str, bool] = {}
    extraInputs: Dict[str, Any] = {}
    prompt: Optional[str] = None
    imageUrl: Optional[str] = None
    aiModelName: Optional[str] = None
    aiApiKey: Optional[str] = None


@router.get("/specs/{spec_id}/playground-state")
async def get_playground_state_endpoint(
    spec_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    state = await Repository.get_playground_state(db, user_id, spec_id)
    return {"state": state}


@router.post("/specs/{spec_id}/playground-state")
async def save_playground_state_endpoint(
    spec_id: str,
    payload: SavePlaygroundStateRequest,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    state = await Repository.save_playground_state(db, user_id, spec_id, payload.model_dump())
    return {
        "success": True,
        "message": "Playground state saved successfully!",
        "state": state,
    }
