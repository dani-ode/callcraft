from typing import Optional
from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from callcraft_api.db.repository import Repository
from callcraft_api.db.session import get_db_session

router = APIRouter(prefix="/internal/v1", tags=["Internal Service Auth"])


@router.get("/status")
async def internal_status(
    x_service_client_id: Optional[str] = Header(None, alias="X-Service-Client-Id"),
    x_service_client_secret: Optional[str] = Header(None, alias="X-Service-Client-Secret"),
):
    return {
        "channel": "internal",
        "service_client_id": x_service_client_id or "svc_nextjs_main",
        "status": "active",
    }


@router.get("/specs")
async def list_specs(
    user_id: str = "usr_default_dev_01",
    db: Optional[AsyncSession] = Depends(get_db_session),
):
    spec = await Repository.get_call_spec(db, user_id, "ktp-parser")
    spec2 = await Repository.get_call_spec(db, user_id, "invoice-extractor")
    return [
        spec or {
            "id": "spc_01HZX01SPEC0000000001",
            "name": "Indonesian KTP Parser",
            "slug": "ktp-parser",
            "description": "Extracts NIK, Full Name, DOB, Gender, and Address from KTP image.",
            "activeVersionNumber": 1,
            "status": "active",
            "responseSchema": {
                "properties": {
                    "nik": {"type": "string", "required": True},
                    "full_name": {"type": "string", "required": True},
                    "gender": {"type": "enum", "enum_values": ["LAKI-LAKI", "PEREMPUAN"], "required": True},
                }
            },
        },
        spec2 or {
            "id": "spc_01HZX01SPEC0000000002",
            "name": "Invoice Data Extractor",
            "slug": "invoice-extractor",
            "description": "Extracts invoice number, vendor name, invoice date, line items, and total amount.",
            "activeVersionNumber": 2,
            "status": "active",
            "responseSchema": {
                "properties": {
                    "invoice_number": {"type": "string", "required": True},
                    "vendor_name": {"type": "string", "required": True},
                    "total_amount": {"type": "number", "required": True},
                }
            },
        },
    ]
