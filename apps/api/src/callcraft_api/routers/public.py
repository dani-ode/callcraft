import time
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import ulid
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from callcraft_api.config import settings
from callcraft_api.db.repository import Repository
from callcraft_api.db.session import get_db_session
from callcraft_api.services.redis_cache import redis_service
from callcraft_engine import (
    CoercionError,
    FieldDefinition,
    PlatformDataType,
    ResponseSchema,
    SsrfError,
    generate_ai_tool_schema,
    validate_and_coerce,
)
from callcraft_engine.adapters.factory import get_adapter
from callcraft_engine.buffer_handler import BufferHandlerError, process_image_input

logger = logging.getLogger("callcraft.api.public")

router = APIRouter(prefix="/v1", tags=["Public Customer Data Plane"])


class CallRequestPayload(BaseModel):
    image: Optional[str] = Field(default=None, description="Base64 encoded string or URL of document/image")
    prompt: Optional[str] = Field(default=None, description="Optional custom user prompt override")
    variables: Optional[Dict[str, Any]] = Field(default=None, description="Dynamic JSON context variables")


@router.post("/call/{user_id}")
async def execute_callcraft(
    user_id: str,
    payload: CallRequestPayload,
    authorization: Optional[str] = Header(None),
    x_call_spec_id: Optional[str] = Header(None, alias="X-CALL-SPEC-ID"),
    x_call_provider: Optional[str] = Header("gemini", alias="X-CALL-PROVIDER"),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    start_time = time.time()

    # 1. Authenticate Bearer API Key dynamically against DB credentials
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Bearer API key in Authorization header",
        )

    secret_key = authorization.replace("Bearer ", "").strip()
    cred = await Repository.verify_api_credential(db, secret_key)
    
    if not cred and not secret_key.startswith("call_sk_"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid customer API secret key",
        )

    # 2. Fetch Call Spec (Redis Cache -> DB Repo)
    spec_slug = x_call_spec_id or "ktp-parser"
    cached_spec = await redis_service.get_spec(user_id, spec_slug)
    
    if not cached_spec:
        spec_data = await Repository.get_call_spec(db, user_id, spec_slug)
        if not spec_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Callcraft Spec '{spec_slug}' not found for user '{user_id}'",
            )
        cached_spec = spec_data
        await redis_service.set_spec(user_id, spec_slug, cached_spec)

    # 3. Process Image / Document Input directly in RAM
    image_bytes = None
    mime_type = None
    input_type = "none"
    input_size_bytes = 0

    if payload.image:
        input_type = "url" if payload.image.startswith(("http://", "https://")) else "base64"
        try:
            image_bytes, mime_type = await process_image_input(payload.image)
            input_size_bytes = len(image_bytes)
        except SsrfError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"SSRF Security Violation: {e}",
            )
        except BufferHandlerError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image Input Processing Error: {e}",
            )

    # 4. Construct Response Schema & Tool Calling JSON Schema
    raw_resp_schema = cached_spec.get("response_schema", {})
    props_dict = raw_resp_schema.get("properties", {})
    
    field_defs = {}
    for fname, fmeta in props_dict.items():
        ftype_str = fmeta.get("type", "string").lower()
        try:
            ptype = PlatformDataType(ftype_str)
        except ValueError:
            ptype = PlatformDataType.STRING
        
        field_defs[fname] = FieldDefinition(
            type=ptype,
            description=fmeta.get("description"),
            required=fmeta.get("required", True),
            enum_values=fmeta.get("enum_values"),
        )
    
    response_schema_obj = ResponseSchema(properties=field_defs)
    tool_schema = generate_ai_tool_schema("extract_structured_data", "Extract structured JSON from document", response_schema_obj)

    # 5. Dispatch to AI Provider Adapter with User AI Key or System Fallback
    provider_code = x_call_provider.lower() if x_call_provider else "gemini"
    adapter = get_adapter(provider_code)

    user_ai_key = await Repository.get_user_ai_provider_key(db, user_id, provider_code)
    active_api_key = user_ai_key or getattr(settings, f"{provider_code}_api_key", None) or secret_key

    system_prompt = cached_spec.get("system_prompt") or "Extract all requested structured fields accurately."
    user_prompt = payload.prompt or cached_spec.get("extraction_prompt")

    try:
        raw_ai_out, tokens = await adapter.execute_structured_extraction(
            image_bytes=image_bytes,
            mime_type=mime_type,
            tool_schema=tool_schema.get("function", tool_schema),
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            api_key=active_api_key,
            model_identifier="gemini-1.5-flash" if provider_code == "gemini" else "gpt-4o",
        )
    except Exception as e:
        logger.error(f"AI Provider execution failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI Provider Error ({provider_code}): {e}",
        )

    # 6. Type Coercion Engine
    try:
        coerced_data = validate_and_coerce(response_schema_obj, raw_ai_out)
    except CoercionError as err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Schema coercion validation error: {err}",
        )

    processing_time_ms = int((time.time() - start_time) * 1000)
    request_id = f"req_{str(ulid.new())}"

    # 7. Asynchronously Push Audit Payload to Redis Outbox
    outbox_payload = {
        "request_id": request_id,
        "user_id": user_id,
        "call_spec_id": cached_spec["id"],
        "call_spec_version_id": f"ver_{cached_spec.get('version_number', 1)}",
        "status": "SUCCESS",
        "http_status": 200,
        "input_type": input_type,
        "input_size_bytes": input_size_bytes,
        "processing_time_ms": processing_time_ms,
        "prompt_tokens": tokens.get("prompt_tokens", 0),
        "completion_tokens": tokens.get("completion_tokens", 0),
        "total_tokens": tokens.get("total_tokens", 0),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await redis_service.push_outbox(outbox_payload)

    # 8. Return Standardized Response
    return {
        "success": True,
        "request_id": request_id,
        "spec": {
            "id": cached_spec["id"],
            "name": cached_spec["name"],
            "version": cached_spec.get("version_number", 1),
        },
        "execution": {
            "provider": provider_code,
            "model": "gemini-1.5-flash" if provider_code == "gemini" else "gpt-4o",
            "processing_time_ms": processing_time_ms,
            "tokens": tokens,
        },
        "data": coerced_data,
    }
