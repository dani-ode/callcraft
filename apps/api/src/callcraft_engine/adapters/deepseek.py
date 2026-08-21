import base64
import json
import logging
from typing import Any, Dict, Optional, Tuple
import httpx
from callcraft_engine.adapters.base import BaseAIAdapter

logger = logging.getLogger("callcraft.engine.adapter.deepseek")


class DeepSeekAdapter(BaseAIAdapter):
    async def execute_structured_extraction(
        self,
        image_bytes: Optional[bytes],
        mime_type: Optional[str],
        tool_schema: Dict[str, Any],
        system_prompt: Optional[str],
        user_prompt: Optional[str],
        api_key: str,
        model_identifier: str = "deepseek-v4-pro",
    ) -> Tuple[Dict[str, Any], Dict[str, int]]:
        if not api_key or not api_key.strip():
            raise ValueError("DeepSeek AI API Key is missing. Please configure a valid API key in settings or request header.")

        url = "https://api.deepseek.com/chat/completions"

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        user_content = []
        if user_prompt:
            user_content.append({"type": "text", "text": user_prompt})

        if image_bytes:
            b64_str = base64.b64encode(image_bytes).decode("utf-8")
            media = mime_type or "image/jpeg"
            user_content.append({
                "type": "image_url",
                "image_url": {"url": f"data:{media};base64,{b64_str}"},
            })

        if not user_content:
            user_content.append({"type": "text", "text": "Extract structured JSON from document."})

        messages.append({"role": "user", "content": user_content})

        func_name = tool_schema.get("name", "extract_structured_data")
        tools = [{
            "type": "function",
            "function": tool_schema,
        }]

        payload = {
            "model": model_identifier if "deepseek" in model_identifier else "deepseek-chat",
            "messages": messages,
            "tools": tools,
            "tool_choice": {"type": "function", "function": {"name": func_name}},
        }

        headers = {
            "Authorization": f"Bearer {api_key.strip()}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code != 200:
                    err_json = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                    err_msg = err_json.get("error", {}).get("message") or resp.text or f"HTTP {resp.status_code}"
                    raise ValueError(f"DeepSeek API Error [{resp.status_code}]: {err_msg}")

                res_data = resp.json()
                choices = res_data.get("choices", [])
                if not choices:
                    raise ValueError("DeepSeek API returned an empty response choices list.")

                message = choices[0].get("message", {})
                tool_calls = message.get("tool_calls", [])

                extracted_json = None
                if tool_calls:
                    call = tool_calls[0]
                    args_str = call.get("function", {}).get("arguments", "{}")
                    try:
                        extracted_json = json.loads(args_str) if isinstance(args_str, str) else args_str
                    except Exception as parse_err:
                        raise ValueError(f"Failed to parse DeepSeek tool arguments JSON: {parse_err}")
                else:
                    content_str = message.get("content", "{}")
                    try:
                        extracted_json = json.loads(content_str)
                    except Exception:
                        extracted_json = {"raw_response": content_str}

                usage = res_data.get("usage", {})
                tokens = {
                    "prompt_tokens": usage.get("prompt_tokens", 0),
                    "completion_tokens": usage.get("completion_tokens", 0),
                    "total_tokens": usage.get("total_tokens", 0),
                }

                return extracted_json or {}, tokens
            except httpx.RequestError as req_err:
                raise ValueError(f"Network error connecting to DeepSeek API: {req_err}")
