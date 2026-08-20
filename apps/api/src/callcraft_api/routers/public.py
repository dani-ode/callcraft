from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field

from callcraft_engine import (
    CoercionError,
    FieldDefinition,
    PlatformDataType,
    ResponseSchema,
    SsrfError,
    validate_and_coerce,
    validate_url_ip,
)

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

    # Sample schema execution response
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
