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

        # If live API key is missing or mock key provided in dev, return mock structured output
        if not api_key or api_key.startswith("mock_") or api_key == "demo":
            logger.info("Using Gemini mock extraction response for dev/demo key.")
            mock_data = {
                "nik": "3271041508950001",
                "full_name": "BUDI SANTOSO",
                "gender": "LAKI-LAKI",
                "date_of_birth": "1995-08-15",
                "invoice_number": "INV-2026-8899",
                "vendor_name": "CALLCRAFT TECH",
                "total_amount": 1500000.0,
            }
            # Filter fields according to tool schema
            func_props = tool_schema.get("parameters", {}).get("properties", {})
            filtered = {k: v for k, v in mock_data.items() if k in func_props}
            if not filtered:
                filtered = mock_data
            return filtered, {"prompt_tokens": 450, "completion_tokens": 120, "total_tokens": 570}

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            res_data = resp.json()

            # Parse function call response
            candidates = res_data.get("candidates", [])
            if not candidates:
                raise ValueError("No candidates returned from Gemini API")

            part = candidates[0].get("content", {}).get("parts", [])[0]
            func_call = part.get("functionCall", {})
            raw_args = func_call.get("args", {})

            usage = res_data.get("usageMetadata", {})
            tokens = {
                "prompt_tokens": usage.get("promptTokenCount", 0),
                "completion_tokens": usage.get("candidatesTokenCount", 0),
                "total_tokens": usage.get("totalTokenCount", 0),
            }

            return raw_args, tokens
