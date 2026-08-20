import base64
import logging
from typing import Tuple
import httpx
from callcraft_engine.ssrf import SsrfError, validate_url_ip

logger = logging.getLogger("callcraft.engine.buffer")


class BufferHandlerError(Exception):
    pass


async def process_image_input(image_input: str) -> Tuple[bytes, str]:
    """
    Decodes Base64 string OR downloads HTTP/HTTPS URL directly into RAM bytes.
    Zero disk storage residual.
    Returns: Tuple[bytes, mime_type]
    """
    if not image_input:
        raise BufferHandlerError("Empty image input string")

    # Handle HTTP/HTTPS URL
    if image_input.startswith(("http://", "https://")):
        # Validate SSRF
        validate_url_ip(image_input)

        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            try:
                resp = await client.get(image_input)
                resp.raise_for_status()
                content_type = resp.headers.get("content-type", "image/jpeg").split(";")[0]
                return resp.content, content_type
            except Exception as e:
                raise BufferHandlerError(f"Failed to fetch remote image URL: {e}")

    # Handle Base64 Data URL or raw Base64 string
    raw_b64 = image_input
    mime_type = "image/jpeg"

    if image_input.startswith("data:"):
        header, _, encoded = image_input.partition(",")
        if "image/png" in header:
            mime_type = "image/png"
        elif "image/webp" in header:
            mime_type = "image/webp"
        elif "application/pdf" in header:
            mime_type = "application/pdf"
        raw_b64 = encoded

    try:
        data_bytes = base64.b64decode(raw_b64)
        return data_bytes, mime_type
    except Exception as e:
        raise BufferHandlerError(f"Failed to decode Base64 string: {e}")
