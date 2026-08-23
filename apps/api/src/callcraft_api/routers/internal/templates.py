import ulid
from typing import Optional
from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, desc, func
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from callcraft_api.db.models import (
    CallSpec,
    CallSpecVersion,
    Template,
    TemplateLike,
    TemplateComment,
    User,
)
from callcraft_api.db.repository import Repository
from callcraft_api.db.session import get_db_session
from callcraft_api.routers.internal._deps import router, get_current_user_id


class PublishTemplateRequest(BaseModel):
    call_spec_id: str = Field(..., description="ID of Call Spec to publish")
    code: str = Field(..., description="Unique template code identifier")
    name: str = Field(..., description="Public template display name")
    description: Optional[str] = Field(None)
    category: str = Field(..., description="Category tag")


class AddCommentRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="1 to 5 star rating")
    comment: str = Field(..., description="Review comment text")
    author_name: Optional[str] = Field(None, description="Author display name")


@router.get("/templates")
async def list_templates(
    category: Optional[str] = None,
    search: Optional[str] = None,
    sort: Optional[str] = None,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    stmt = select(Template).options(joinedload(Template.user)).where(Template.is_published == True)

    if sort == "popular":
        stmt = stmt.order_by(desc(Template.fork_count), desc(Template.likes_count))
    elif sort == "rating":
        stmt = stmt.order_by(desc(Template.rating_avg), desc(Template.reviews_count))
    elif sort == "newest":
        stmt = stmt.order_by(desc(Template.created_at))

    res = await db.execute(stmt)
    templates = res.scalars().all()

    if category and category.lower() != "all":
        cat_lower = category.lower()
        templates = [
            t for t in templates
            if cat_lower in t.category.lower() or any(cat_lower in c.lower() for c in (t.categories or []))
        ]

    if search:
        s_lower = search.lower()
        templates = [
            t for t in templates
            if s_lower in t.name.lower()
            or s_lower in (t.description or "").lower()
            or s_lower in t.category.lower()
            or any(s_lower in c.lower() for c in (t.categories or []))
        ]

    like_stmt = select(TemplateLike.template_id).where(TemplateLike.user_id == user_id)
    like_res = await db.execute(like_stmt)
    liked_ids = set(like_res.scalars().all())

    spec_stmt = select(CallSpec.id, CallSpec.published_template_id).where(
        CallSpec.published_template_id.isnot(None)
    )
    spec_res = await db.execute(spec_stmt)
    spec_map = {pub_tmpl_id: spec_id for spec_id, pub_tmpl_id in spec_res.all()}

    comment_count_stmt = select(
        TemplateComment.template_id, func.count(TemplateComment.id)
    ).group_by(TemplateComment.template_id)
    comment_count_res = await db.execute(comment_count_stmt)
    comment_counts = {tmpl_id: cnt for tmpl_id, cnt in comment_count_res.all()}

    out = []
    for t in templates:
        author_name = t.user.full_name if t.user else ""
        cats = t.categories if t.categories else [t.category]
        out.append({
            "id": t.id,
            "specId": spec_map.get(t.id, t.id),
            "userId": t.user_id or "",
            "authorName": author_name,
            "code": t.code,
            "name": t.name,
            "description": t.description,
            "category": t.category,
            "categories": cats,
            "isOfficial": t.is_official,
            "isPublished": t.is_published,
            "forkCount": t.fork_count,
            "likesCount": t.likes_count,
            "ratingAvg": t.rating_avg,
            "reviewsCount": t.reviews_count,
            "commentsCount": comment_counts.get(t.id, 0),
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
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    spec_stmt = select(CallSpec).where(CallSpec.id == payload.call_spec_id, CallSpec.user_id == user_id)
    spec_res = await db.execute(spec_stmt)
    spec = spec_res.scalar_one_or_none()
    if not spec:
        raise HTTPException(status_code=404, detail="Call Spec tidak ditemukan")

    ver_stmt = select(CallSpecVersion).where(
        CallSpecVersion.call_spec_id == spec.id,
        CallSpecVersion.version_number == spec.active_version_number,
    )
    ver_res = await db.execute(ver_stmt)
    ver = ver_res.scalar_one_or_none()
    if not ver:
        raise HTTPException(status_code=400, detail="Call Spec tidak memiliki versi aktif")

    cat_main = payload.category.lower().strip()
    tmpl = Template(
        id=f"tmpl_{str(ulid.new())}",
        user_id=user_id,
        code=payload.code.lower().strip(),
        name=payload.name.strip(),
        description=payload.description or spec.description,
        category=cat_main,
        categories=[cat_main, "community", "custom"],
        request_schema=ver.request_schema,
        response_schema=ver.response_schema,
        system_prompt=ver.system_prompt,
        extraction_prompt=ver.extraction_prompt,
        is_official=False,
        is_published=True,
    )
    db.add(tmpl)
    await db.flush()

    spec.is_published = True
    spec.published_template_id = tmpl.id
    await db.commit()

    return {"message": "Spec berhasil dipublikasikan ke Marketplace", "templateId": tmpl.id}


@router.get("/templates/{template_id}")
async def get_template_detail(
    template_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    stmt = select(Template).options(joinedload(Template.user)).where(
        (Template.id == template_id) | (Template.code == template_id)
    )
    res = await db.execute(stmt)
    tmpl = res.scalar_one_or_none()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template tidak ditemukan")

    like_stmt = select(TemplateLike.template_id).where(
        TemplateLike.user_id == user_id,
        TemplateLike.template_id == tmpl.id
    )
    like_res = await db.execute(like_stmt)
    is_liked = like_res.scalar_one_or_none() is not None

    spec_stmt = select(CallSpec.id).where(CallSpec.published_template_id == tmpl.id)
    spec_res = await db.execute(spec_stmt)
    spec_id = spec_res.scalar_one_or_none()

    author_name = tmpl.user.full_name if tmpl.user else ""
    cats = tmpl.categories if tmpl.categories else [tmpl.category]

    comment_count_stmt = select(func.count(TemplateComment.id)).where(TemplateComment.template_id == tmpl.id)
    comment_count_res = await db.execute(comment_count_stmt)
    real_comment_count = comment_count_res.scalar_one_or_none() or 0

    return {
        "id": tmpl.id,
        "specId": spec_id or tmpl.id,
        "userId": tmpl.user_id or "",
        "authorName": author_name,
        "code": tmpl.code,
        "name": tmpl.name,
        "description": tmpl.description,
        "category": tmpl.category,
        "categories": cats,
        "isOfficial": tmpl.is_official,
        "isPublished": tmpl.is_published,
        "forkCount": tmpl.fork_count,
        "likesCount": tmpl.likes_count,
        "ratingAvg": tmpl.rating_avg,
        "reviewsCount": tmpl.reviews_count,
        "commentsCount": real_comment_count,
        "isLiked": is_liked,
        "requestSchema": tmpl.request_schema,
        "responseSchema": tmpl.response_schema,
        "systemPrompt": tmpl.system_prompt,
        "extractionPrompt": tmpl.extraction_prompt,
        "createdAt": tmpl.created_at.isoformat() if tmpl.created_at else None,
    }


@router.post("/templates/{template_id}/fork")
async def fork_template_to_spec(
    template_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    stmt = select(Template).where(Template.id == template_id)
    res = await db.execute(stmt)
    tmpl = res.scalar_one_or_none()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")

    if tmpl.user_id and tmpl.user_id == user_id:
        raise HTTPException(
            status_code=400,
            detail="Anda tidak dapat meng-clone template yang Anda buat sendiri."
        )

    tmpl.fork_count += 1
    await db.commit()

    random_suffix = str(ulid.new()).lower()[-8:]
    new_slug = f"{tmpl.code}-clone-{random_suffix}"

    new_spec = await Repository.create_call_spec(
        db=db,
        user_id=user_id,
        name=f"{tmpl.name} (Clone)",
        slug=new_slug,
        description=f"Cloned from Marketplace template: {tmpl.name}",
        response_schema=tmpl.response_schema,
        system_prompt=tmpl.system_prompt,
    )

    return {
        "message": f"Successfully forked '{tmpl.name}' into your Call Specs catalog!",
        "forkCount": tmpl.fork_count,
        "spec": new_spec,
    }


@router.post("/templates/{template_id}/like")
async def toggle_like_template(
    template_id: str,
    user_id: str = Depends(get_current_user_id),
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
        "isLiked": is_liked,
        "likesCount": tmpl.likes_count,
    }


@router.get("/templates/{template_id}/comments")
async def list_template_comments(
    template_id: str,
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    stmt = select(TemplateComment).where(
        TemplateComment.template_id == template_id
    ).order_by(desc(TemplateComment.created_at))
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
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    stmt = select(Template).where(Template.id == template_id)
    res = await db.execute(stmt)
    tmpl = res.scalar_one_or_none()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")

    author_name = payload.author_name
    if not author_name:
        u_stmt = select(User).where(User.id == user_id)
        u_res = await db.execute(u_stmt)
        u_obj = u_res.scalar_one_or_none()
        author_name = u_obj.full_name if u_obj else ""

    cmt_id = f"cmt_{str(ulid.new())}"
    new_cmt = TemplateComment(
        id=cmt_id,
        template_id=template_id,
        user_id=user_id,
        author_name=author_name,
        rating=payload.rating,
        comment=payload.comment.strip(),
    )
    db.add(new_cmt)

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
        "ratingAvg": tmpl.rating_avg,
        "reviewsCount": tmpl.reviews_count,
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
            tmpl.rating_avg = 0.0

    await db.commit()
    return {"message": "Comment deleted successfully!"}
