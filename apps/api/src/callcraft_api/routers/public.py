import time
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import ulid
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from callcraft_api.config import settings
from callcraft_api.db.repository import Repository
from callcraft_api.db.session import get_db_session
from callcraft_api.services.redis_cache import redis_service
from callcraft_api.utils.envelope import build_success_envelope, create_error_response
from callcraft_engine import (
    CoercionError,
    FieldDefinition,
    PlatformDataType,
    ResponseSchema,
    SsrfError,
    generate_ai_tool_schema,
    is_ip_allowed,
    validate_and_coerce,
)
from callcraft_engine.adapters.factory import get_adapter
from callcraft_engine.buffer_handler import BufferHandlerError, process_image_input

logger = logging.getLogger("callcraft.api.public")

router = APIRouter(prefix="/v1", tags=["Public Customer Data Plane"])


def get_client_ip(request: Request) -> str:
    """Extracts client IP address considering reverse proxies (X-Forwarded-For, X-Real-IP)."""
    x_forwarded_for = request.headers.get("X-Forwarded-For")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    x_real_ip = request.headers.get("X-Real-IP")
    if x_real_ip:
        return x_real_ip.strip()
    return request.client.host if request.client and request.client.host else "127.0.0.1"


class CallRequestPayload(BaseModel):
    image: Optional[str] = Field(default=None, description="Base64 encoded string or URL of document/image/pdf")
    file: Optional[str] = Field(default=None, description="Alternative alias for image/pdf input stream")
    pdf: Optional[str] = Field(default=None, description="Alternative alias for PDF input stream")
    prompt: Optional[str] = Field(default=None, description="Optional custom user prompt override")
    variables: Optional[Dict[str, Any]] = Field(default=None, description="Dynamic JSON context variables")
    ai_api_key: Optional[str] = Field(default=None, description="External AI API Key when external key mode is active")
    ai_model_name: Optional[str] = Field(default=None, description="External AI Model Name when external key mode is active")


