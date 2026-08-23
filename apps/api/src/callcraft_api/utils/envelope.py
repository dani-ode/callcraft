import time
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import ulid

from fastapi.responses import JSONResponse

logger = logging.getLogger("callcraft.api.envelope")


def infer_error_code(status_code: int, detail_message: str) -> str:
    """Infers standard error code string from HTTP status code and detail text."""
    msg_lower = detail_message.lower()

    if status_code == 401:
        if "bearer" in msg_lower or "missing" in msg_lower:
            return "UNAUTHORIZED_MISSING_TOKEN"
        return "INVALID_API_KEY"

    if status_code == 403:
        if "ip" in msg_lower or "whitelist" in msg_lower:
            return "IP_NOT_WHITELISTED"
        return "FORBIDDEN_ACCESS"

    if status_code == 404:
        if "spec" in msg_lower:
            return "SPEC_NOT_FOUND"
        return "RESOURCE_NOT_FOUND"

    if status_code == 400:
        if "model" in msg_lower or "tidak didukung" in msg_lower:
            return "UNSUPPORTED_AI_MODEL"
        if "ssrf" in msg_lower or "security" in msg_lower:
            return "SSRF_SECURITY_VIOLATION"
        if "input" in msg_lower or "file" in msg_lower or "stream" in msg_lower:
            return "INVALID_INPUT_STREAM"
        return "BAD_REQUEST"

    if status_code == 422:
        if "coercion" in msg_lower or "schema" in msg_lower:
            return "SCHEMA_COERCION_FAILED"
        return "INVALID_REQUEST_PAYLOAD"

    if status_code == 429:
        return "RATE_LIMIT_EXCEEDED"

    if status_code == 502:
        if "connection" in msg_lower or "timeout" in msg_lower or "connect" in msg_lower:
            return "AI_CONNECTION_FAILED"
        return "AI_PROVIDER_EXECUTION_FAILED"

    if status_code == 503:
        return "SERVICE_UNAVAILABLE"

    return "INTERNAL_SERVER_ERROR"


def infer_actionable_step(status_code: int, error_code: str, detail_message: str) -> str:
    """Infers actionable developer advice to guide resolution of the error."""
    msg_lower = detail_message.lower()

    if error_code == "UNAUTHORIZED_MISSING_TOKEN":
        return "Sertakan header 'Authorization: Bearer <secret_key>' dalam request API Anda."
    if error_code == "INVALID_API_KEY":
        return "Gunakan API Secret Key aktif dari dashboard Callcraft (menu API Keys)."
    if error_code == "IP_NOT_WHITELISTED":
        return "Tambahkan IP server Anda ke daftar IP Whitelist API Key di dashboard Callcraft."
    if error_code == "SPEC_NOT_FOUND":
        return "Pastikan header X-CALL-SPEC-ID / slug spec sesuai dengan yang dibuat di dashboard."
    if error_code == "UNSUPPORTED_AI_MODEL":
        return "Pilih model AI yang didukung seperti gemini-3.6-flash atau gpt-5.6-luna."
    if error_code == "SSRF_SECURITY_VIOLATION":
        return "Gunakan URL dokumen publik yang aman atau kirimkan file sebagai Base64 string."
    if error_code == "INVALID_INPUT_STREAM":
        return "Pastikan dokumen berformat gambar (PNG/JPG) atau PDF yang valid."
    if error_code == "SCHEMA_COERCION_FAILED":
        return "Sesuaikan tipe data field pada Call Spec atau periksa kembali kejelasan dokumen."
    if error_code == "INVALID_REQUEST_PAYLOAD":
        return "Periksa kembali tipe data dan parameter JSON payload request Anda."
    if error_code == "RATE_LIMIT_EXCEEDED":
        return "Tunggu beberapa saat sebelum mengirimkan request kembali atau tingkatkan quota plan API Anda."
    if error_code in ("AI_CONNECTION_FAILED", "AI_PROVIDER_EXECUTION_FAILED"):
        return "Periksa kembali API Key provider AI Anda, koneksi jaringan server, atau coba beberapa saat lagi."
    if status_code >= 500:
        return "Terjadi kendala internal pada server. Silakan hubungi tim tim teknis atau coba beberapa saat lagi."

    return "Periksa kembali parameter request, header, dan kredensial API Anda."


def build_error_envelope(
    status_code: int,
    message: str,
    error_code: Optional[str] = None,
    details: Optional[List[Dict[str, Any]]] = None,
    actionable_step: Optional[str] = None,
    request_id: Optional[str] = None,
    start_time: Optional[float] = None,
) -> Dict[str, Any]:
    """Constructs a standardized Enterprise Error Envelope dictionary (qna-7.md)."""
    req_id = request_id or f"req_{str(ulid.new())}"
    duration_ms = int((time.time() - start_time) * 1000) if start_time else 0
    now_iso = datetime.now(timezone.utc).isoformat()

    code = error_code or infer_error_code(status_code, message)
    advice = actionable_step or infer_actionable_step(status_code, code, message)

