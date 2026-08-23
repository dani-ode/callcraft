from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from callcraft_api.db.models import User
from callcraft_api.db.session import get_db_session

router = APIRouter(prefix="/internal/v1", tags=["Internal"])


async def get_current_user_id(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    user_id: Optional[str] = None,
    db: Optional[AsyncSession] = Depends(get_db_session),
) -> str:
    uid = x_user_id or user_id
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing User Identity context",
        )

    if db:
        stmt = select(User).where(User.id == uid)
        res = await db.execute(stmt)
        u_obj = res.scalar_one_or_none()
        if not u_obj:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Sesi pengguna tidak terdaftar di sistem. Silakan login kembali.",
            )

    return uid
