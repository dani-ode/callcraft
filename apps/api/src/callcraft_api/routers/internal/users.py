from datetime import datetime, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, desc
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from callcraft_api.db.models import Template, TemplateLike, User
from callcraft_api.db.session import get_db_session
from callcraft_api.routers.internal._deps import router, get_current_user_id


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    github_url: Optional[str] = None
    website_url: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    new_password: Optional[str] = None


class UpdateUserStatusRequest(BaseModel):
    status: str = Field(..., description="active, pending_verification, suspended, or disabled")


class CloseAccountRequest(BaseModel):
    password: str = Field(..., description="Password konfirmasi untuk penutupan akun")


@router.get("/users/me")
async def get_current_user_profile(
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user_obj = res.scalar_one_or_none()
    if not user_obj:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesi pengguna tidak terdaftar di sistem. Silakan login kembali.",
        )

    return {
        "id": user_obj.id,
        "fullName": user_obj.full_name,
        "email": user_obj.email,
        "status": user_obj.status,
        "bio": user_obj.bio,
        "avatarUrl": user_obj.avatar_url,
        "githubUrl": user_obj.github_url,
        "websiteUrl": user_obj.website_url,
        "company": user_obj.company,
        "location": user_obj.location,
        "phone": user_obj.phone,
        "emailVerifiedAt": user_obj.email_verified_at.isoformat() if user_obj.email_verified_at else None,
        "createdAt": user_obj.created_at.isoformat() if user_obj.created_at else None,
    }


