import httpx
import ulid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from callcraft_api.db.models import AppInit, Template, TemplateLike, TemplateComment, CallSpec, CallSpecVersion
from callcraft_api.db.repository import Repository
from callcraft_api.db.session import get_db_session

router = APIRouter(prefix="/internal/v1", tags=["Internal Service Auth"])


class CreateSpecRequest(BaseModel):
    name: str = Field(..., description="Call Spec name")
    slug: str = Field(..., description="API slug")
    description: Optional[str] = Field(None)
    response_schema: Dict[str, Any] = Field(..., description="JSON Schema of target output")
    system_prompt: Optional[str] = Field(None)
    allow_pdf_input: bool = Field(True, description="Allow PDF input files")
    use_external_api_key: bool = Field(False, description="Require external AI API Key & Model Name on request")
    external_api_key: Optional[str] = Field(None)
    external_model_name: Optional[str] = Field(None)


class CreateApiKeyRequest(BaseModel):
    name: str = Field(..., description="Key description name")
    environment: str = Field("production")


class UpdateAppInitRequest(BaseModel):
    app_name: Optional[str] = Field(None)
    app_icon: Optional[str] = Field(None)
    tagline: Optional[str] = Field(None)
    description: Optional[str] = Field(None)
    favicon_url: Optional[str] = Field(None)
    disable_landing_page: Optional[bool] = Field(None)


class PublishTemplateRequest(BaseModel):
    call_spec_id: str = Field(..., description="ID of Call Spec to publish")
    code: str = Field(..., description="Unique template code identifier")
    name: str = Field(..., description="Public template display name")
    description: Optional[str] = Field(None)
    category: str = Field("custom", description="Category tag")


class AddCommentRequest(BaseModel):
    rating: int = Field(5, ge=1, le=5, description="1 to 5 star rating")
    comment: str = Field(..., description="Review comment text")
    author_name: Optional[str] = Field(None, description="Author display name")


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


@router.get("/app-init")
async def get_app_init(db: Optional[AsyncSession] = Depends(get_db_session)):
    if not db:
        return {
            "id": "app_01HZX01INIT00000000001",
            "app_name": "Callcraft",
            "app_icon": "Feather",
            "tagline": "Multimodal AI Execution Gateway",
            "favicon_url": "/favicon.ico",
            "disable_landing_page": False,
        }
    stmt = select(AppInit).where(AppInit.id == "app_01HZX01INIT00000000001")
    res = await db.execute(stmt)
    app_setting = res.scalar_one_or_none()
    if not app_setting:
        app_setting = AppInit(
            id="app_01HZX01INIT00000000001",
            app_name="Callcraft",
            app_icon="Feather",
            tagline="Multimodal AI Execution Gateway",
            favicon_url="/favicon.ico",
            disable_landing_page=False,
        )
        db.add(app_setting)
        await db.commit()
    return app_setting


