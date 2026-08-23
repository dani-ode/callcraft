import hashlib
import hmac
import os
import random
import secrets
import ulid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from callcraft_api.db.models import User, AppInit
from callcraft_api.db.session import get_db_session
from callcraft_api.services.email import send_verification_email

router = APIRouter(prefix="/internal/v1/auth", tags=["Authentication"])


def hash_password(password: str) -> str:
    """Hashes a password using PBKDF2-HMAC-SHA256 with 100,000 iterations."""
    salt = os.urandom(16)
    pw_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return f"pbkdf2_sha256${salt.hex()}${pw_hash.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    """Verifies a password against a stored PBKDF2-HMAC-SHA256 hash."""
    try:
        parts = password_hash.split("$")
        if len(parts) != 3 or parts[0] != "pbkdf2_sha256":
            return False
        salt = bytes.fromhex(parts[1])
        expected_hash = bytes.fromhex(parts[2])
        pw_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
        return hmac.compare_digest(pw_hash, expected_hash)
    except Exception:
        return False


class RegisterRequest(BaseModel):
    name: str = Field(..., description="User full name")
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="Password min 6 characters")


class LoginRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="Password")


class VerifyEmailRequest(BaseModel):
    email: Optional[str] = None
    token: Optional[str] = None
    otp: Optional[str] = None


class ResendVerificationRequest(BaseModel):
    email: str


@router.post("/register")
async def register_user(
    payload: RegisterRequest,
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    clean_email = payload.email.strip().lower()

    # Check if user already exists (Do not allow re-registering an existing email)
    stmt = select(User).where(User.email == clean_email)
    res = await db.execute(stmt)
    existing_user = res.scalar_one_or_none()
    if existing_user:
        if existing_user.status == "pending_verification":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email ini sudah terdaftar namun belum diverifikasi. Silakan periksa inbox email Anda atau klik Kirim Ulang Link Verifikasi.",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email ini sudah terdaftar dan aktif. Silakan login ke akun Anda.",
            )

    # Check AppInit registration settings
    app_stmt = select(AppInit).where(AppInit.id == "app_01HZX01INIT00000000001")
    app_res = await db.execute(app_stmt)
    app_init = app_res.scalar_one_or_none()

    default_status = app_init.default_registration_status if app_init and hasattr(app_init, "default_registration_status") else "pending_verification"
    require_verification = app_init.require_email_verification if app_init and hasattr(app_init, "require_email_verification") else True

    user_id = f"usr_{str(ulid.new())}"
    password_hash = hash_password(payload.password)

    # Generate activation token
    token = secrets.token_hex(32)

    user_status = "pending_verification" if require_verification else default_status
    email_verified_at = datetime.now(timezone.utc) if not require_verification else None

    new_user = User(
        id=user_id,
        email=clean_email,
        password_hash=password_hash,
        full_name=payload.name.strip(),
        status=user_status,
        email_verified_at=email_verified_at,
        email_verification_token=token,
    )
    db.add(new_user)
    await db.commit()

    # Send verification email asynchronously
    email_sent = False
    if require_verification:
        email_sent = send_verification_email(clean_email, payload.name.strip(), token)

    return {
        "id": new_user.id,
        "name": new_user.full_name,
        "email": new_user.email,
        "role": "developer",
        "status": new_user.status,
        "requireVerification": require_verification and new_user.status == "pending_verification",
        "emailSent": email_sent,
    }


@router.post("/verify-email")
async def verify_email(
    payload: VerifyEmailRequest,
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    user_obj = None

    if payload.email and payload.email.strip():
        clean_email = payload.email.strip().lower()
        stmt = select(User).where(User.email == clean_email)
        res = await db.execute(stmt)
        user_obj = res.scalar_one_or_none()

    if not user_obj and payload.token and payload.token.strip():
        stmt = select(User).where(User.email_verification_token == payload.token.strip())
        res = await db.execute(stmt)
        user_obj = res.scalar_one_or_none()

    if not user_obj:
        raise HTTPException(
            status_code=400,
            detail="Pengguna atau link verifikasi tidak ditemukan di sistem. Silakan periksa kembali email Anda atau lakukan pendaftaran.",
        )

    # 1. Check if email is already verified (email_verified_at logic)
    if user_obj.email_verified_at is not None:
        return {
            "message": "Email Anda sudah terverifikasi sebelumnya. Silakan langsung login ke akun Anda.",
            "user": {
                "id": user_obj.id,
                "name": user_obj.full_name,
                "email": user_obj.email,
                "role": "developer",
                "status": user_obj.status,
            },
        }

    # 2. Check account status (status logic)
    if user_obj.status in ["suspended", "disabled"]:
        raise HTTPException(
            status_code=403,
            detail=f"Akun Anda berstatus '{user_obj.status}'. Hubungi administrator.",
        )

    # Verify via token or OTP
    valid = False
    stored_token = user_obj.email_verification_token or ""

    if payload.token and payload.token.strip():
        req_token = payload.token.strip()
        if req_token == stored_token or stored_token.startswith(req_token) or req_token in stored_token:
            valid = True
    elif payload.otp and stored_token.endswith(payload.otp.strip()):
        valid = True

    if not valid:
        raise HTTPException(
            status_code=400,
            detail="Kode verifikasi atau token tidak valid / kedaluwarsa.",
        )

    user_obj.email_verified_at = datetime.now(timezone.utc)
    user_obj.status = "active"
    user_obj.email_verification_token = None
    await db.commit()

    return {
        "message": "Email Anda berhasil diverifikasi! Akun telah aktif.",
        "user": {
            "id": user_obj.id,
            "name": user_obj.full_name,
            "email": user_obj.email,
            "role": "developer",
            "status": "active",
            "avatar": user_obj.avatar_url or user_obj.full_name[:2].upper(),
        },
    }


@router.post("/resend-verification")
async def resend_verification(
    payload: ResendVerificationRequest,
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    clean_email = payload.email.strip().lower()
    stmt = select(User).where(User.email == clean_email)
    res = await db.execute(stmt)
    user_obj = res.scalar_one_or_none()

    if not user_obj:
        raise HTTPException(
            status_code=404,
            detail="Email ini belum terdaftar di sistem. Silakan lakukan pendaftaran akun baru terlebih dahulu.",
        )

    # 1. Check if email is already verified
    if user_obj.email_verified_at is not None:
        return {"message": "Email Anda sudah terverifikasi sebelumnya. Silakan langsung login."}

    # 2. Check account status
    if user_obj.status in ["suspended", "disabled"]:
        raise HTTPException(
            status_code=403,
            detail=f"Akun Anda berstatus '{user_obj.status}'. Hubungi administrator.",
        )

    token = secrets.token_hex(32)
    user_obj.email_verification_token = token
    await db.commit()

    email_sent = send_verification_email(clean_email, user_obj.full_name, token)

    return {
        "message": "Link aktivasi email berhasil dikirim ulang. Silakan periksa inbox Anda.",
        "emailSent": email_sent,
    }


@router.post("/login")
async def login_user(
    payload: LoginRequest,
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    if not db:
        raise HTTPException(status_code=500, detail="Database session unavailable")

    clean_email = payload.email.strip().lower()

    stmt = select(User).where(User.email == clean_email)
    res = await db.execute(stmt)
    user_obj = res.scalar_one_or_none()

    if not user_obj or not verify_password(payload.password, user_obj.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau password tidak valid. Silakan periksa kembali.",
        )

    if user_obj.status == "pending_verification":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email Anda belum diverifikasi. Silakan lakukan verifikasi email terlebih dahulu.",
        )

    if user_obj.status in ["suspended", "disabled"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Akun Anda berstatus '{user_obj.status}'. Hubungi administrator.",
        )

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
