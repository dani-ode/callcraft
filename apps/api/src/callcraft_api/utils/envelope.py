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
        return "Terjadi kendala internal pada server. Silakan hubungi tim teknis atau coba beberapa saat lagi."

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

    return {
        "meta": {
            "requestId": req_id,
            "timestamp": now_iso,
            "status": "failed",
            "apiVersion": "v1.0",
        },
        "error": {
            "code": code,
            "message": message,
            "details": details or [],
            "actionableStep": advice,
        },
        "executionTrace": {
            "totalDurationMs": duration_ms,
            "steps": [],
            "warnings": [],
        },
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
    if execution_steps is None:
        execution_steps = []

    now_iso = datetime.now(timezone.utc).isoformat()
    prompt_b_text = prompt_builder or ""

    prompt_tokens = tokens.get("prompt_tokens", tokens.get("promptTokens", 0))
    completion_tokens = tokens.get("completion_tokens", tokens.get("completionTokens", 0))
    total_tokens = tokens.get("total_tokens", tokens.get("totalTokens", prompt_tokens + completion_tokens))

    camel_tokens = {
        "promptTokens": prompt_tokens,
        "completionTokens": completion_tokens,
        "totalTokens": total_tokens,
    }

    formatted_steps = []
    for step in execution_steps:
        if isinstance(step, dict):
            formatted_steps.append({
                "stepId": step.get("stepId") or step.get("step_id", ""),
                "agent": step.get("agent", ""),
                "actionType": step.get("actionType") or step.get("action_type", ""),
                "toolName": step.get("toolName") or step.get("tool_name", ""),
                "status": step.get("status", ""),
                "durationMs": step.get("durationMs") if "durationMs" in step else step.get("duration_ms", 0),
            })
        else:
            formatted_steps.append(step)

    # Pop internal AI metadata keys so primaryResult.content stays clean
    coerced_data.pop("_executed_tools", None)
    ai_commentary = (
        coerced_data.pop("_ai_message", None)
        or coerced_data.pop("_ai_commentary", None)
        or coerced_data.pop("aiMessage", None)
        or coerced_data.pop("aiCommentary", None)
    )

    if not ai_commentary or not str(ai_commentary).strip():
        if formatted_steps:
            t_name = formatted_steps[0].get("toolName", "")
            ai_commentary = f"Ekstraksi terstruktur '{cached_spec.get('name', 'Spec')}' berhasil diproses via provider AI '{provider_code}' ({active_model}) menggunakan tool '{t_name}'."
        else:
            ai_commentary = f"Hasil ekstraksi terstruktur '{cached_spec.get('name', 'Spec')}' diproses via provider AI '{provider_code}' ({active_model})."

    return {
        "meta": {
            "requestId": request_id,
            "traceId": trace_id,
            "timestamp": now_iso,
            "status": "completed",
            "apiVersion": "v1.0",
            "executionMode": "sync",
        },
        "data": {
            "primaryResult": {
                "type": "structured_json",
                "content": coerced_data,
            },
            "humanReadableMessage": str(ai_commentary).strip(),
        },
        "executionTrace": {
            "totalDurationMs": processing_time_ms,
            "steps": formatted_steps,
            "promptBuilder": prompt_b_text,
            "warnings": [],
        },
        "metrics": {
            "usage": camel_tokens,
            "estimatedCostUsd": estimated_cost_usd,
        },
    }