@router.put("/app-init")
async def update_app_init(
    payload: UpdateAppInitRequest,
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")
    
    stmt = select(AppInit).where(AppInit.id == "app_01HZX01INIT00000000001")
    res = await db.execute(stmt)
    app_setting = res.scalar_one_or_none()
    if not app_setting:
        app_setting = AppInit(id="app_01HZX01INIT00000000001")
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

    await db.commit()
    await db.refresh(app_setting)
    return app_setting


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


# --- Template Marketplace Endpoints ---

@router.get("/templates")
async def list_templates(
    category: Optional[str] = None,
    search: Optional[str] = None,
    sort: Optional[str] = "popular",
    user_id: str = "usr_default_dev_01",
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        return []

    stmt = select(Template).where(Template.is_published == True)
    if category and category.lower() != "all":
        stmt = stmt.where(Template.category == category.lower())
    
    if sort == "popular":
        stmt = stmt.order_by(desc(Template.fork_count), desc(Template.likes_count))
    elif sort == "rating":
        stmt = stmt.order_by(desc(Template.rating_avg), desc(Template.reviews_count))
    elif sort == "newest":
        stmt = stmt.order_by(desc(Template.created_at))

    res = await db.execute(stmt)
    templates = res.scalars().all()

    if search:
        s_lower = search.lower()
        templates = [
            t for t in templates
            if s_lower in t.name.lower() or s_lower in (t.description or "").lower() or s_lower in t.category.lower()
        ]

    # Fetch user liked templates
    like_stmt = select(TemplateLike.template_id).where(TemplateLike.user_id == user_id)
    like_res = await db.execute(like_stmt)
    liked_ids = set(like_res.scalars().all())

    out = []
    for t in templates:
        out.append({
            "id": t.id,
            "userId": t.user_id,
            "code": t.code,
            "name": t.name,
            "description": t.description,
            "category": t.category,
            "isOfficial": t.is_official,
            "isPublished": t.is_published,
            "forkCount": t.fork_count,
            "likesCount": t.likes_count,
            "ratingAvg": float(t.rating_avg) if t.rating_avg is not None else 5.0,
            "reviewsCount": t.reviews_count,
            "isLiked": t.id in liked_ids,
            "requestSchema": t.request_schema,
            "responseSchema": t.response_schema,
            "systemPrompt": t.system_prompt,
            "createdAt": t.created_at.isoformat() if t.created_at else None,
        })

    return out


@router.post("/templates/publish")
async def publish_spec_to_marketplace(
    payload: PublishTemplateRequest,
    user_id: str = "usr_default_dev_01",
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    spec_data = await Repository.get_call_spec(db, user_id, payload.call_spec_id)
    if not spec_data:
        raise HTTPException(status_code=404, detail="Call Spec not found to publish")

    stmt = select(CallSpec).where((CallSpec.id == payload.call_spec_id) | (CallSpec.slug == payload.call_spec_id))
    res = await db.execute(stmt)
    spec_obj = res.scalar_one_or_none()

    template_id = f"tmpl_{str(ulid.new())}"
    tmpl = Template(
        id=template_id,
        user_id=user_id,
        code=payload.code.strip().lower().replace(" ", "-"),
        name=payload.name.strip(),
        description=payload.description or (spec_obj.description if spec_obj else None),
        category=payload.category.lower().strip(),
        request_schema=spec_data.get("request_schema", {"type": "object", "properties": {}}),
        response_schema=spec_data.get("response_schema", {"type": "object", "properties": {}}),
        system_prompt=spec_data.get("system_prompt") or "Extract all target fields accurately.",
        extraction_prompt=spec_data.get("extraction_prompt"),
        is_official=False,
        is_published=True,
        fork_count=1,
        likes_count=1,
        rating_avg=5.00,
        reviews_count=0,
    )
    db.add(tmpl)
    await db.flush()

    if spec_obj:
        spec_obj.is_published = True
        spec_obj.published_template_id = template_id

    await db.commit()
    await db.refresh(tmpl)
    return tmpl


@router.post("/templates/{template_id}/fork")
async def fork_template_to_spec(
    template_id: str,
    user_id: str = "usr_default_dev_01",
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    stmt = select(Template).where(Template.id == template_id)
    res = await db.execute(stmt)
    tmpl = res.scalar_one_or_none()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")

    # Increment fork counter
    tmpl.fork_count += 1
    await db.commit()

    # Create new CallSpec for the user
    new_slug = f"{tmpl.code}-fork-{str(ulid.new())[:4].lower()}"
    new_spec = await Repository.create_call_spec(
        db=db,
        user_id=user_id,
        name=f"{tmpl.name} (Fork)",
        slug=new_slug,
        description=f"Forked from Marketplace template: {tmpl.name}",
        response_schema=tmpl.response_schema,
        system_prompt=tmpl.system_prompt,
    )

    return {
        "message": f"Successfully forked '{tmpl.name}' into your Call Specs catalog!",
        "fork_count": tmpl.fork_count,
        "spec": new_spec,
    }


@router.post("/templates/{template_id}/like")
async def toggle_like_template(
    template_id: str,
    user_id: str = "usr_default_dev_01",
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    stmt = select(Template).where(Template.id == template_id)
    res = await db.execute(stmt)
    tmpl = res.scalar_one_or_none()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")

    like_stmt = select(TemplateLike).where(TemplateLike.template_id == template_id, TemplateLike.user_id == user_id)
    like_res = await db.execute(like_stmt)
    existing_like = like_res.scalar_one_or_none()

    if existing_like:
        await db.delete(existing_like)
        tmpl.likes_count = max(0, tmpl.likes_count - 1)
        is_liked = False
    else:
        new_like = TemplateLike(template_id=template_id, user_id=user_id)
        db.add(new_like)
        tmpl.likes_count += 1
        is_liked = True

    await db.commit()
    return {
        "is_liked": is_liked,
        "likes_count": tmpl.likes_count,
    }


@router.get("/templates/{template_id}/comments")
async def list_template_comments(
    template_id: str,
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        return []

    stmt = select(TemplateComment).where(TemplateComment.template_id == template_id).order_by(desc(TemplateComment.created_at))
    res = await db.execute(stmt)
    comments = res.scalars().all()

    return [
        {
            "id": c.id,
            "templateId": c.template_id,
            "userId": c.user_id,
            "authorName": c.author_name,
            "rating": c.rating,
            "comment": c.comment,
            "createdAt": c.created_at.isoformat() if c.created_at else None,
        }
        for c in comments
    ]


@router.post("/templates/{template_id}/comments")
async def add_template_comment(
    template_id: str,
    payload: AddCommentRequest,
    user_id: str = "usr_default_dev_01",
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    stmt = select(Template).where(Template.id == template_id)
    res = await db.execute(stmt)
    tmpl = res.scalar_one_or_none()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")

    cmt_id = f"cmt_{str(ulid.new())}"
    new_cmt = TemplateComment(
        id=cmt_id,
        template_id=template_id,
        user_id=user_id,
        author_name=payload.author_name or "Developer User",
        rating=payload.rating,
        comment=payload.comment.strip(),
    )
    db.add(new_cmt)

    # Recalculate average rating & reviews count
    tmpl.reviews_count += 1
    c_stmt = select(TemplateComment.rating).where(TemplateComment.template_id == template_id)
    c_res = await db.execute(c_stmt)
    all_ratings = list(c_res.scalars().all()) + [payload.rating]
    tmpl.rating_avg = round(sum(all_ratings) / len(all_ratings), 2)

    await db.commit()
    await db.refresh(new_cmt)

    return {
        "id": new_cmt.id,
        "authorName": new_cmt.author_name,
        "rating": new_cmt.rating,
        "comment": new_cmt.comment,
        "createdAt": new_cmt.created_at.isoformat() if new_cmt.created_at else None,
        "ratingAvg": float(tmpl.rating_avg) if tmpl.rating_avg is not None else 5.0,
        "reviewsCount": tmpl.reviews_count,
    }


class UpdatePublicationRequest(BaseModel):
    is_published: bool = Field(True, description="Whether to publish or unpublish this spec")
    name: Optional[str] = Field(None, description="Public display title")
    category: Optional[str] = Field(None, description="Category tag")
    description: Optional[str] = Field(None, description="Rich Markdown documentation file content")


@router.get("/specs/{spec_id}/publication")
async def get_spec_publication(
    spec_id: str,
    user_id: str = "usr_default_dev_01",
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    spec_data = await Repository.get_call_spec(db, user_id, spec_id)
    if not spec_data:
        raise HTTPException(status_code=404, detail="Call Spec not found")

    stmt = select(CallSpec).where(CallSpec.id == spec_id)
    res = await db.execute(stmt)
    spec_obj = res.scalar_one_or_none()
    if not spec_obj:
        raise HTTPException(status_code=404, detail="Call Spec not found")

    published_tmpl = None
    comments = []
    if spec_obj.published_template_id:
        t_stmt = select(Template).where(Template.id == spec_obj.published_template_id)
        t_res = await db.execute(t_stmt)
        tmpl_obj = t_res.scalar_one_or_none()
        if tmpl_obj:
            published_tmpl = {
                "id": tmpl_obj.id,
                "code": tmpl_obj.code,
                "name": tmpl_obj.name,
                "description": tmpl_obj.description or f"# {tmpl_obj.name}\n\n## Overview\nNo description provided.\n\n## Usage Guide\nExecute this schema directly using Callcraft vision data plane.",
                "category": tmpl_obj.category,
                "forkCount": tmpl_obj.fork_count,
                "likesCount": tmpl_obj.likes_count,
                "ratingAvg": float(tmpl_obj.rating_avg) if tmpl_obj.rating_avg is not None else 5.0,
                "reviewsCount": tmpl_obj.reviews_count,
                "createdAt": tmpl_obj.created_at.isoformat() if tmpl_obj.created_at else None,
            }

            c_stmt = select(TemplateComment).where(TemplateComment.template_id == tmpl_obj.id).order_by(desc(TemplateComment.created_at))
            c_res = await db.execute(c_stmt)
            comments = [
                {
                    "id": c.id,
                    "templateId": c.template_id,
                    "userId": c.user_id,
                    "authorName": c.author_name,
                    "rating": c.rating,
                    "comment": c.comment,
                    "createdAt": c.created_at.isoformat() if c.created_at else None,
                }
                for c in c_res.scalars().all()
            ]

    return {
        "spec": {
            "id": spec_obj.id,
            "name": spec_obj.name,
            "slug": spec_obj.slug,
            "description": spec_obj.description,
            "isPublished": spec_obj.is_published,
            "publishedTemplateId": spec_obj.published_template_id,
            "responseSchema": spec_data.get("response_schema", {}),
            "systemPrompt": spec_data.get("system_prompt", ""),
        },
        "template": published_tmpl,
        "comments": comments,
    }


@router.post("/specs/{spec_id}/publication")
async def update_spec_publication(
    spec_id: str,
    payload: UpdatePublicationRequest,
    user_id: str = "usr_default_dev_01",
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
            template_id = f"tmpl_{str(ulid.new())}"
            tmpl_obj = Template(
                id=template_id,
                user_id=user_id,
                code=f"{spec_obj.slug}-pub",
                name=payload.name or spec_obj.name,
                description=payload.description or f"# {payload.name or spec_obj.name}\n\n{spec_obj.description or ''}",
                category=(payload.category or "custom").lower(),
                request_schema=safe_spec_data.get("request_schema", {"properties": {"image": {"type": "string"}}}),
                response_schema=safe_spec_data.get("response_schema", {}),
                system_prompt=safe_spec_data.get("system_prompt") or "Extract all structured fields accurately.",
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
            
            tmpl_obj.response_schema = safe_spec_data.get("response_schema", tmpl_obj.response_schema)
            tmpl_obj.system_prompt = safe_spec_data.get("system_prompt") or tmpl_obj.system_prompt
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
        "is_published": spec_obj.is_published,
        "published_template_id": spec_obj.published_template_id,
    }


@router.delete("/templates/comments/{comment_id}")
async def delete_template_comment(
    comment_id: str,
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    stmt = select(TemplateComment).where(TemplateComment.id == comment_id)
    res = await db.execute(stmt)
    cmt = res.scalar_one_or_none()
    if not cmt:
        raise HTTPException(status_code=404, detail="Comment not found")

    tmpl_id = cmt.template_id
    await db.delete(cmt)

    t_stmt = select(Template).where(Template.id == tmpl_id)
    t_res = await db.execute(t_stmt)
    tmpl = t_res.scalar_one_or_none()
    if tmpl:
        tmpl.reviews_count = max(0, tmpl.reviews_count - 1)
        c_stmt = select(TemplateComment.rating).where(TemplateComment.template_id == tmpl_id)
        c_res = await db.execute(c_stmt)
        all_ratings = list(c_res.scalars().all())
        if all_ratings:
            tmpl.rating_avg = round(sum(all_ratings) / len(all_ratings), 2)
        else:
            tmpl.rating_avg = 5.00

    await db.commit()
    return {"message": "Comment deleted successfully!"}


# --- API Credentials & Logs Endpoints ---

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


class VerifyProviderKeyRequest(BaseModel):
    provider: str = Field(..., description="Provider code: gemini, openai, anthropic, or deepseek")
    api_key: str = Field(..., description="API key to verify against provider endpoint")


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
                if resp.status_code == 200:
                    return {
                        "valid": True,
                        "status_code": 200,
                        "message": "Google Gemini API Key verified successfully! Models endpoint responded 200 OK.",
                    }
                else:
                    err_msg = resp.json().get("error", {}).get("message", resp.text)
                    return {
                        "valid": False,
                        "status_code": resp.status_code,
                        "message": f"Google Gemini API Key test failed ({resp.status_code}): {err_msg}",
                    }
            elif provider == "openai":
                url = "https://api.openai.com/v1/models"
                headers = {"Authorization": f"Bearer {key}"}
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    return {
                        "valid": True,
                        "status_code": 200,
                        "message": "OpenAI API Key verified successfully! Models endpoint responded 200 OK.",
                    }
                else:
                    err_msg = resp.json().get("error", {}).get("message", resp.text)
                    return {
                        "valid": False,
                        "status_code": resp.status_code,
                        "message": f"OpenAI API Key test failed ({resp.status_code}): {err_msg}",
                    }
            elif provider == "anthropic":
                url = "https://api.anthropic.com/v1/models"
                headers = {
                    "x-api-key": key,
                    "anthropic-version": "2023-06-01",
                }
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    return {
                        "valid": True,
                        "status_code": 200,
                        "message": "Anthropic API Key verified successfully! Models endpoint responded 200 OK.",
                    }
                else:
                    err_msg = resp.json().get("error", {}).get("message", resp.text)
                    return {
                        "valid": False,
                        "status_code": resp.status_code,
                        "message": f"Anthropic API Key test failed ({resp.status_code}): {err_msg}",
                    }
            elif provider in ("deepseek", "ocr"):
                url = "https://api.deepseek.com/models"
                headers = {"Authorization": f"Bearer {key}"}
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    return {
                        "valid": True,
                        "status_code": 200,
                        "message": "DeepSeek API Key verified successfully! Models endpoint responded 200 OK.",
                    }
                else:
                    err_msg = resp.json().get("error", {}).get("message", resp.text)
                    return {
                        "valid": False,
                        "status_code": resp.status_code,
                        "message": f"DeepSeek API Key test failed ({resp.status_code}): {err_msg}",
                    }
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")
        except httpx.RequestError as exc:
            return {
                "valid": False,
                "status_code": 500,
                "message": f"Connection network error while testing {provider} key: {str(exc)}",
            }
