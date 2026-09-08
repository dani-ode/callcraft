import json
import ulid
from typing import Any, Dict, Optional
from fastapi import Depends, HTTPException, Response, UploadFile, File
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

    if not payload.project_id or not payload.project_id.strip():
        raise HTTPException(status_code=400, detail="Parameter 'project_id' wajib diisi.")

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

    target_project_id = (project_id or existing.get("projectId") or existing.get("project_id") or "").strip()
    if not target_project_id:
        raise HTTPException(status_code=400, detail="Parameter 'project_id' wajib diisi untuk menduplikasi Call Spec.")

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


# ============================================================================
# SPEC EXPORT, IMPORT & SECTION MANAGEMENT ENDPOINTS
# ============================================================================

@router.get("/specs/{spec_id}/export")
async def export_spec_json(
    spec_id: str,
    download: bool = False,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    """Exports a full CallCraft spec into a standardized JSON format."""
    spec = await Repository.get_call_spec(db, user_id, spec_id)
    if not spec:
        raise HTTPException(status_code=404, detail="Call Spec not found")

    export_payload = {
        "version": "1.0",
        "id": spec.get("id"),
        "name": spec.get("name"),
        "slug": spec.get("slug"),
        "projectId": spec.get("projectId") or spec.get("project_id"),
        "description": spec.get("description"),
        "requestSchema": spec.get("requestSchema"),
        "responseSchema": spec.get("responseSchema"),
        "prompts": {
            "positivePrompt": spec.get("positivePrompt") or spec.get("extractionPrompt"),
            "negativePrompt": spec.get("negativePrompt"),
            "additionalPrompt": spec.get("additionalPrompt"),
        },
        "toolsConfig": spec.get("toolsConfig") or {},
        "config": {
            "allowAdditionalPrompt": spec.get("allowAdditionalPrompt", True),
            "useExternalApiKey": spec.get("useExternalApiKey", True),
            "externalModelName": spec.get("externalModelName"),
            "externalApiKey": spec.get("externalApiKey"),
        },
    }

    if download:
        file_name = f"{spec.get('slug') or 'callcraft'}-spec.json"
        content_str = json.dumps(export_payload, indent=2, ensure_ascii=False)
        return Response(
            content=content_str,
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
        )

    return export_payload


class ImportSpecPayload(BaseModel):
    name: Optional[str] = Field(None)
    slug: Optional[str] = Field(None)
    project_id: Optional[str] = Field(None)
    description: Optional[str] = Field(None)
    requestSchema: Optional[Dict[str, Any]] = Field(None)
    responseSchema: Optional[Dict[str, Any]] = Field(None)
    prompts: Optional[Dict[str, Any]] = Field(None)
    toolsConfig: Optional[Dict[str, Any]] = Field(None)
    config: Optional[Dict[str, Any]] = Field(None)
    request_schema: Optional[Dict[str, Any]] = Field(None)
    response_schema: Optional[Dict[str, Any]] = Field(None)
    positive_prompt: Optional[str] = Field(None)
    negative_prompt: Optional[str] = Field(None)
    additional_prompt: Optional[str] = Field(None)
    tools_config: Optional[Dict[str, Any]] = Field(None)


from fastapi import Request

@router.post("/specs/import")
@router.post("/specs/{spec_id}/import")
async def import_spec_json(
    request: Request,
    spec_id: Optional[str] = None,
    project_id: Optional[str] = None,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    """Imports JSON to update an existing CallCraft spec or create a new one."""
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    raw_data: Dict[str, Any] = {}
    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" in content_type:
        try:
            form = await request.form()
            file_obj = form.get("file")
            if file_obj and hasattr(file_obj, "read"):
                content_bytes = await file_obj.read()
                raw_data = json.loads(content_bytes.decode("utf-8"))
            elif "spec_json" in form:
                spec_val = form["spec_json"]
                if isinstance(spec_val, (str, bytes, bytearray)):
                    raw_data = json.loads(spec_val)
                elif hasattr(spec_val, "read"):
                    content_bytes = await spec_val.read()
                    raw_data = json.loads(content_bytes.decode("utf-8"))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"File JSON tidak valid: {str(e)}")
    else:
        try:
            raw_data = await request.json()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Payload JSON tidak valid: {str(e)}")

    if not raw_data:
        raise HTTPException(status_code=400, detail="Payload atau file JSON wajib diisi untuk import spec")

    req_schema = raw_data.get("requestSchema") or raw_data.get("request_schema")
    res_schema = raw_data.get("responseSchema") or raw_data.get("response_schema") or {}
    
    prompts_obj = raw_data.get("prompts") or {}
    pos_prompt = prompts_obj.get("positivePrompt") or raw_data.get("positive_prompt") or raw_data.get("positivePrompt")
    neg_prompt = prompts_obj.get("negativePrompt") or raw_data.get("negative_prompt") or raw_data.get("negativePrompt")
    add_prompt = prompts_obj.get("additionalPrompt") or raw_data.get("additional_prompt") or raw_data.get("additionalPrompt")

    tools_cfg = raw_data.get("toolsConfig") or raw_data.get("tools_config")

    cfg_obj = raw_data.get("config") or {}
    allow_add = bool(cfg_obj.get("allowAdditionalPrompt", raw_data.get("allow_additional_prompt", True)))
    use_ext_key = bool(cfg_obj.get("useExternalApiKey", raw_data.get("use_external_api_key", True)))
    ext_model = cfg_obj.get("externalModelName", raw_data.get("external_model_name"))
    ext_key = cfg_obj.get("externalApiKey", raw_data.get("external_api_key"))

    target_project_id = project_id or raw_data.get("projectId") or raw_data.get("project_id")

    existing_spec = None
    if spec_id and spec_id != "new":
        existing_spec = await Repository.get_call_spec(db, user_id, spec_id)

    if existing_spec and spec_id:
        # Update existing spec
        updated = await Repository.update_call_spec(
            db=db,
            user_id=user_id,
            spec_id_or_slug=spec_id,
            name=raw_data.get("name"),
            slug=raw_data.get("slug"),
            description=raw_data.get("description"),
            request_schema=req_schema,
            response_schema=res_schema if res_schema else None,
            positive_prompt=pos_prompt,
            negative_prompt=neg_prompt,
            additional_prompt=add_prompt,
            allow_additional_prompt=allow_add,
            use_external_api_key=use_ext_key,
            external_model_name=ext_model,
            external_api_key=ext_key,
            tools_config=tools_cfg,
        )
        await redis_service.delete_spec(user_id, spec_id)
        if updated and updated.get("slug"):
            await redis_service.delete_spec(user_id, str(updated["slug"]))
        return {
            "message": "Call Spec berhasil diperbarui dari import JSON",
            "spec": updated,
        }
    else:
        # Create new spec
        if not target_project_id or not str(target_project_id).strip():
            raise HTTPException(status_code=400, detail="Parameter 'project_id' wajib diisi untuk meng-import Call Spec baru.")

        name = raw_data.get("name") or "Imported Call Spec"
        raw_slug = raw_data.get("slug") or name
        base_slug = raw_slug.lower().replace(" ", "-")
        slug = f"{base_slug}-{str(ulid.new()).lower()[-4:]}"

        new_spec = await Repository.create_call_spec(
            db=db,
            user_id=user_id,
            name=name,
            slug=slug,
            project_id=target_project_id,
            description=raw_data.get("description"),
            request_schema=req_schema,
            response_schema=res_schema,
            positive_prompt=pos_prompt,
            negative_prompt=neg_prompt,
            additional_prompt=add_prompt,
            allow_additional_prompt=allow_add,
            use_external_api_key=use_ext_key,
            external_model_name=ext_model,
            external_api_key=ext_key,
            tools_config=tools_cfg,
        )
        return {
            "message": "Call Spec baru berhasil dibuat dari import JSON",
            "spec": new_spec,
        }



@router.get("/specs/{spec_id}/sections/{section}")
async def get_spec_section(
    spec_id: str,
    section: str,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    """Retrieves a specific section of a Call Spec (request-schema, response-schema, prompts, tools-config, config)."""
    spec = await Repository.get_call_spec(db, user_id, spec_id)
    if not spec:
        raise HTTPException(status_code=404, detail="Call Spec not found")

    sec_key = section.lower().replace("_", "-")
    if sec_key in ["request-schema", "request"]:
        return {"requestSchema": spec.get("requestSchema")}
    elif sec_key in ["response-schema", "response"]:
        return {"responseSchema": spec.get("responseSchema")}
    elif sec_key in ["prompts", "prompt"]:
        return {
            "positivePrompt": spec.get("positivePrompt") or spec.get("extractionPrompt"),
            "negativePrompt": spec.get("negativePrompt"),
            "additionalPrompt": spec.get("additionalPrompt"),
        }
    elif sec_key in ["tools-config", "tools", "toolcalling"]:
        return {"toolsConfig": spec.get("toolsConfig") or {}}
    elif sec_key in ["config", "settings"]:
        return {
            "allowAdditionalPrompt": spec.get("allowAdditionalPrompt", True),
            "useExternalApiKey": spec.get("useExternalApiKey", True),
            "externalModelName": spec.get("externalModelName"),
            "externalApiKey": spec.get("externalApiKey"),
        }
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Section '{section}' tidak dikenal. Pilih salah satu dari: request-schema, response-schema, prompts, tools-config, config",
        )


@router.put("/specs/{spec_id}/sections/{section}")
async def update_spec_section(
    spec_id: str,
    section: str,
    payload: Dict[str, Any],
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    """Updates a specific section of a Call Spec."""
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    spec = await Repository.get_call_spec(db, user_id, spec_id)
    if not spec:
        raise HTTPException(status_code=404, detail="Call Spec not found")

    sec_key = section.lower().replace("_", "-")

    update_kwargs: Dict[str, Any] = {}

    if sec_key in ["request-schema", "request"]:
        update_kwargs["request_schema"] = payload.get("requestSchema") if "requestSchema" in payload else payload
    elif sec_key in ["response-schema", "response"]:
        update_kwargs["response_schema"] = payload.get("responseSchema") if "responseSchema" in payload else payload
    elif sec_key in ["prompts", "prompt"]:
        if "positivePrompt" in payload or "positive_prompt" in payload:
            update_kwargs["positive_prompt"] = payload.get("positivePrompt") or payload.get("positive_prompt")
        if "negativePrompt" in payload or "negative_prompt" in payload:
            update_kwargs["negative_prompt"] = payload.get("negativePrompt") or payload.get("negative_prompt")
        if "additionalPrompt" in payload or "additional_prompt" in payload:
            update_kwargs["additional_prompt"] = payload.get("additionalPrompt") or payload.get("additional_prompt")
    elif sec_key in ["tools-config", "tools", "toolcalling"]:
        update_kwargs["tools_config"] = payload.get("toolsConfig") if "toolsConfig" in payload else payload
    elif sec_key in ["config", "settings"]:
        if "allowAdditionalPrompt" in payload:
            update_kwargs["allow_additional_prompt"] = payload["allowAdditionalPrompt"]
        if "useExternalApiKey" in payload:
            update_kwargs["use_external_api_key"] = payload["useExternalApiKey"]
        if "externalModelName" in payload:
            update_kwargs["external_model_name"] = payload["externalModelName"]
        if "externalApiKey" in payload:
            update_kwargs["external_api_key"] = payload["externalApiKey"]
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Section '{section}' tidak dikenal. Pilih salah satu dari: request-schema, response-schema, prompts, tools-config, config",
        )

    updated = await Repository.update_call_spec(
        db=db,
        user_id=user_id,
        spec_id_or_slug=spec_id,
        **update_kwargs,
    )
    await redis_service.delete_spec(user_id, spec_id)
    if updated and updated.get("slug"):
        await redis_service.delete_spec(user_id, updated["slug"])

    return {
        "message": f"Section '{section}' berhasil diperbarui",
        "spec": updated,
    }

