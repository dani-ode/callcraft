import logging
import secrets
import urllib.parse
from datetime import datetime, timezone
from typing import Optional

import httpx
import ulid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from callcraft_api.config import settings
from callcraft_api.db.models import User
from callcraft_api.db.session import get_db_session
from callcraft_api.services.redis_cache import redis_service

logger = logging.getLogger("callcraft.auth.google")

router = APIRouter(prefix="/internal/v1/auth/google", tags=["Google Authentication"])


class GoogleExchangeRequest(BaseModel):
    code: str = Field(..., description="One-time OAuth exchange code from backend redirect")


@router.get("/url")
async def get_google_auth_url():
    """Generates the Google OAuth 2.0 consent URL with CSRF state protection."""
    if not settings.google_client_id or not settings.google_redirect_uri:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth is not configured on this server.",
        )

    state = secrets.token_urlsafe(32)
    await redis_service.set_oauth_state(state, ttl=600)

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "select_account",
    }
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"

    return {
        "url": auth_url,
        "state": state,
    }


@router.get("/callback")
async def google_auth_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    """Direct landing callback for Google OAuth 2.0. Exchanges code, manages user record, and redirects with one-time exchange token."""
    frontend_url = settings.resolved_frontend_url

    if error:
        logger.warning(f"Google OAuth callback received error: {error} ({error_description})")
        err_param = urllib.parse.quote(error_description or error)
        return RedirectResponse(f"{frontend_url}/login?error={err_param}", status_code=status.HTTP_302_FOUND)

    if not code or not state:
        logger.warning("Google OAuth callback missing code or state parameters")
        return RedirectResponse(f"{frontend_url}/login?error=missing_oauth_parameters", status_code=status.HTTP_302_FOUND)

    # Validate CSRF state from cache
    is_valid_state = await redis_service.verify_and_consume_oauth_state(state)
    if not is_valid_state:
        logger.warning(f"Invalid or expired OAuth state received: {state}")
        return RedirectResponse(f"{frontend_url}/login?error=invalid_or_expired_state", status_code=status.HTTP_302_FOUND)

    if not settings.google_client_id or not settings.google_client_secret or not settings.google_redirect_uri:
        logger.error("Google OAuth client configuration incomplete")
        return RedirectResponse(f"{frontend_url}/login?error=oauth_configuration_error", status_code=status.HTTP_302_FOUND)

    # Exchange authorization code for Google access token
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            token_res = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "redirect_uri": settings.google_redirect_uri,
                    "grant_type": "authorization_code",
                },
                headers={"Accept": "application/json"},
            )

            if token_res.status_code != 200:
                logger.error(f"Google token exchange failed HTTP {token_res.status_code}: {token_res.text}")
                return RedirectResponse(f"{frontend_url}/login?error=token_exchange_failed", status_code=status.HTTP_302_FOUND)

            token_data = token_res.json()
            access_token = token_data.get("access_token")
            if not access_token:
                logger.error("No access_token returned by Google token endpoint")
                return RedirectResponse(f"{frontend_url}/login?error=missing_access_token", status_code=status.HTTP_302_FOUND)

            # Fetch Google user profile
            userinfo_res = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )

            if userinfo_res.status_code != 200:
                logger.error(f"Google userinfo request failed HTTP {userinfo_res.status_code}: {userinfo_res.text}")
                return RedirectResponse(f"{frontend_url}/login?error=userinfo_fetch_failed", status_code=status.HTTP_302_FOUND)

            profile = userinfo_res.json()
    except Exception as e:
        logger.error(f"Exception during Google OAuth communication: {e}")
        return RedirectResponse(f"{frontend_url}/login?error=oauth_communication_error", status_code=status.HTTP_302_FOUND)

    email = profile.get("email", "").strip().lower()
    email_verified = profile.get("email_verified", False)
    full_name = profile.get("name", "").strip() or email.split("@")[0]
    picture = profile.get("picture")

    if not email or not email_verified:
        logger.warning(f"Google profile email not verified: {email}")
        return RedirectResponse(f"{frontend_url}/login?error=unverified_google_email", status_code=status.HTTP_302_FOUND)

    if not db:
        logger.error("Database session unavailable during Google OAuth callback")
        return RedirectResponse(f"{frontend_url}/login?error=database_unavailable", status_code=status.HTTP_302_FOUND)

    # Search user by email
    stmt = select(User).where(User.email == email)
    res = await db.execute(stmt)
    user_obj = res.scalar_one_or_none()

    if user_obj:
        if user_obj.status in ["suspended", "disabled"]:
            logger.warning(f"Suspended user attempted Google login: {email} (status: {user_obj.status})")
            return RedirectResponse(f"{frontend_url}/login?error=account_suspended", status_code=status.HTTP_302_FOUND)

        # Auto-activate pending verification accounts on successful Google login
        if user_obj.status == "pending_verification":
            user_obj.status = "active"
            user_obj.email_verified_at = datetime.now(timezone.utc)
            user_obj.email_verification_token = None

        # Update avatar if missing
        if not user_obj.avatar_url and picture:
            user_obj.avatar_url = picture

        await db.commit()
        user_id = user_obj.id
    else:
        # Register new user
        user_id = f"usr_{str(ulid.new())}"
        unusable_pw_hash = f"pbkdf2_sha256$oauth$google_{secrets.token_hex(32)}"

        new_user = User(
            id=user_id,
            email=email,
            password_hash=unusable_pw_hash,
            full_name=full_name,
            status="active",
            email_verified_at=datetime.now(timezone.utc),
            avatar_url=picture,
        )
        db.add(new_user)
        await db.commit()
        logger.info(f"Registered new user via Google OAuth: {email} ({user_id})")

    # Issue secure 60s single-use exchange code to prevent raw ID leakage in browser history
    exchange_code = secrets.token_urlsafe(32)
    await redis_service.set_oauth_exchange(exchange_code, user_id, ttl=60)

    redirect_target = f"{frontend_url}/auth/callback?code={urllib.parse.quote(exchange_code)}"
    return RedirectResponse(redirect_target, status_code=status.HTTP_302_FOUND)


@router.post("/exchange")
async def exchange_google_code(
    payload: GoogleExchangeRequest,
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    """Exchanges a one-time OAuth exchange code for the full authenticated user session."""
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    exchange_code = payload.code.strip()
    if not exchange_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Exchange code is required")

    user_id = await redis_service.verify_and_consume_oauth_exchange(exchange_code)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kode autentikasi Google tidak valid atau telah kedaluwarsa. Silakan login kembali.",
        )

    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user_obj = res.scalar_one_or_none()

    if not user_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found")

    if user_obj.status in ["suspended", "disabled"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Akun Anda dinonaktifkan (status: {user_obj.status}). Hubungi administrator.",
        )

    # Return session in camelCase format adhering to project rules
    return {
        "id": user_obj.id,
        "name": user_obj.full_name,
        "email": user_obj.email,
        "role": "developer",
        "status": user_obj.status,
        "bio": user_obj.bio,
        "avatar": user_obj.avatar_url or user_obj.full_name[:2].upper(),
        "githubUrl": user_obj.github_url,
        "websiteUrl": user_obj.website_url,
        "company": user_obj.company,
        "location": user_obj.location,
        "phone": user_obj.phone,
    }
