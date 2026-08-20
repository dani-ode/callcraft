import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Add src to python path for internal imports
sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from callcraft_engine import (
    CoercionError,
    FieldDefinition,
    PlatformDataType,
    ResponseSchema,
    SsrfError,
    generate_ai_tool_schema,
    validate_and_coerce,
    validate_url_ip,
)

app = FastAPI(
    title="Callcraft Data Plane API",
    description="AI-Powered Dynamic Multimodal Execution Engine & Gateway",
    version="0.1.0",
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CallRequestPayload(BaseModel):
    image: Optional[str] = Field(default=None, description="Base64 encoded string or URL of document/image")
    prompt: Optional[str] = Field(default=None, description="Optional custom user prompt override")
    variables: Optional[Dict[str, Any]] = Field(default=None, description="Dynamic JSON context variables")


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "callcraft-api",
        "version": "0.1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# Channel 1: Internal Service Routes (/internal/v1/*)
@app.get("/internal/v1/status")
async def internal_status(
    x_service_client_id: Optional[str] = Header(None, alias="X-Service-Client-Id"),
    x_service_client_secret: Optional[str] = Header(None, alias="X-Service-Client-Secret"),
):
    return {
        "channel": "internal",
        "service_client_id": x_service_client_id or "svc_nextjs_main",
        "status": "active",
    }


# Channel 2: Public Customer Execution Data Plane (/v1/call/{user_id})
@app.post("/v1/call/{user_id}")
async def execute_callcraft(
    user_id: str,
    payload: CallRequestPayload,
    authorization: Optional[str] = Header(None),
    x_call_spec_id: Optional[str] = Header(None, alias="X-CALL-SPEC-ID"),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Bearer API key in Authorization header",
        )

    api_key = authorization.replace("Bearer ", "").strip()
    spec_id = x_call_spec_id or "default_spec_01"

    # Validate image URL if provided as URL string
    if payload.image and payload.image.startswith(("http://", "https://")):
        try:
            validate_url_ip(payload.image)
        except SsrfError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )

    # Sample mock schema execution response
    sample_props = {
        "nik": FieldDefinition(type=PlatformDataType.STRING, required=True),
        "full_name": FieldDefinition(type=PlatformDataType.STRING, required=True),
        "gender": FieldDefinition(
            type=PlatformDataType.ENUM,
            required=True,
            enum_values=["LAKI-LAKI", "PEREMPUAN"],
        ),
    }
    sample_schema = ResponseSchema(properties=sample_props)

    raw_ai_mock = {
        "nik": "3271041508950001",
        "full_name": "BUDI SANTOSO",
        "gender": "laki-laki",
    }

    try:
        coerced_data = validate_and_coerce(sample_schema, raw_ai_mock)
    except CoercionError as err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Schema coercion failed: {err}",
        )

    return {
        "success": True,
        "request_id": f"req_{user_id[:8]}_{int(datetime.now().timestamp())}",
        "spec": {
            "id": spec_id,
            "name": "Dynamic Callcraft Specification",
            "version": 1,
        },
        "execution": {
            "provider": "gemini",
            "model": "gemini-1.5-flash",
            "processing_time_ms": 950,
            "tokens": {"total_tokens": 780},
        },
        "data": coerced_data,
    }


# Channel 3: Admin Platform Routes (/admin/v1/*)
@app.get("/admin/v1/status")
async def admin_status():
    return {
        "channel": "admin",
        "system_status": "healthy",
        "active_models": ["gemini-1.5-flash", "gpt-4o", "claude-3-5-sonnet"],
    }
