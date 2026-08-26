import re
import time
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import ulid
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

def truncate_base64_in_prompt(text: str) -> str:
    if not text:
        return ""
    # Truncate base64 data URLs: data:image/png;base64,iVBORw0KG... -> data:image/png;base64,[TRUNCATED_BASE64_DATA]
    pattern_url = r'(data:[a-zA-Z0-9/+\-]+;base64,)[a-zA-Z0-9/+=]{30,}'
    text = re.sub(pattern_url, r'\1[TRUNCATED_BASE64_DATA]', text)

    # Truncate raw base64 strings in JSON / text e.g. "image": "iVBORw0KG..."
    pattern_raw = r'("image"|"file"|"pdf"|"data")\s*:\s*"([a-zA-Z0-9/+=]{100,})"'
    text = re.sub(pattern_raw, r'\1: "[TRUNCATED_BASE64_DATA]"', text)
    return text

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
    return request.client.host if request.client and request.client.host else "127.0.0.1"


from callcraft_api.services.execution_service import (
    build_execution_trace_steps,
    parse_dict_to_field_def,
)


class CallRequestPayload(BaseModel):
    model_config = {"extra": "allow"}

    image: Optional[str] = Field(default=None, description="Base64 encoded string or URL of document/image/pdf")
    file: Optional[str] = Field(default=None, description="Alternative alias for image/pdf input stream")
    pdf: Optional[str] = Field(default=None, description="Alternative alias for PDF input stream")
    prompt: Optional[str] = Field(default=None, description="Optional custom positive user prompt override")
    negative_prompt: Optional[str] = Field(default=None, alias="negativePrompt", description="Optional negative prompt (prohibitions & constraints)")
    variables: Optional[Dict[str, Any]] = Field(default=None, description="Dynamic JSON context variables")
    ai_api_key: Optional[str] = Field(default=None, description="External AI API Key when external key mode is active")
    ai_model_name: Optional[str] = Field(default=None, description="External AI Model Name when external key mode is active")


