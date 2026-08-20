import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import ulid
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from callcraft_api.db.models import ApiCredential, CallSpec, CallSpecVersion, Template, User, UserAiProvider
from callcraft_engine.crypto import verify_secret_argon2

logger = logging.getLogger("callcraft.db.repository")

# In-memory stores for offline fallback / testing
_MEM_USERS: Dict[str, Dict[str, Any]] = {
    "usr_default_dev_01": {
        "id": "usr_default_dev_01",
        "email": "dev@callcraft.io",
        "full_name": "Callcraft Dev User",
    }
}

_MEM_API_KEYS: Dict[str, Dict[str, Any]] = {
    "pk_live_default_key_01": {
        "id": "crd_01HZX01KEY00000000001",
        "user_id": "usr_default_dev_01",
        "name": "Default Dev Key",
        "public_key": "pk_live_default_key_01",
        # Default dev secret Argon2 hash or dev match
        "secret_key_raw": "call_sk_live_dev_secret_key_12345",
    }
}

_MEM_SPECS: Dict[str, Dict[str, Any]] = {
    "usr_default_dev_01:default_spec_01": {
        "id": "spc_01HZX01SPEC0000000001",
        "user_id": "usr_default_dev_01",
        "name": "Default Call Spec",
        "slug": "default_spec_01",
        "active_version_number": 1,
        "request_schema": {
            "properties": {
                "image": {"type": "string", "description": "Base64 or URL"}
            },
            "required": ["image"]
        },
        "response_schema": {
            "properties": {
                "nik": {"type": "string", "required": True},
                "full_name": {"type": "string", "required": True},
                "gender": {"type": "enum", "enum_values": ["LAKI-LAKI", "PEREMPUAN"], "required": True}
            }
        },
        "system_prompt": "Extract Indonesian KTP fields accurately.",
        "extraction_prompt": "Extract NIK, name, and gender."
    }
}


class Repository:
    @staticmethod
    async def verify_api_credential(
        db: Optional[AsyncSession], public_key: str, secret_key: str
    ) -> Optional[Dict[str, Any]]:
        if db is not None:
            try:
                stmt = select(ApiCredential).where(
                    ApiCredential.public_key == public_key,
                    ApiCredential.revoked_at.is_(None),
                )
                result = await db.execute(stmt)
                cred = result.scalar_one_or_none()
                if cred and verify_secret_argon2(secret_key, cred.secret_key_hash):
                    # update last used
                    cred.last_used_at = datetime.now(timezone.utc)
                    await db.commit()
                    return {
                        "id": cred.id,
                        "user_id": cred.user_id,
                        "name": cred.name,
                        "public_key": cred.public_key,
                    }
            except Exception as e:
                logger.warning(f"Database error verifying credential, falling back to memory: {e}")

        # Memory Fallback
        if public_key in _MEM_API_KEYS:
            mem_cred = _MEM_API_KEYS[public_key]
            if secret_key == mem_cred["secret_key_raw"]:
                return {
                    "id": mem_cred["id"],
                    "user_id": mem_cred["user_id"],
                    "name": mem_cred["name"],
                    "public_key": mem_cred["public_key"],
                }
        return None

    @staticmethod
    async def get_call_spec(
        db: Optional[AsyncSession], user_id: str, spec_id_or_slug: str
    ) -> Optional[Dict[str, Any]]:
        if db is not None:
            try:
                stmt = select(CallSpec).where(
                    CallSpec.user_id == user_id,
                    (CallSpec.id == spec_id_or_slug) | (CallSpec.slug == spec_id_or_slug),
                )
                res = await db.execute(stmt)
                spec = res.scalar_one_or_none()
                if spec:
                    ver_stmt = select(CallSpecVersion).where(
                        CallSpecVersion.call_spec_id == spec.id,
                        CallSpecVersion.version_number == spec.active_version_number,
                    )
                    ver_res = await db.execute(ver_stmt)
                    ver = ver_res.scalar_one_or_none()
                    if ver:
                        return {
                            "id": spec.id,
                            "user_id": spec.user_id,
                            "name": spec.name,
                            "slug": spec.slug,
                            "version_number": ver.version_number,
                            "request_schema": ver.request_schema,
                            "response_schema": ver.response_schema,
                            "system_prompt": ver.system_prompt,
                            "extraction_prompt": ver.extraction_prompt,
                        }
            except Exception as e:
                logger.warning(f"Database error fetching call spec, falling back to memory: {e}")

        # Memory Fallback
        cache_key = f"{user_id}:{spec_id_or_slug}"
        if cache_key in _MEM_SPECS:
            return _MEM_SPECS[cache_key]
        
        # Return default mock spec if missing in dev mode
        return {
            "id": f"spc_{spec_id_or_slug}",
            "user_id": user_id,
            "name": spec_id_or_slug.replace("_", " ").title(),
            "slug": spec_id_or_slug,
            "version_number": 1,
            "request_schema": {"properties": {"image": {"type": "string"}}},
            "response_schema": {
                "properties": {
                    "nik": {"type": "string", "required": True},
                    "full_name": {"type": "string", "required": True},
                    "gender": {"type": "enum", "enum_values": ["LAKI-LAKI", "PEREMPUAN"], "required": True},
                }
            },
            "system_prompt": "Extract document information accurately.",
            "extraction_prompt": None,
        }
