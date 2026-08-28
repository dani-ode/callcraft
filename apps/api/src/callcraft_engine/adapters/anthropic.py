import base64
import json
import logging
from typing import Any, Dict, List, Optional, Tuple, Union
import httpx
from callcraft_engine.adapters.base import BaseAIAdapter

logger = logging.getLogger("callcraft.engine.adapter.anthropic")


class AnthropicAdapter(BaseAIAdapter):
    async def execute_structured_extraction(
        self,
        image_bytes: Optional[bytes],
        mime_type: Optional[str],
        tool_schema: Union[Dict[str, Any], List[Dict[str, Any]]],
        system_prompt: Optional[str],
        user_prompt: Optional[str],
        api_key: str,
        model_identifier: str = "claude-sonnet-5",
        images: Optional[List[Tuple[bytes, str]]] = None,
    ) -> Tuple[Dict[str, Any], Dict[str, int]]:
        if not api_key or not api_key.strip():
            raise ValueError("Anthropic API Key is missing. Please configure a valid API key in settings or request header.")

        url = "https://api.anthropic.com/v1/messages"

        tools_list = tool_schema if isinstance(tool_schema, list) else [tool_schema]
        anthropic_tools = []
        for ts in tools_list:
            if isinstance(ts, dict):
                fn = ts.get("function", ts) if isinstance(ts, dict) else ts
                f_name = fn.get("name", "extract_structured_data") if isinstance(fn, dict) else "extract_structured_data"
                f_desc = fn.get("description", "Extract structured JSON data") if isinstance(fn, dict) else "Extract structured JSON data"
                f_params = fn.get("parameters", fn) if isinstance(fn, dict) else fn
                anthropic_tools.append({
                    "name": f_name,
                    "description": f_desc,
                    "input_schema": f_params,
                })

        first_tool_name = anthropic_tools[0]["name"] if anthropic_tools else "extract_structured_data"

        user_content = []
        if user_prompt:
            user_content.append({"type": "text", "text": user_prompt})

        if images:
            for img_b, m_t in images:
                b64_str = base64.b64encode(img_b).decode("utf-8")
                media = m_t or "image/jpeg"
                user_content.append({
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media,
                        "data": b64_str,
                    },
                })
        elif image_bytes:
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
            "tools": anthropic_tools,
            "tool_choice": {"type": "auto"} if len(anthropic_tools) > 1 else {"type": "tool", "name": first_tool_name},
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
                executed_tools = []
                for block in content_blocks:
                    if block.get("type") == "tool_use":
                        executed_tools.append({
                            "name": block.get("name") or first_tool_name,
                            "status": "success",
                        })
                        if extracted_json is None:
                            extracted_json = block.get("input", {})

                if extracted_json is None and content_blocks:
                    text_block = content_blocks[0].get("text", "")
                    try:
                        extracted_json = json.loads(text_block)
                    except Exception:
                        raise ValueError(f"Anthropic API returned non-JSON text output: {text_block[:200]}")

                if isinstance(extracted_json, dict) and executed_tools:
                    extracted_json["_executed_tools"] = executed_tools

                usage = res_data.get("usage", {})
                tokens = {
                    "prompt_tokens": usage.get("input_tokens", 0),
                    "completion_tokens": usage.get("output_tokens", 0),
                    "total_tokens": usage.get("input_tokens", 0) + usage.get("output_tokens", 0),
                }

                return extracted_json or {}, tokens
            except httpx.RequestError as req_err:
                raise ValueError(f"Network error connecting to Anthropic API: {req_err}")