def build_error_envelope(
    status_code: int,
    message: str,
    error_code: Optional[str] = None,
    details: Optional[List[Dict[str, Any]]] = None,
    actionable_step: Optional[str] = None,
    request_id: Optional[str] = None,
    start_time: Optional[float] = None,
) -> Dict[str, Any]:
    """Constructs a standardized Enterprise Error Envelope dictionary (qna-7.md)."""
    req_id = request_id or f"req_{str(ulid.new())}"
    duration_ms = int((time.time() - start_time) * 1000) if start_time else 0
    now_iso = datetime.now(timezone.utc).isoformat()

    code = error_code or infer_error_code(status_code, message)
    advice = actionable_step or infer_actionable_step(status_code, code, message)

    trace_block = {
        "totalDurationMs": duration_ms,
        "total_duration_ms": duration_ms,
        "steps": [],
        "warnings": [],
    }

    return {
        "meta": {
            "requestId": req_id,
            "request_id": req_id,
            "timestamp": now_iso,
            "status": "failed",
            "apiVersion": "v1.0",
            "api_version": "v1.0",
        },
        "error": {
            "code": code,
            "message": message,
            "details": details or [],
            "actionableStep": advice,
            "actionable_step": advice,
        },
        "executionTrace": trace_block,
        "execution_trace": trace_block,
        "detail": message,  # Backward compatibility field for standard FastAPI callers
    }


def create_error_response(
    status_code: int,
    message: str,
    error_code: Optional[str] = None,
    details: Optional[List[Dict[str, Any]]] = None,
    actionable_step: Optional[str] = None,
    request_id: Optional[str] = None,
    start_time: Optional[float] = None,
) -> JSONResponse:
    """Helper returning a FastAPI JSONResponse containing the standardized Error Envelope."""
    envelope = build_error_envelope(
        status_code=status_code,
        message=message,
        error_code=error_code,
        details=details,
        actionable_step=actionable_step,
        request_id=request_id,
        start_time=start_time,
    )
    return JSONResponse(status_code=status_code, content=envelope)


def build_success_envelope(
    coerced_data: Dict[str, Any],
    request_id: str,
    trace_id: str,
    processing_time_ms: int,
    provider_code: str,
    active_model: str,
    cached_spec: Dict[str, Any],
    tokens: Dict[str, int],
    estimated_cost_usd: float,
    execution_steps: List[Dict[str, Any]],
    image_bytes: Optional[bytes] = None,
    prompt_builder: Optional[str] = "",
) -> Dict[str, Any]:
    """Constructs a standardized Enterprise Success Envelope dictionary (qna-6.md)."""
    if not execution_steps:
        raise ValueError("execution_steps parameter must be a non-empty list of step dictionaries")

    now_iso = datetime.now(timezone.utc).isoformat()
    prompt_b_text = prompt_builder or ""

    prompt_tokens = tokens.get("prompt_tokens", 0)
    completion_tokens = tokens.get("completion_tokens", 0)
    total_tokens = tokens.get("total_tokens", prompt_tokens + completion_tokens)

    primary_res = {
        "type": "structured_json",
        "content": coerced_data,
    }
    human_msg = f"Ekstraksi terstruktur '{cached_spec['name']}' berhasil diproses via provider AI '{provider_code}' ({active_model})."

    trace_block = {
        "totalDurationMs": processing_time_ms,
        "total_duration_ms": processing_time_ms,
        "steps": execution_steps,
        "promptBuilder": prompt_b_text,
        "warnings": [],
    }

    return {
        "meta": {
            "requestId": request_id,
            "request_id": request_id,
            "traceId": trace_id,
            "trace_id": trace_id,
            "timestamp": now_iso,
            "status": "completed",
            "apiVersion": "v1.0",
            "api_version": "v1.0",
            "executionMode": "sync",
            "execution_mode": "sync",
        },
        "data": {
            "primaryResult": primary_res,
            "primary_result": primary_res,
            "humanReadableMessage": human_msg,
            "human_readable_message": human_msg,
        },
        "executionTrace": trace_block,
        "execution_trace": trace_block,
        "metrics": {
            "usage": {
                "promptTokens": prompt_tokens,
                "prompt_tokens": prompt_tokens,
                "completionTokens": completion_tokens,
                "completion_tokens": completion_tokens,
                "totalTokens": total_tokens,
                "total_tokens": total_tokens,
            },
            "estimatedCostUsd": estimated_cost_usd,
            "estimated_cost_usd": estimated_cost_usd,
        },
        # Top-level backward compatibility aliases for existing UI consumers:
        "success": True,
        "requestId": request_id,
        "spec": {
            "id": cached_spec["id"],
            "name": cached_spec["name"],
            "version": cached_spec.get("activeVersionNumber", 1),
            "useExternalApiKey": cached_spec.get("useExternalApiKey", True),
        },
        "execution": {
            "provider": provider_code,
            "model": active_model,
            "processingTimeMs": processing_time_ms,
            "tokens": tokens,
        },
    }
