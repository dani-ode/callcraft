import logging
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from callcraft_api.config import settings
from callcraft_api.routers import admin, auth, health, internal, public
from callcraft_api.utils.envelope import build_error_envelope

logger = logging.getLogger("callcraft.api.exception")

app = FastAPI(
    title=settings.app_name,
    description="AI-Powered Dynamic Multimodal Execution Engine & Gateway",
    version="0.1.0",
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc):
    """Global exception handler converting HTTPExceptions into standard Error Envelopes (qna-7.md)."""
    status_code = exc.status_code
    detail = exc.detail

    if isinstance(detail, dict):
        message = detail.get("message") or detail.get("detail") or "HTTP Exception"
        error_code = detail.get("code")
        details = detail.get("details")
        actionable_step = detail.get("actionable_step")
    else:
        message = str(detail)
        error_code = None
        details = None
        actionable_step = None

    envelope = build_error_envelope(
        status_code=status_code,
        message=message,
        error_code=error_code,
        details=details,
        actionable_step=actionable_step,
    )
    return JSONResponse(status_code=status_code, content=envelope)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    """Global exception handler converting Pydantic RequestValidationErrors into standard Error Envelopes."""
    details = []
    for err in exc.errors():
        loc = " -> ".join([str(p) for p in err.get("loc", [])])
        details.append({
            "field": loc,
            "issue": err.get("msg", "Invalid field parameter"),
        })

    envelope = build_error_envelope(
        status_code=422,
        message="Validasi struktur payload request gagal",
        error_code="INVALID_REQUEST_PAYLOAD",
        details=details,
        actionable_step="Periksa kembali parameter payload dan pastikan tipe data sesuai dengan skema API.",
    )
    return JSONResponse(status_code=422, content=envelope)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc):
    """Global exception handler catching unexpected server & AI connection errors."""
    logger.error(f"Unhandled Server Exception: {exc}", exc_info=True)
    exc_str = str(exc)
    exc_name = type(exc).__name__

    if "Connect" in exc_name or "Timeout" in exc_name or "httpx" in type(exc).__module__:
        status_code = 502
        error_code = "AI_CONNECTION_FAILED"
        message = f"Gagal terhubung ke service provider AI: {exc_str}"
        actionable_step = "Periksa koneksi jaringan server atau status server provider AI Anda."
    else:
        status_code = 500
        error_code = "INTERNAL_SERVER_ERROR"
        message = f"Terjadi kesalahan internal pada server: {exc_str}"
        actionable_step = "Silakan hubungi tim teknis Callcraft atau coba beberapa saat lagi."

    envelope = build_error_envelope(
        status_code=status_code,
        message=message,
        error_code=error_code,
        actionable_step=actionable_step,
    )
    return JSONResponse(status_code=status_code, content=envelope)


# Include Routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(public.router)
app.include_router(internal.router)
app.include_router(admin.router)
