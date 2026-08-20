import base64
import json
import logging
from typing import Any, Dict, Optional, Tuple
import httpx
from callcraft_engine.adapters.base import BaseAIAdapter

logger = logging.getLogger("callcraft.engine.adapter.gemini")


class GeminiAdapter(BaseAIAdapter):
    async def execute_structured_extraction(
        self,
        image_bytes: Optional[bytes],
        mime_type: Optional[str],
        tool_schema: Dict[str, Any],
        system_prompt: Optional[str],
        user_prompt: Optional[str],
        api_key: str,
        model_identifier: str = "gemini-1.5-flash",
    ) -> Tuple[Dict[str, Any], Dict[str, int]]:
        if not api_key or not api_key.strip():
            raise ValueError("Google Gemini API Key is missing. Please configure a valid API key in settings or request header.")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_identifier}:generateContent?key={api_key}"

        contents = []
        parts = []

        if system_prompt:
            parts.append({"text": f"System Instructions: {system_prompt}"})

        if user_prompt:
            parts.append({"text": f"Extraction Request: {user_prompt}"})

        if image_bytes:
            b64_str = base64.b64encode(image_bytes).decode("utf-8")
            parts.append({
                "inline_data": {
                    "mime_type": mime_type or "image/jpeg",
                    "data": b64_str,
                }
            })

        if not parts:
            parts.append({"text": "Extract structured JSON payload according to function tool specification."})

        contents.append({"parts": parts})

        payload = {
            "contents": contents,
            "tools": [{"function_declarations": [tool_schema]}],
            "tool_config": {
                "function_calling_config": {
                    "mode": "ANY",
                    "allowed_function_names": [tool_schema.get("name", "extract_structured_data")],
                }
            },
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                resp = await client.post(url, json=payload)
                if resp.status_code != 200:
                    err_json = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                    err_msg = err_json.get("error", {}).get("message") or resp.text or f"HTTP {resp.status_code}"
                    raise ValueError(f"Gemini API Error [{resp.status_code}]: {err_msg}")

                res_data = resp.json()
                candidates = res_data.get("candidates", [])
                if not candidates:
                    raise ValueError("No candidates returned from Gemini API response.")

                part = candidates[0].get("content", {}).get("parts", [])[0]
                func_call = part.get("functionCall", {})
                raw_args = func_call.get("args", {})

                if not raw_args:
                    raise ValueError("Gemini API failed to return tool function arguments.")

                usage = res_data.get("usageMetadata", {})
                tokens = {
                    "prompt_tokens": usage.get("promptTokenCount", 0),
                    "completion_tokens": usage.get("candidatesTokenCount", 0),
                    "total_tokens": usage.get("totalTokenCount", 0),
                }

                return raw_args, tokens
            except httpx.RequestError as e:
                raise ValueError(f"Network error connecting to Google Gemini API: {e}")