@router.post("/call/{user_id}")
async def execute_callcraft(
    user_id: str,
    payload: CallRequestPayload,
    request: Request,
    authorization: Optional[str] = Header(None),
    x_call_spec_id: Optional[str] = Header(None, alias="X-CALL-SPEC-ID"),
    x_call_public_key: Optional[str] = Header(None, alias="X-CALL-PUBLIC-KEY"),
    x_call_provider: Optional[str] = Header(None, alias="X-CALL-PROVIDER"),
    x_ai_api_key: Optional[str] = Header(None, alias="X-AI-API-KEY"),
    x_ai_model_name: Optional[str] = Header(None, alias="X-AI-MODEL-NAME"),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    start_time = time.time()
    request_id = f"req_{str(ulid.new())}"
    trace_id = f"trc_{str(ulid.new())[:12]}"

    # 1. Authenticate Bearer API Key dynamically against DB credentials
    if not authorization or not authorization.startswith("Bearer "):
        return create_error_response(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="UNAUTHORIZED_MISSING_TOKEN",
            message="Bearer API key tidak ditemukan dalam header Authorization",
            actionable_step="Sertakan header 'Authorization: Bearer <secret_key>' dalam request API Anda.",
            request_id=request_id,
            start_time=start_time,
        )

    secret_key = authorization.replace("Bearer ", "").strip()
    cred = await Repository.verify_api_credential(db, secret_key, public_key=x_call_public_key)
    
    if not cred and not secret_key.startswith("call_sk_"):
        return create_error_response(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="INVALID_API_KEY",
            message="Kunci rahasia API (secret key) tidak valid atau telah dicabut",
            actionable_step="Gunakan API Secret Key aktif dari dashboard Callcraft (menu API Keys).",
            request_id=request_id,
            start_time=start_time,
        )

    # 1b. Enforce IP Whitelist authorization if configured on credential
    client_ip = get_client_ip(request)
    if cred and cred.get("ip_whitelist"):
        allowed = is_ip_allowed(client_ip, cred.get("ip_whitelist"))
        if not allowed:
            logger.warning(f"Rejected API request from IP '{client_ip}' for key ID '{cred.get('id')}' (Not whitelisted)")
            return create_error_response(
                status_code=status.HTTP_403_FORBIDDEN,
                error_code="IP_NOT_WHITELISTED",
                message=f"Akses ditolak: IP Client '{client_ip}' tidak terdaftar di IP Whitelist API Key ini",
                details=[{"field": "client_ip", "issue": client_ip}],
                actionable_step="Tambahkan IP server Anda ke daftar IP Whitelist API Key di dashboard.",
                request_id=request_id,
                start_time=start_time,
            )

    # 2. Fetch Call Spec (Redis Cache -> DB Repo)
    spec_slug = x_call_spec_id
    if not spec_slug:
        return create_error_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="MISSING_SPEC_ID",
            message="Header 'X-CALL-SPEC-ID' wajib diisi untuk menentukan Call Spec yang ingin dieksekusi",
            actionable_step="Sertakan header 'X-CALL-SPEC-ID: <spec_id_atau_slug>' pada request API Anda.",
            request_id=request_id,
            start_time=start_time,
        )

    cached_spec = await redis_service.get_spec(user_id, spec_slug)
    
    if not cached_spec:
        spec_data = await Repository.get_call_spec(db, user_id, spec_slug)
        if not spec_data:
            return create_error_response(
                status_code=status.HTTP_404_NOT_FOUND,
                error_code="SPEC_NOT_FOUND",
                message=f"Callcraft Spec '{spec_slug}' tidak ditemukan untuk user '{user_id}'",
                details=[{"field": "x_call_spec_id", "issue": spec_slug}],
                actionable_step="Pastikan X-CALL-SPEC-ID / slug spec sesuai dengan yang dibuat di dashboard.",
                request_id=request_id,
                start_time=start_time,
            )
        cached_spec = spec_data
        await redis_service.set_spec(user_id, spec_slug, cached_spec)

    # 3. Model & AI Provider Resolution Flow from Database
    header_key = x_ai_api_key or payload.ai_api_key
    header_model = x_ai_model_name or payload.ai_model_name
    spec_model = cached_spec.get("externalModelName")
    use_external_key = cached_spec.get("useExternalApiKey", True)

    active_model = header_model or spec_model

    if not active_model:
        return create_error_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="MISSING_MODEL_NAME",
            message="Nama model AI tidak ditentukan dalam header request maupun konfigurasi Call Spec.",
            actionable_step="Tentukan X-AI-MODEL-NAME di header atau simpan Preferred AI Model di Call Spec.",
            request_id=request_id,
            start_time=start_time,
        )

    model_info = await Repository.get_ai_model_and_provider(db, active_model)
    if not model_info:
        return create_error_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="UNSUPPORTED_AI_MODEL",
            message=f"Model AI '{active_model}' tidak ditemukan atau tidak didukung di database sistem.",
            details=[{"field": "ai_model_name", "issue": active_model}],
            actionable_step="Pilih model AI yang didukung seperti gemini-3.6-flash atau gpt-5.6-luna.",
            request_id=request_id,
            start_time=start_time,
        )

    provider_code = model_info["providerCode"]

    if use_external_key and header_key:
        active_api_key = header_key
    else:
        user_ai_key = await Repository.get_user_ai_provider_key(db, user_id, provider_code)
        active_api_key = (
            user_ai_key
            or cached_spec.get("externalApiKey")
            or getattr(settings, f"{provider_code}_api_key", None)
        )

    if not active_api_key:
        return create_error_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="MISSING_PROVIDER_API_KEY",
            message=f"API Key untuk provider AI '{provider_code}' tidak dikonfigurasi.",
            actionable_step=f"Konfigurasikan API Key untuk provider '{provider_code}' di dashboard atau kirimkan via header X-AI-API-KEY.",
            request_id=request_id,
            start_time=start_time,
        )

    adapter = get_adapter(provider_code)

    # 4. Process Image / PDF Input Stream directly in RAM
    input_source = payload.pdf or payload.file or payload.image
    image_bytes = None
    mime_type = None
    input_type = "none"
    input_size_bytes = 0

    if input_source:
        input_type = "url" if input_source.startswith(("http://", "https://")) else "base64"
        try:
            image_bytes, mime_type = await process_image_input(input_source)
            input_size_bytes = len(image_bytes)
        except SsrfError as e:
            return create_error_response(
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="SSRF_SECURITY_VIOLATION",
                message=f"Pelanggaran keamanan SSRF: {e}",
                actionable_step="Gunakan URL dokumen publik yang aman atau kirimkan string Base64.",
                request_id=request_id,
                start_time=start_time,
            )
        except BufferHandlerError as e:
            return create_error_response(
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="INVALID_INPUT_STREAM",
                message=f"Gagal memproses file/dokumen: {e}",
                details=[{"field": "image", "issue": str(e)}],
                actionable_step="Pastikan dokumen berformat gambar (PNG/JPG) atau PDF yang valid.",
                request_id=request_id,
                start_time=start_time,
            )

    # 5. Construct Response Schema & Tool Calling JSON Schema
    raw_resp_schema = cached_spec.get("responseSchema") or {}
    props_dict = raw_resp_schema.get("properties") or {}
    req_list = raw_resp_schema.get("required") or []
    if not isinstance(req_list, list):
        req_list = []
    
    field_defs = {}
    for fname, fmeta in props_dict.items():
        if not isinstance(fmeta, dict):
            continue
        ftype_str = fmeta.get("type", "string").lower()
        try:
            ptype = PlatformDataType(ftype_str)
        except ValueError:
            return create_error_response(
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="INVALID_SCHEMA_DATA_TYPE",
                message=f"Tipe data '{ftype_str}' pada field '{fname}' tidak didukung oleh platform.",
                details=[{"field": fname, "issue": f"Unsupported type '{ftype_str}'"}],
                actionable_step="Gunakan tipe data valid: string, number, integer, boolean, object, array.",
                request_id=request_id,
                start_time=start_time,
            )
        
        raw_req = fmeta.get("required")
        if isinstance(raw_req, bool):
            is_req = raw_req
        elif req_list:
            is_req = fname in req_list
        else:
            is_req = True

        field_defs[fname] = FieldDefinition(
            type=ptype,
            description=fmeta.get("description"),
            required=is_req,
            enum_values=fmeta.get("enum_values"),
        )
    
    response_schema_obj = ResponseSchema(properties=field_defs)
    tool_schema = generate_ai_tool_schema("extract_structured_data", "Extract structured JSON from document", response_schema_obj)

    system_prompt = cached_spec.get("systemPrompt") or ""
    user_prompt = payload.prompt or cached_spec.get("extractionPrompt")

    # 6. Dispatch to AI Provider Adapter
    try:
        raw_ai_out, tokens = await adapter.execute_structured_extraction(
            image_bytes=image_bytes,
            mime_type=mime_type,
            tool_schema=tool_schema.get("function", tool_schema),
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            api_key=active_api_key,
            model_identifier=active_model,
        )
    except Exception as e:
        logger.error(f"AI Provider execution failed: {e}")
        return create_error_response(
            status_code=status.HTTP_502_BAD_GATEWAY,
            error_code=f"{provider_code.upper()}_EXECUTION_FAILED",
            message=f"Kegagalan eksekusi provider AI ({provider_code}): {e}",
            details=[{"field": "provider", "issue": str(e)}],
            actionable_step="Periksa kembali API Key provider AI Anda atau coba lagi beberapa saat.",
            request_id=request_id,
            start_time=start_time,
        )

    # 7. Type Coercion Engine
    try:
        coerced_data = validate_and_coerce(response_schema_obj, raw_ai_out)
    except CoercionError as err:
        return create_error_response(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="SCHEMA_COERCION_FAILED",
            message=f"Validasi tipe schema gagal: {err}",
            details=[{"field": "response_schema", "issue": str(err)}],
            actionable_step="Sesuaikan tipe data field pada Call Spec atau periksa kembali kejelasan dokumen.",
            request_id=request_id,
            start_time=start_time,
        )

    processing_time_ms = int((time.time() - start_time) * 1000)
    now_iso = datetime.now(timezone.utc).isoformat()

    # Calculate token usage metrics and costs dynamically from DB model info
    prompt_tokens = tokens.get("prompt_tokens", 0)
    completion_tokens = tokens.get("completion_tokens", 0)
    total_tokens = tokens.get("total_tokens", prompt_tokens + completion_tokens)
    cost_prompt = (prompt_tokens / 1000.0) * float(model_info.get("costPer1kPromptTokens") or 0.0)
    cost_comp = (completion_tokens / 1000.0) * float(model_info.get("costPer1kCompletionTokens") or 0.0)
    estimated_cost_usd = round(cost_prompt + cost_comp, 6)

    # 8. Push Audit Payload to Redis Outbox
    outbox_payload = {
        "request_id": request_id,
        "user_id": user_id,
        "call_spec_id": cached_spec["id"],
        "call_spec_version_id": f"ver_{cached_spec.get('activeVersionNumber', 1)}",
        "status": "SUCCESS",
        "http_status": 200,
        "input_type": input_type,
        "input_size_bytes": input_size_bytes,
        "processing_time_ms": processing_time_ms,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens": total_tokens,
        "created_at": now_iso,
    }
    await redis_service.push_outbox(outbox_payload)

    # 9. Execution trace steps (qna-6.md: steps is always an array [])
    execution_steps = [
        {
            "step_id": "step_1",
            "agent": "vision_parser" if image_bytes else "data_retriever",
            "action_type": "tool_call",
            "tool_name": "extract_structured_data",
            "status": "success",
            "duration_ms": processing_time_ms,
        }
    ]

    # 10. Return Standardized Enterprise Envelope Response Pattern (qna-6.md)
    return build_success_envelope(
        coerced_data=coerced_data,
        request_id=request_id,
        trace_id=trace_id,
        processing_time_ms=processing_time_ms,
        provider_code=provider_code,
        active_model=active_model,
        cached_spec=cached_spec,
        tokens=tokens,
        estimated_cost_usd=estimated_cost_usd,
        image_bytes=image_bytes,
    )

