import base64
import json
import logging
from typing import Any, Dict, Optional, Tuple
import httpx
from callcraft_engine.adapters.base import BaseAIAdapter

logger = logging.getLogger("callcraft.engine.adapter.anthropic")


class AnthropicAdapter(BaseAIAdapter):
    async def execute_structured_extraction(
        self,
        image_bytes: Optional[bytes],
        mime_type: Optional[str],
        tool_schema: Dict[str, Any],
        system_prompt: Optional[str],
        user_prompt: Optional[str],
        api_key: str,
        model_identifier: str = "claude-sonnet-5",
    ) -> Tuple[Dict[str, Any], Dict[str, int]]:
        if not api_key or not api_key.strip():
            raise ValueError("Anthropic API Key is missing. Please configure a valid API key in settings or request header.")

        url = "https://api.anthropic.com/v1/messages"
        func_name = tool_schema.get("name", "extract_structured_data")

        # Map Anthropic tool schema (input_schema instead of parameters)
        anthropic_tool = {
            "name": func_name,
            "description": tool_schema.get("description", "Extract structured JSON data"),
            "input_schema": tool_schema.get("parameters", tool_schema),
        }

        user_content = []
        if user_prompt:
            user_content.append({"type": "text", "text": user_prompt})

        if image_bytes:
            b64_str = base64.b64encode(image_bytes).decode("utf-8")
            media = mime_type or "image/jpeg"
            user_content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": media,
                    "data": b64_str,
                },
            })

        if not user_content:
            user_content.append({"type": "text", "text": "Extract structured data from the document."})

        messages = [{"role": "user", "content": user_content}]

        payload = {
            "model": model_identifier if "claude" in model_identifier else "claude-3-5-sonnet-20241022",
            "max_tokens": 4096,
            "messages": messages,
            "tools": [anthropic_tool],
            "tool_choice": {"type": "tool", "name": func_name},
        }

        if system_prompt:
            payload["system"] = system_prompt

        headers = {
            "x-api-key": api_key.strip(),
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code != 200:
                    err_json = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                    err_msg = err_json.get("error", {}).get("message") or resp.text or f"HTTP {resp.status_code}"
                    raise ValueError(f"Anthropic API Error [{resp.status_code}]: {err_msg}")

                res_data = resp.json()
                content_blocks = res_data.get("content", [])

                extracted_json = None
                for block in content_blocks:
                    if block.get("type") == "tool_use" and block.get("name") == func_name:
                        extracted_json = block.get("input", {})
                        break

                if extracted_json is None and content_blocks:
                    # Fallback parse text block as JSON
                    text_block = content_blocks[0].get("text", "")
                    try:
                        extracted_json = json.loads(text_block)
                    except Exception:
                        extracted_json = {"raw_response": text_block}

                usage = res_data.get("usage", {})
                tokens = {
                    "prompt_tokens": usage.get("input_tokens", 0),
                    "completion_tokens": usage.get("output_tokens", 0),
                    "total_tokens": usage.get("input_tokens", 0) + usage.get("output_tokens", 0),
                }

                return extracted_json or {}, tokens
            except httpx.RequestError as req_err:
                raise ValueError(f"Network error connecting to Anthropic API: {req_err}")
