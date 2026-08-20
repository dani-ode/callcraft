import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
import ulid
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from callcraft_api.config import settings
from callcraft_api.db.models import (
    AiProvider,
    ApiCredential,
    ApiRequest,
    CallSpec,
    CallSpecVersion,
    Template,
    User,
    UserAiProvider,
)
from callcraft_engine.crypto import (
    decrypt_aes_256_gcm,
    encrypt_aes_256_gcm,
    hash_secret_argon2,
    verify_secret_argon2,
)

logger = logging.getLogger("callcraft.db.repository")


class Repository:
    @staticmethod
    async def verify_api_credential(
        db: Optional[AsyncSession], secret_key: str, public_key: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Verifies customer API key against database credentials."""
        if db is None:
            return None

        if public_key:
            stmt = select(ApiCredential).where(
                ApiCredential.public_key == public_key,
                ApiCredential.revoked_at.is_(None),
            )
        else:
            stmt = select(ApiCredential).where(
                ApiCredential.revoked_at.is_(None),
            )
        result = await db.execute(stmt)
        creds = result.scalars().all()

        for cred in creds:
            if verify_secret_argon2(secret_key, cred.secret_key_hash):
                cred.last_used_at = datetime.now(timezone.utc)
                await db.commit()
                return {
                    "id": cred.id,
                    "user_id": cred.user_id,
                    "name": cred.name,
                    "public_key": cred.public_key,
                    "environment": cred.environment,
                }

        return None

    @staticmethod
    async def get_user_ai_provider_key(
        db: Optional[AsyncSession], user_id: str, provider_code: str
    ) -> Optional[str]:
        """Retrieves and decrypts user-supplied AI Provider API key using AES-256-GCM."""
        if db is None:
            return None

        stmt = select(UserAiProvider, AiProvider).join(
            AiProvider, UserAiProvider.provider_id == AiProvider.id
        ).where(
            UserAiProvider.user_id == user_id,
            AiProvider.code == provider_code.lower(),
            UserAiProvider.is_active.is_(True),
        )
        res = await db.execute(stmt)
        row = res.first()
        if not row:
            return None

        user_prov, _ = row
        try:
            decrypted = decrypt_aes_256_gcm(
                user_prov.encrypted_api_key,
                user_prov.key_nonce,
                settings.master_encryption_key,
            )
            return decrypted
        except Exception as e:
            logger.error(f"Failed to decrypt provider key: {e}")
            return None

    @staticmethod
    async def save_user_ai_provider_key(
        db: AsyncSession, user_id: str, provider_code: str, raw_api_key: str
    ) -> bool:
        """Encrypts and persists user AI provider API key using AES-256-GCM."""
        stmt = select(AiProvider).where(AiProvider.code == provider_code.lower())
        res = await db.execute(stmt)
        prov = res.scalar_one_or_none()
        if not prov:
            return False

        enc_key, nonce = encrypt_aes_256_gcm(raw_api_key, settings.master_encryption_key)

        existing_stmt = select(UserAiProvider).where(
            UserAiProvider.user_id == user_id,
            UserAiProvider.provider_id == prov.id,
        )
        existing_res = await db.execute(existing_stmt)
        user_prov = existing_res.scalar_one_or_none()

        if user_prov:
            user_prov.encrypted_api_key = enc_key
            user_prov.key_nonce = nonce
            user_prov.is_active = True
            user_prov.updated_at = datetime.now(timezone.utc)
        else:
            user_prov = UserAiProvider(
                id=f"uap_{str(ulid.new())}",
                user_id=user_id,
                provider_id=prov.id,
                encrypted_api_key=enc_key,
                key_nonce=nonce,
                is_active=True,
            )
            db.add(user_prov)

        await db.commit()
        return True

    @staticmethod
    async def get_call_spec(
        db: Optional[AsyncSession], user_id: str, spec_id_or_slug: str
    ) -> Optional[Dict[str, Any]]:
        """Fetches Call Spec and its active version from database."""
        if db is None:
            return None

        stmt = select(CallSpec).where(
            CallSpec.user_id == user_id,
            (CallSpec.id == spec_id_or_slug) | (CallSpec.slug == spec_id_or_slug),
        )
        res = await db.execute(stmt)
        spec = res.scalar_one_or_none()
        if not spec:
            return None

        ver_stmt = select(CallSpecVersion).where(
            CallSpecVersion.call_spec_id == spec.id,
            CallSpecVersion.version_number == spec.active_version_number,
        )
        ver_res = await db.execute(ver_stmt)
        ver = ver_res.scalar_one_or_none()
        if not ver:
            return None

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

    @staticmethod
    async def list_call_specs(db: Optional[AsyncSession], user_id: str) -> List[Dict[str, Any]]:
        """Lists all Call Specs for a specific user."""
        if db is None:
            return []

        stmt = select(CallSpec).where(CallSpec.user_id == user_id).order_by(CallSpec.created_at.desc())
        res = await db.execute(stmt)
        specs = res.scalars().all()

        output = []
        for spec in specs:
            ver_stmt = select(CallSpecVersion).where(
                CallSpecVersion.call_spec_id == spec.id,
                CallSpecVersion.version_number == spec.active_version_number,
            )
            ver_res = await db.execute(ver_stmt)
            ver = ver_res.scalar_one_or_none()

            output.append({
                "id": spec.id,
                "user_id": spec.user_id,
                "name": spec.name,
                "slug": spec.slug,
                "description": spec.description,
                "activeVersionNumber": spec.active_version_number,
                "status": spec.status,
                "updatedAt": spec.updated_at.isoformat() if spec.updated_at else datetime.now(timezone.utc).isoformat(),
                "responseSchema": ver.response_schema if ver else {},
            })

        return output

    @staticmethod
    async def create_call_spec(
        db: AsyncSession,
        user_id: str,
        name: str,
        slug: str,
        description: Optional[str],
        response_schema: Dict[str, Any],
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Creates a new Call Spec and version in database."""
        spec_id = f"spc_{str(ulid.new())}"
        spec = CallSpec(
            id=spec_id,
            user_id=user_id,
            name=name,
            slug=slug,
            description=description,
            active_version_number=1,
            status="active",
        )
        db.add(spec)
        await db.flush()

        ver = CallSpecVersion(
            id=f"ver_{spec_id}",
            call_spec_id=spec.id,
            version_number=1,
            request_schema={"properties": {"image": {"type": "string"}}},
            response_schema=response_schema,
            system_prompt=system_prompt or "Extract structured data from document.",
        )
        db.add(ver)
        await db.commit()

        return {
            "id": spec.id,
            "name": spec.name,
            "slug": spec.slug,
            "description": spec.description,
            "activeVersionNumber": 1,
            "status": spec.status,
        }

    @staticmethod
    async def list_templates(db: Optional[AsyncSession]) -> List[Dict[str, Any]]:
        """Lists all master platform templates."""
        if db is None:
            return []

        stmt = select(Template).where(Template.is_official.is_(True)).order_by(Template.code.asc())
        res = await db.execute(stmt)
        templates = res.scalars().all()

        return [
            {
                "id": t.id,
                "code": t.code,
                "name": t.name,
                "description": t.description,
                "category": t.category,
                "isOfficial": t.is_official,
                "requestSchema": t.request_schema,
                "responseSchema": t.response_schema,
            }
            for t in templates
        ]

    @staticmethod
    async def list_api_credentials(db: Optional[AsyncSession], user_id: str) -> List[Dict[str, Any]]:
        """Lists active customer API credentials for a user."""
        if db is None:
            return []

        stmt = select(ApiCredential).where(
            ApiCredential.user_id == user_id,
            ApiCredential.revoked_at.is_(None),
        ).order_by(ApiCredential.created_at.desc())
        res = await db.execute(stmt)
        creds = res.scalars().all()

        return [
            {
                "id": c.id,
                "name": c.name,
                "publicKey": c.public_key,
                "environment": c.environment,
                "createdAt": c.created_at.isoformat() if c.created_at else datetime.now(timezone.utc).isoformat(),
                "lastUsedAt": c.last_used_at.isoformat() if c.last_used_at else None,
            }
            for c in creds
        ]

    @staticmethod
    async def create_api_credential(
        db: AsyncSession, user_id: str, name: str, environment: str = "production"
    ) -> Tuple[Dict[str, Any], str]:
        """Creates new API credential pair. Returns (credential_dict, secret_key)."""
        cred_id = f"crd_{str(ulid.new())}"
        public_key = f"pk_live_{str(ulid.new())[:16]}"
        secret_key = f"call_sk_live_{str(ulid.new())}"
        secret_hash = hash_secret_argon2(secret_key)

        cred = ApiCredential(
            id=cred_id,
            user_id=user_id,
            name=name,
            public_key=public_key,
            secret_key_hash=secret_hash,
            environment=environment,
        )
        db.add(cred)
        await db.commit()

        return {
            "id": cred.id,
            "name": cred.name,
            "publicKey": cred.public_key,
            "environment": cred.environment,
            "createdAt": cred.created_at.isoformat(),
        }, secret_key

    @staticmethod
    async def list_api_requests(db: Optional[AsyncSession], user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Lists recent audit execution logs."""
        if db is None:
            return []

        stmt = select(ApiRequest).where(ApiRequest.user_id == user_id).order_by(ApiRequest.created_at.desc()).limit(limit)
        res = await db.execute(stmt)
        reqs = res.scalars().all()

        return [
            {
                "id": r.id,
                "requestId": r.request_id,
                "specName": r.call_spec_id,
                "status": r.status,
                "httpStatus": r.http_status,
                "processingTimeMs": r.processing_time_ms,
                "totalTokens": r.total_tokens,
                "costUsd": r.estimated_cost_usd or 0.0,
                "createdAt": r.created_at.isoformat() if r.created_at else datetime.now(timezone.utc).isoformat(),
            }
            for r in reqs
        ]