@router.get("/users/{target_user_id}/profile")
async def get_user_profile(
    target_user_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    stmt = select(User).where(User.id == target_user_id)
    res = await db.execute(stmt)
    user_obj = res.scalar_one_or_none()
    if not user_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profil pengguna tidak ditemukan")

    tmpl_stmt = select(Template).options(joinedload(Template.user)).where(
        Template.user_id == target_user_id,
        Template.is_published == True
    ).order_by(desc(Template.created_at))
    tmpl_res = await db.execute(tmpl_stmt)
    templates = tmpl_res.scalars().all()

    like_stmt = select(TemplateLike.template_id).where(TemplateLike.user_id == user_id)
    like_res = await db.execute(like_stmt)
    liked_ids = set(like_res.scalars().all())

    total_clones = sum(t.fork_count for t in templates)
    total_likes = sum(t.likes_count for t in templates)

    tmpl_list = []
    for t in templates:
        tmpl_list.append({
            "id": t.id,
            "userId": t.user_id,
            "authorName": user_obj.full_name,
            "code": t.code,
            "name": t.name,
            "description": t.description,
            "category": t.category,
            "isOfficial": t.is_official,
            "isPublished": t.is_published,
            "forkCount": t.fork_count,
            "likesCount": t.likes_count,
            "ratingAvg": t.rating_avg,
            "reviewsCount": t.reviews_count,
            "isLiked": t.id in liked_ids,
            "requestSchema": t.request_schema,
            "responseSchema": t.response_schema,
            "positivePrompt": t.positive_prompt,
            "negativePrompt": t.negative_prompt,
            "createdAt": t.created_at.isoformat() if t.created_at else None,
        })

    return {
        "id": user_obj.id,
        "fullName": user_obj.full_name,
        "email": user_obj.email,
        "status": user_obj.status,
        "role": user_obj.role if hasattr(user_obj, "role") else None,
        "totalPublishedTemplates": len(templates),
        "totalClones": total_clones,
        "totalLikes": total_likes,
        "templates": tmpl_list,
    }


@router.put("/users/profile")
async def update_user_profile(
    payload: UpdateProfileRequest,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user_obj = res.scalar_one_or_none()
    if not user_obj:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.full_name and payload.full_name.strip():
        user_obj.full_name = payload.full_name.strip()
    if payload.bio is not None:
        user_obj.bio = payload.bio.strip() if payload.bio else None
    if payload.avatar_url is not None:
        user_obj.avatar_url = payload.avatar_url.strip() if payload.avatar_url else None
    if payload.github_url is not None:
        user_obj.github_url = payload.github_url.strip() if payload.github_url else None
    if payload.website_url is not None:
        user_obj.website_url = payload.website_url.strip() if payload.website_url else None
    if payload.company is not None:
        user_obj.company = payload.company.strip() if payload.company else None
    if payload.location is not None:
        user_obj.location = payload.location.strip() if payload.location else None
    if payload.phone is not None:
        user_obj.phone = payload.phone.strip() if payload.phone else None

    if payload.new_password and len(payload.new_password) >= 6:
        from callcraft_api.routers.auth import hash_password
        user_obj.password_hash = hash_password(payload.new_password)

    await db.commit()
    await db.refresh(user_obj)

    return {
        "message": "Profil berhasil diperbarui!",
        "user": {
            "id": user_obj.id,
            "fullName": user_obj.full_name,
            "email": user_obj.email,
            "status": user_obj.status,
            "bio": user_obj.bio,
            "avatarUrl": user_obj.avatar_url,
            "githubUrl": user_obj.github_url,
            "websiteUrl": user_obj.website_url,
            "company": user_obj.company,
            "location": user_obj.location,
            "phone": user_obj.phone,
        },
    }


@router.post("/users/me/close-account")
async def close_current_user_account(
    payload: CloseAccountRequest,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user_obj = res.scalar_one_or_none()
    if not user_obj:
        raise HTTPException(status_code=404, detail="Akun pengguna tidak ditemukan")

    if not payload.password or not payload.password.strip():
        raise HTTPException(status_code=400, detail="Password konfirmasi wajib diisi untuk menutup akun.")

    from callcraft_api.routers.auth import verify_password
    from callcraft_engine.crypto import verify_secret_argon2

    is_valid = False
    if user_obj.password_hash:
        try:
            is_valid = verify_password(payload.password, user_obj.password_hash)
            if not is_valid:
                is_valid = verify_secret_argon2(payload.password, user_obj.password_hash)
        except Exception:
            is_valid = False

    if not is_valid:
        raise HTTPException(status_code=400, detail="Password konfirmasi salah. Penutupan akun dibatalkan.")

    await db.delete(user_obj)
    await db.commit()

    return {"message": "Akun Anda berhasil ditutup dan seluruh data telah dihapus secara permanen dari sistem."}


@router.put("/admin/users/{target_user_id}/status")
async def update_user_status_by_admin(
    target_user_id: str,
    payload: UpdateUserStatusRequest,
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    new_status = payload.status.lower().strip()
    if new_status not in ["active", "pending_verification", "suspended", "disabled"]:
        raise HTTPException(status_code=400, detail="Status user tidak valid")

    stmt = select(User).where(User.id == target_user_id)
    res = await db.execute(stmt)
    user_obj = res.scalar_one_or_none()
    if not user_obj:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    user_obj.status = new_status
    if new_status == "active" and not user_obj.email_verified_at:
        user_obj.email_verified_at = datetime.now(timezone.utc)

    await db.commit()
    return {
        "message": f"Status user '{user_obj.full_name}' berhasil diubah menjadi '{new_status}'!",
        "status": new_status,
    }


@router.put("/admin/users/{target_user_id}/verify")
async def verify_user_by_admin(
    target_user_id: str,
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    stmt = select(User).where(User.id == target_user_id)
    res = await db.execute(stmt)
    user_obj = res.scalar_one_or_none()
    if not user_obj:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    user_obj.status = "active"
    user_obj.email_verified_at = datetime.now(timezone.utc)
    user_obj.email_verification_token = None
    await db.commit()

    return {
        "message": f"Email pengguna '{user_obj.full_name}' berhasil diverifikasi secara manual oleh Admin!",
        "status": "active",
    }