@router.post("/call")
async def execute_callcraft(
    payload: CallRequestPayload,
    request: Request,
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None, alias="X-USER-ID"),
    x_call_spec_id: Optional[str] = Header(None, alias="X-CALL-SPEC-ID"),
    x_call_public_key: Optional[str] = Header(None, alias="X-CALL-PUBLIC-KEY"),
    x_call_provider: Optional[str] = Header(None, alias="X-CALL-PROVIDER"),
    x_ai_api_key: Optional[str] = Header(None, alias="X-AI-API-KEY"),
    x_ai_model_name: Optional[str] = Header(None, alias="X-AI-MODEL-NAME"),
    x_call_show_prompt: Optional[str] = Header(None, alias="X-CALL-SHOW-PROMPT"),
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    start_time = time.time()
    request_id = f"req_{str(ulid.new())}"
    trace_id = f"trc_{str(ulid.new())[:12]}"

    if not x_user_id or not x_user_id.strip():
        return create_error_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="MISSING_USER_ID",
            message="Header 'X-USER-ID' wajib diisi untuk verifikasi identitas user",
            actionable_step="Sertakan header 'X-USER-ID: <user_id>' pada request API Anda.",
            request_id=request_id,
            start_time=start_time,
        )

    user_id = x_user_id.strip()

    should_show_prompt = bool(x_call_show_prompt and x_call_show_prompt.strip().lower() == "true")

    # 1. Authenticate Bearer API Key dynamically against DB credentials (STRICT - NO FALLBACKS)
    if not authorization or not authorization.startswith("Bearer "):
        return create_error_response(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="UNAUTHORIZED_MISSING_TOKEN",
            message="Bearer API key tidak ditemukan dalam header Authorization",
            actionable_step="Sertakan header 'Authorization: Bearer <secret_key>' dalam request API Anda.",
            request_id=request_id,
            start_time=start_time,
        )

    if not x_call_public_key or not x_call_public_key.strip():
        return create_error_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="MISSING_PUBLIC_KEY",
            message="Header 'X-CALL-PUBLIC-KEY' wajib diisi untuk verifikasi identitas API Key",
            actionable_step="Sertakan header 'X-CALL-PUBLIC-KEY: pk_live_...' pada request API Anda.",
            request_id=request_id,
            start_time=start_time,
        )

    secret_key = authorization.replace("Bearer ", "").strip()
    cred = await Repository.verify_api_credential(
        db, secret_key, public_key=x_call_public_key.strip(), user_id=user_id
    )

    if not cred:
        return create_error_response(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="INVALID_API_KEY",
            message="Kunci API (Public Key / Secret Key) tidak valid, tidak cocok, atau telah dicabut",
            actionable_step="Gunakan pasangan Public Key dan Secret Key aktif dari akun Anda.",
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

    # 2b. Enforce strict Project Isolation between Customer API Key and target Call Spec
    cred_project_id = cred.get("project_id") if cred else None
    spec_project_id = cached_spec.get("projectId") if cached_spec else None
    if cred_project_id and spec_project_id and cred_project_id != spec_project_id:
        logger.warning(f"Project mismatch during API execution: Key project '{cred_project_id}' != Spec project '{spec_project_id}'")
        return create_error_response(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="PROJECT_MISMATCH",
            message="Akses Ditolak: Kunci API yang Anda gunakan terikat dengan project yang berbeda dari Call Spec ini.",
            details=[{"cred_project_id": cred_project_id, "spec_project_id": spec_project_id}],
            actionable_step="Gunakan API Key yang terdaftar pada project yang sama dengan Call Spec yang dieksekusi.",
            request_id=request_id,
            start_time=start_time,
        )

    # 3. Model & AI Provider Resolution Flow from Database
    header_key = x_ai_api_key
    header_model = x_ai_model_name
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
        user_ai_key = await Repository.get_user_ai_provider_key(db, user_id, provider_code, project_id=spec_project_id)
        active_api_key = (
            user_ai_key
            or cached_spec.get("externalApiKey")
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

    # 4. Process Image / PDF Input Streams directly in RAM (Support multiple images/documents)
    image_files: List[Tuple[bytes, str]] = []

    async def _process_and_append_source(src: Any):
        if not src:
            return
        if isinstance(src, str) and (src.startswith(("http://", "https://", "data:")) or len(src) > 100):
            try:
                b, m = await process_image_input(src)
                if b:
                    image_files.append((b, m))
            except Exception as e:
                logger.warning(f"[Callcraft API] Error processing image source: {e}")
        elif isinstance(src, list):
            for item in src:
                await _process_and_append_source(item)

    extra_fields = (payload.model_extra or {}) if hasattr(payload, "model_extra") else {}
    if extra_fields:
        for k, v in extra_fields.items():
            await _process_and_append_source(v)

    payload_data = getattr(payload, "data", None)
    if payload_data and isinstance(payload_data, dict):
        for k, v in payload_data.items():
            await _process_and_append_source(v)

    if not image_files:
        await _process_and_append_source(payload.pdf)
        await _process_and_append_source(payload.file)
        await _process_and_append_source(payload.image)

    image_bytes = image_files[0][0] if image_files else None
    mime_type = image_files[0][1] if image_files else None
    input_type = "multi" if len(image_files) > 1 else ("base64" if image_files else "none")
    input_size_bytes = sum(len(b) for b, _ in image_files)

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
        
        raw_req = fmeta.get("required")
        if isinstance(raw_req, bool):
            is_req = raw_req
        elif req_list:
            is_req = fname in req_list
        else:
            is_req = True

        field_defs[fname] = parse_dict_to_field_def(fmeta, is_required=is_req)
    
    response_schema_obj = ResponseSchema(properties=field_defs)

    # Resolve configured Tool Name and Agent Name from "Tool Calling & Multi-Agent Execution Configuration"
    tools_cfg = cached_spec.get("tools_config") or cached_spec.get("toolsConfig") or {}
    tools_list = tools_cfg.get("tools") if isinstance(tools_cfg.get("tools"), list) else []

    configured_tool_name = None
    configured_tool_desc = None
    configured_agent_name = None

    if tools_list:
        first_tool = tools_list[0]
        if isinstance(first_tool, dict) and first_tool.get("name"):
            configured_tool_name = first_tool.get("name").strip()
            if first_tool.get("description"):
                configured_tool_desc = first_tool.get("description").strip()
            if first_tool.get("agentRole"):
                configured_agent_name = first_tool.get("agentRole").strip()

    if not configured_tool_name:
        slug_name = (cached_spec.get("slug") or "").replace("-", "_").strip()
        configured_tool_name = f"extract_{slug_name}" if slug_name else "extract_data"

    if not configured_tool_desc:
        configured_tool_desc = f"Extract structured data for {cached_spec.get('name', 'specification')}"

    if not configured_agent_name:
        configured_agent_name = "vision_parser" if image_bytes else "data_retriever"

    # Generate tool schemas for all tools in tools_list so the AI model can perform pure autonomous tool selection
    tools_schemas: List[Dict[str, Any]] = []
    if tools_list:
        for t in tools_list:
            if isinstance(t, dict) and t.get("name"):
                tn = str(t.get("name")).strip()
                td = str(t.get("description") or f"Extract structured data for {tn}").strip()
                ctx = t.get("context") if isinstance(t.get("context"), dict) else {}
                ctx_imgs = t.get("imagesContext") or ctx.get("imagesContext") or []
                if ctx_imgs and isinstance(ctx_imgs, list) and len(ctx_imgs) > 0:
                    td += f" [Multimodal Reference Image Context: {len(ctx_imgs)} sample documents attached]"
                ts = generate_ai_tool_schema(tn, td, response_schema_obj)
                tools_schemas.append(ts)

    if not tools_schemas:
        slug_name = (cached_spec.get("slug") or "").replace("-", "_").strip()
        def_name = f"extract_{slug_name}" if slug_name else "extract_data"
        def_desc = f"Extract structured data for {cached_spec.get('name', 'specification')}"
        tools_schemas = [generate_ai_tool_schema(def_name, def_desc, response_schema_obj)]

    # 5. Build prompt builder strictly with Positive Prompt, Additional Prompt (if allowed), and Negative Prompt
    positive_prompt = cached_spec.get("positivePrompt") or cached_spec.get("extractionPrompt") or ""
    negative_prompt = cached_spec.get("negativePrompt") or ""

    allow_add_prompt = cached_spec.get("allowAdditionalPrompt")
    if allow_add_prompt is None:
        allow_add_prompt = True

    additional_user_prompt = ""
    if allow_add_prompt:
        payload_data = getattr(payload, "data", None)
        user_input_prompt = payload.prompt or (payload_data.get("prompt") if isinstance(payload_data, dict) else None)
        additional_user_prompt = user_input_prompt or cached_spec.get("additionalPrompt") or ""

    # Interpolate dynamic template variables {{variable_name}} if payload.variables is provided
    if payload.variables and isinstance(payload.variables, dict):
        for k, v in payload.variables.items():
            placeholder = f"{{{{{k}}}}}"
            if positive_prompt and placeholder in positive_prompt:
                positive_prompt = positive_prompt.replace(placeholder, str(v))
            if negative_prompt and placeholder in negative_prompt:
                negative_prompt = negative_prompt.replace(placeholder, str(v))

    # Collect all dynamic request payload fields (e.g. text inputs or custom schema parameters sent by client)
    request_inputs = {}
    extra_fields = (payload.model_extra or {}) if hasattr(payload, "model_extra") else {}
    if extra_fields:
        for k, v in extra_fields.items():
            if k in ("prompt", "negativePrompt", "negative_prompt", "variables", "ai_api_key", "ai_model_name", "image", "file", "pdf"):
                continue
            request_inputs[k] = v

    payload_data = getattr(payload, "data", None)
    if payload_data and isinstance(payload_data, dict):
        for k, v in payload_data.items():
            if k in ("prompt", "negativePrompt", "negative_prompt", "variables", "ai_api_key", "ai_model_name", "image", "file", "pdf"):
                continue
            request_inputs[k] = v

    # Construct complete prompt builder text matching exact AI input JSON
    import json
    prompt_parts = []
    if positive_prompt:
        prompt_parts.append(f"=== POSITIVE PROMPT ===\n{positive_prompt}")
    if additional_user_prompt:
        prompt_parts.append(f"=== ADDITIONAL PROMPT (USER INSTRUCTION) ===\n{additional_user_prompt}")
    if negative_prompt:
        prompt_parts.append(f"=== NEGATIVE PROMPT ===\n{negative_prompt}")
    if request_inputs:
        prompt_parts.append(f"=== REQUEST PAYLOAD INPUTS ===\n{json.dumps(request_inputs, indent=2)}")
    if payload.variables and isinstance(payload.variables, dict) and payload.variables:
        prompt_parts.append(f"=== INPUT CONTEXT VARIABLES ===\n{json.dumps(payload.variables, indent=2)}")
    if tools_schemas:
        if len(tools_schemas) == 1:
            ts_copy = json.loads(json.dumps(tools_schemas[0]))
            if isinstance(ts_copy, dict) and isinstance(ts_copy.get("function"), dict) and isinstance(ts_copy["function"].get("parameters"), dict) and isinstance(ts_copy["function"]["parameters"].get("properties"), dict):
                ts_copy["function"]["parameters"]["properties"].pop("_ai_commentary", None)
            func_obj = ts_copy.get("function", ts_copy)
            fn_name = func_obj.get("name", "extract_data") if isinstance(func_obj, dict) else "extract_data"
            prompt_parts.append(f"=== AI TOOL SCHEMA ({fn_name}) ===\n{json.dumps(ts_copy, indent=2)}")
        else:
            schemas_desc = ["Available Function Tools Declared:"]
            for ts in tools_schemas:
                func_obj = ts.get("function", ts)
                if isinstance(func_obj, dict):
                    schemas_desc.append(f"- {func_obj.get('name')}: {func_obj.get('description', '')}")

            first_func = tools_schemas[0].get("function", {}) if isinstance(tools_schemas[0], dict) else {}
            params_raw = first_func.get("parameters", {}) if isinstance(first_func, dict) else {}
            params_clean = json.loads(json.dumps(params_raw))
            if isinstance(params_clean, dict) and isinstance(params_clean.get("properties"), dict):
                params_clean["properties"].pop("_ai_commentary", None)

            if params_clean:
                schemas_desc.append(f"\nResponse Schema Parameters:\n{json.dumps(params_clean, indent=2)}")

            prompt_parts.append(f"=== AI TOOL SCHEMAS SUITE ({len(tools_schemas)} Functions) ===\n" + "\n".join(schemas_desc))

    raw_prompt_builder = "\n\n".join(prompt_parts)
    prompt_builder_res = truncate_base64_in_prompt(raw_prompt_builder) if should_show_prompt else ""

    effective_image_bytes = image_bytes
    effective_mime_type = mime_type

    # Dispatch to AI Provider Adapter with multi-tool schema declarations
    tool_schema_param = tools_schemas[0] if len(tools_schemas) == 1 else tools_schemas

    prompt_blocks = []
    if positive_prompt:
        prompt_blocks.append(positive_prompt)
    if additional_user_prompt:
        prompt_blocks.append(f"[USER INSTRUCTION / ADDITIONAL PROMPT]\n{additional_user_prompt}")
    if request_inputs:
        clean_text_inputs = {}
        for k, v in request_inputs.items():
            if isinstance(v, str) and (v.startswith("data:") or len(v) > 200):
                continue
            clean_text_inputs[k] = v
        if clean_text_inputs:
            prompt_blocks.append(f"[REQUEST INPUT PARAMETERS]\n{json.dumps(clean_text_inputs, indent=2)}")
    if negative_prompt:
        prompt_blocks.append(f"[NEGATIVE PROMPT / CONSTRAINTS & PROHIBITIONS]\n{negative_prompt}")

    full_user_prompt = "\n\n".join(prompt_blocks).strip()

    try:
        raw_ai_out, tokens = await adapter.execute_structured_extraction(
            image_bytes=effective_image_bytes,
            mime_type=effective_mime_type,
            images=image_files if image_files else None,
            tool_schema=tool_schema_param,
            system_prompt=None,
            user_prompt=full_user_prompt,
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
        coerced_data = validate_and_coerce(response_schema_obj, raw_ai_out, allow_missing_required=False)
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

    # Calculate token usage metrics and costs dynamically from DB model info
    prompt_tokens = tokens.get("prompt_tokens", 0)
    completion_tokens = tokens.get("completion_tokens", 0)

    cost_prompt = (model_info.get("costPer1kPromptTokens") or 0.0) * (prompt_tokens / 1000.0)
    cost_comp = (model_info.get("costPer1kCompletionTokens") or 0.0) * (completion_tokens / 1000.0)
    estimated_cost_usd = round(cost_prompt + cost_comp, 6)

    # 9. Asynchronously record usage stats to DB & push event payload to Outbox queue
    outbox_payload = {
        "event": "api_request.completed",
        "request_id": request_id,
        "user_id": user_id,
        "spec_slug": spec_slug,
        "provider_code": provider_code,
        "model_identifier": active_model,
        "status": "success",
        "http_status": 200,
        "input_type": "image" if image_bytes else "text",
        "input_size_bytes": len(image_bytes) if image_bytes else 0,
        "processing_time_ms": processing_time_ms,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens": prompt_tokens + completion_tokens,
        "estimated_cost_usd": estimated_cost_usd,
        "client_ip": get_client_ip(request),
        "user_agent": request.headers.get("User-Agent"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await redis_service.push_outbox(outbox_payload)

    # 9. Build executionTrace steps purely from AI model function call decision (execution_service.py)
    execution_steps = build_execution_trace_steps(
        raw_ai_out=raw_ai_out,
        tools_list=tools_list,
        configured_tool_name=configured_tool_name,
        configured_agent_name=configured_agent_name,
        processing_time_ms=processing_time_ms,
    )

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
        execution_steps=execution_steps,
        image_bytes=image_bytes,
        prompt_builder=prompt_builder_res,
    )
