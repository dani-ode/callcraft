import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
import ulid
from sqlalchemy import select, update, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from callcraft_api.config import settings
from callcraft_api.db.models import (
    AiModel,
    AiProvider,
    ApiCredential,
    ApiRequest,
    CallSpec,
    CallSpecVersion,
    PlaygroundState,
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
                    "ip_whitelist": cred.ip_whitelist or [],
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
    async def list_user_ai_providers(
        db: Optional[AsyncSession], user_id: str
    ) -> List[Dict[str, Any]]:
        """Lists active decrypted user AI provider API keys."""
        if db is None:
            return []

        stmt = select(UserAiProvider, AiProvider).join(
            AiProvider, UserAiProvider.provider_id == AiProvider.id
        ).where(
            UserAiProvider.user_id == user_id,
            UserAiProvider.is_active.is_(True),
        )
        res = await db.execute(stmt)
        rows = res.all()

        results = []
        for user_prov, prov in rows:
            decrypted = None
            try:
                decrypted = decrypt_aes_256_gcm(
                    user_prov.encrypted_api_key,
                    user_prov.key_nonce,
                    settings.master_encryption_key,
                )
            except Exception as e:
                logger.error(f"Failed to decrypt provider key for '{prov.code}': {e}")
                decrypted = None

            results.append({
                "id": user_prov.id,
                "providerCode": prov.code,
                "providerName": prov.name,
                "key": decrypted or "",
                "isActive": user_prov.is_active,
                "updatedAt": user_prov.updated_at.isoformat() if user_prov.updated_at else None,
            })
        return results

    @staticmethod
    async def list_ai_providers(db: Optional[AsyncSession]) -> List[Dict[str, Any]]:
        """Queries database for active system AI Providers."""
        if db is None:
            return []
        stmt = select(AiProvider).where(AiProvider.is_active == True)
        res = await db.execute(stmt)
        providers = res.scalars().all()
        return [{"id": p.id, "code": p.code, "name": p.name} for p in providers]

    @staticmethod
    async def get_ai_model_and_provider(
        db: Optional[AsyncSession],
        model_name_or_id: str,
    ) -> Optional[Dict[str, Any]]:
        """Queries database for an AI Model record by model_identifier, id, or name, returning its details and associated provider code."""
        if not db or not model_name_or_id:
            return None

        stmt = (
            select(AiModel, AiProvider)
            .join(AiProvider, AiModel.provider_id == AiProvider.id)
            .where(
                AiModel.is_active == True,
                (AiModel.model_identifier == model_name_or_id)
                | (AiModel.id == model_name_or_id)
                | (AiModel.name == model_name_or_id),
            )
        )
        res = await db.execute(stmt)
        row = res.first()
        if not row:
            stmt = (
                select(AiModel, AiProvider)
                .join(AiProvider, AiModel.provider_id == AiProvider.id)
                .where(
                    AiModel.is_active == True,
                    (func.lower(AiModel.model_identifier) == model_name_or_id.lower())
                    | (func.lower(AiModel.id) == model_name_or_id.lower())
                    | (func.lower(AiModel.name) == model_name_or_id.lower()),
                )
            )
            res = await db.execute(stmt)
            row = res.first()

        if not row:
            return None

        model_obj, provider_obj = row
        return {
            "id": model_obj.id,
            "name": model_obj.name,
            "modelIdentifier": model_obj.model_identifier,
            "providerCode": provider_obj.code,
            "providerName": provider_obj.name,
            "supportsImage": model_obj.supports_image,
            "supportsToolCalling": model_obj.supports_tool_calling,
            "supportsStructuredOutput": model_obj.supports_structured_output,
        }

    @staticmethod
    def _serialize_call_spec(
        spec: CallSpec,
        ver: Optional[CallSpecVersion] = None,
        tmpl: Optional[Template] = None,
    ) -> Dict[str, Any]:
        """Serializes CallSpec model instance into a standardized clean camelCase JSON dictionary."""
        req_schema = ver.request_schema if (ver and ver.request_schema) else {"type": "object", "properties": {}}
        res_schema = ver.response_schema if (ver and ver.response_schema) else {"type": "object", "properties": {}}
        sys_prompt = ver.system_prompt if ver else getattr(spec, "system_prompt", None)
        ext_prompt = ver.extraction_prompt if ver else getattr(spec, "extraction_prompt", None)
        ext_model = (ver.external_model_name if (ver and ver.external_model_name) else spec.external_model_name)
        ext_key = (ver.external_api_key if (ver and ver.external_api_key) else spec.external_api_key)

        use_ext_key = ver.use_external_api_key if (ver and ver.use_external_api_key is not None) else spec.use_external_api_key
        tools_cfg = (ver.tools_config if (ver and ver.tools_config is not None) else spec.tools_config) or {}

        return {
            "id": spec.id,
            "userId": spec.user_id,
            "name": spec.name,
            "slug": spec.slug,
            "description": spec.description or "",
            "activeVersionNumber": spec.active_version_number,
            "status": spec.status,
            "allowPdfInput": spec.allow_pdf_input,
            "useExternalApiKey": use_ext_key,
            "externalModelName": ext_model,
            "externalApiKey": ext_key,
            "isPublished": spec.is_published,
            "publishedTemplateId": spec.published_template_id,
            "requestSchema": req_schema,
            "responseSchema": res_schema,
            "toolsConfig": tools_cfg,
            "systemPrompt": sys_prompt,
            "extractionPrompt": ext_prompt,
            "likesCount": tmpl.likes_count if tmpl else 0,
            "forkCount": tmpl.fork_count if tmpl else 0,
            "ratingAvg": tmpl.rating_avg if tmpl else None,
            "reviewsCount": tmpl.reviews_count if tmpl else 0,
            "updatedAt": spec.updated_at.isoformat() if spec.updated_at else None,
            "createdAt": spec.created_at.isoformat() if spec.created_at else None,
        }

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

        return Repository._serialize_call_spec(spec, ver)

    @staticmethod
    async def update_call_spec(
        db: Optional[AsyncSession],
        user_id: str,
        spec_id_or_slug: str,
        name: Optional[str] = None,
        slug: Optional[str] = None,
        description: Optional[str] = None,
        request_schema: Optional[Dict[str, Any]] = None,
        response_schema: Optional[Dict[str, Any]] = None,
        system_prompt: Optional[str] = None,
        extraction_prompt: Optional[str] = None,
        use_external_api_key: Optional[bool] = None,
        external_model_name: Optional[str] = None,
        external_api_key: Optional[str] = None,
        tools_config: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Updates Call Spec and creates or updates active version in database."""
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

        if name is not None:
            spec.name = name
        if slug is not None:
            spec.slug = slug
        if description is not None:
            spec.description = description
        if use_external_api_key is not None:
            spec.use_external_api_key = use_external_api_key
        if external_model_name is not None:
            spec.external_model_name = external_model_name
        if external_api_key is not None:
            spec.external_api_key = external_api_key
        if tools_config is not None:
            spec.tools_config = tools_config

        spec.updated_at = datetime.now(timezone.utc)

        ver_stmt = select(CallSpecVersion).where(
            CallSpecVersion.call_spec_id == spec.id,
            CallSpecVersion.version_number == spec.active_version_number,
        )
        ver_res = await db.execute(ver_stmt)
        ver = ver_res.scalar_one_or_none()

        if not ver:
            ver = CallSpecVersion(
                id=f"ver_{spec.id}_{spec.active_version_number}",
                call_spec_id=spec.id,
                version_number=spec.active_version_number,
                use_external_api_key=spec.use_external_api_key,
                external_model_name=spec.external_model_name,
                external_api_key=spec.external_api_key,
                tools_config=spec.tools_config,
            )
            db.add(ver)

        if request_schema is not None:
            ver.request_schema = request_schema
        if response_schema is not None:
            ver.response_schema = response_schema
        if system_prompt is not None:
            ver.system_prompt = system_prompt
        if extraction_prompt is not None:
            ver.extraction_prompt = extraction_prompt
        if use_external_api_key is not None:
            ver.use_external_api_key = use_external_api_key
        if external_model_name is not None:
            ver.external_model_name = external_model_name
        if external_api_key is not None:
            ver.external_api_key = external_api_key
        if tools_config is not None:
            ver.tools_config = tools_config

        await db.commit()

        return Repository._serialize_call_spec(spec, ver)

    @staticmethod
    async def delete_call_spec(
        db: Optional[AsyncSession], user_id: str, spec_id_or_slug: str
    ) -> bool:
        """Deletes Call Spec and its versions from database."""
        if db is None:
            return False

        stmt = select(CallSpec).where(
            CallSpec.user_id == user_id,
            (CallSpec.id == spec_id_or_slug) | (CallSpec.slug == spec_id_or_slug),
        )
        res = await db.execute(stmt)
        spec = res.scalar_one_or_none()
        if not spec:
            return False

        await db.execute(delete(CallSpecVersion).where(CallSpecVersion.call_spec_id == spec.id))
        await db.delete(spec)
        await db.commit()
        return True

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

            tmpl = None
            if spec.published_template_id:
                t_stmt = select(Template).where(Template.id == spec.published_template_id)
                t_res = await db.execute(t_stmt)
                tmpl = t_res.scalar_one_or_none()

            output.append(Repository._serialize_call_spec(spec, ver, tmpl))

        return output

    @staticmethod
    async def create_call_spec(
        db: AsyncSession,
        user_id: str,
        name: str,
        slug: str,
        description: Optional[str] = None,
        request_schema: Optional[Dict[str, Any]] = None,
        response_schema: Optional[Dict[str, Any]] = None,
        system_prompt: Optional[str] = None,
        extraction_prompt: Optional[str] = None,
        use_external_api_key: bool = True,
        external_model_name: Optional[str] = None,
        external_api_key: Optional[str] = None,
        tools_config: Optional[Dict[str, Any]] = None,
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
            use_external_api_key=use_external_api_key,
            external_model_name=external_model_name,
            external_api_key=external_api_key,
            tools_config=tools_config or {},
        )
        db.add(spec)
        await db.flush()

        ver = CallSpecVersion(
            id=f"ver_{spec_id}",
            call_spec_id=spec.id,
            version_number=1,
            request_schema=request_schema,
            response_schema=response_schema,
            system_prompt=system_prompt,
            extraction_prompt=extraction_prompt,
            use_external_api_key=use_external_api_key,
            external_model_name=external_model_name,
            external_api_key=external_api_key,
            tools_config=tools_config or {},
        )
        db.add(ver)
        await db.commit()

        return Repository._serialize_call_spec(spec, ver)

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
                "ipWhitelist": c.ip_whitelist or [],
                "createdAt": c.created_at.isoformat() if c.created_at else datetime.now(timezone.utc).isoformat(),
                "lastUsedAt": c.last_used_at.isoformat() if c.last_used_at else None,
            }
            for c in creds
        ]

    @staticmethod
    async def create_api_credential(
        db: AsyncSession, user_id: str, name: str, environment: str = "production", ip_whitelist: Optional[List[str]] = None
    ) -> Tuple[Dict[str, Any], str]:
        """Creates new API credential pair. Returns (credential_dict, secret_key)."""
        cred_id = f"crd_{str(ulid.new())}"
        public_key = f"pk_live_{str(ulid.new())[:16]}"
        secret_key = f"call_sk_live_{str(ulid.new())}"
        secret_hash = hash_secret_argon2(secret_key)

        clean_ip_whitelist = [ip.strip() for ip in (ip_whitelist or []) if ip and ip.strip()]

        cred = ApiCredential(
            id=cred_id,
            user_id=user_id,
            name=name,
            public_key=public_key,
            secret_key_hash=secret_hash,
            environment=environment,
            ip_whitelist=clean_ip_whitelist,
        )
        db.add(cred)
        await db.commit()

        return {
            "id": cred.id,
            "name": cred.name,
            "publicKey": cred.public_key,
            "environment": cred.environment,
            "ipWhitelist": cred.ip_whitelist,
            "createdAt": cred.created_at.isoformat(),
        }, secret_key

    @staticmethod
    async def update_api_credential_ip_whitelist(
        db: AsyncSession, key_id: str, user_id: str, ip_whitelist: List[str]
    ) -> Optional[Dict[str, Any]]:
        """Updates IP whitelist for a given customer API credential."""
        clean_ip_whitelist = [ip.strip() for ip in ip_whitelist if ip and ip.strip()]

        stmt = select(ApiCredential).where(
            ApiCredential.id == key_id,
            ApiCredential.user_id == user_id,
            ApiCredential.revoked_at.is_(None),
        )
        res = await db.execute(stmt)
        cred = res.scalar_one_or_none()
        if not cred:
            return None

        cred.ip_whitelist = clean_ip_whitelist
        await db.commit()

        return {
            "id": cred.id,
            "name": cred.name,
            "publicKey": cred.public_key,
            "environment": cred.environment,
            "ipWhitelist": cred.ip_whitelist,
            "createdAt": cred.created_at.isoformat() if cred.created_at else datetime.now(timezone.utc).isoformat(),
            "lastUsedAt": cred.last_used_at.isoformat() if cred.last_used_at else None,
        }

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

    @staticmethod
    async def delete_api_credential(db: Optional[AsyncSession], key_id: str, user_id: str) -> bool:
        """Deletes an API Key credential record from the database."""
        if db is None:
            return False

        stmt = select(ApiCredential).where(
            ApiCredential.id == key_id,
            ApiCredential.user_id == user_id,
        )
        res = await db.execute(stmt)
        cred = res.scalar_one_or_none()
        if not cred:
            return False

        await db.delete(cred)
        await db.commit()
        return True

    @staticmethod
    async def get_playground_state(db: Optional[AsyncSession], user_id: str, call_spec_id: str) -> Optional[Dict[str, Any]]:
        """Gets saved Playground state for user and spec. Resolves selected_credential_id against DB."""
        if db is None:
            return None

        stmt = select(PlaygroundState).where(
            PlaygroundState.user_id == user_id,
            PlaygroundState.call_spec_id == call_spec_id,
        )
        res = await db.execute(stmt)
        state = res.scalar_one_or_none()
        if not state:
            return None

        credential_deleted = False
        resolved_credential_id = state.selected_credential_id
        resolved_public_key = None

        if state.selected_credential_id:
            cred_stmt = select(ApiCredential).where(
                ApiCredential.id == state.selected_credential_id,
                ApiCredential.user_id == user_id,
                ApiCredential.revoked_at.is_(None),
            )
            cred_res = await db.execute(cred_stmt)
            cred = cred_res.scalar_one_or_none()
            if cred:
                resolved_public_key = cred.public_key
            else:
                # The saved key was deleted or revoked!
                credential_deleted = True
                resolved_credential_id = None

        return {
            "id": state.id,
            "userId": state.user_id,
            "callSpecId": state.call_spec_id,
            "selectedCredentialId": resolved_credential_id,
            "publicKey": resolved_public_key,
            "credentialDeleted": credential_deleted,
            "checkedStates": state.checked_states or {},
            "extraInputs": state.extra_inputs or {},
            "prompt": state.prompt,
            "imageUrl": state.image_url,
            "aiModelName": state.ai_model_name,
            "aiApiKey": state.ai_api_key,
            "updatedAt": state.updated_at.isoformat() if state.updated_at else datetime.now(timezone.utc).isoformat(),
        }

    @staticmethod
    async def save_playground_state(
        db: Optional[AsyncSession],
        user_id: str,
        call_spec_id: str,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Upserts Playground state in DB for user_id and call_spec_id."""
        if db is None:
            raise ValueError("Database session unavailable")

        stmt = select(PlaygroundState).where(
            PlaygroundState.user_id == user_id,
            PlaygroundState.call_spec_id == call_spec_id,
        )
        res = await db.execute(stmt)
        existing = res.scalar_one_or_none()

        selected_credential_id = payload.get("selectedCredentialId")
        if selected_credential_id:
            cred_stmt = select(ApiCredential).where(
                ApiCredential.id == selected_credential_id,
                ApiCredential.user_id == user_id,
                ApiCredential.revoked_at.is_(None),
            )
            cred_res = await db.execute(cred_stmt)
            if not cred_res.scalar_one_or_none():
                selected_credential_id = None

        checked_states = payload.get("checkedStates", {})
        extra_inputs = payload.get("extraInputs", {})
        prompt = payload.get("prompt")
        image_url = payload.get("imageUrl")
        ai_model_name = payload.get("aiModelName")
        ai_api_key = payload.get("aiApiKey")

        if existing:
            existing.selected_credential_id = selected_credential_id
            existing.checked_states = checked_states
            existing.extra_inputs = extra_inputs
            existing.prompt = prompt
            existing.image_url = image_url
            existing.ai_model_name = ai_model_name
            existing.ai_api_key = ai_api_key
            existing.updated_at = datetime.now(timezone.utc)
        else:
            new_id = f"pgs_{ulid.new().str}"
            existing = PlaygroundState(
                id=new_id,
                user_id=user_id,
                call_spec_id=call_spec_id,
                selected_credential_id=selected_credential_id,
                checked_states=checked_states,
                extra_inputs=extra_inputs,
                prompt=prompt,
                image_url=image_url,
                ai_model_name=ai_model_name,
                ai_api_key=ai_api_key,
            )
            db.add(existing)

        await db.commit()
        await db.refresh(existing)

        return {
            "id": existing.id,
            "userId": existing.user_id,
            "callSpecId": existing.call_spec_id,
            "selectedCredentialId": existing.selected_credential_id,
            "checkedStates": existing.checked_states,
            "extraInputs": existing.extra_inputs,
            "prompt": existing.prompt,
            "imageUrl": existing.image_url,
            "aiModelName": existing.ai_model_name,
            "aiApiKey": existing.ai_api_key,
            "updatedAt": existing.updated_at.isoformat() if existing.updated_at else datetime.now(timezone.utc).isoformat(),
        }


