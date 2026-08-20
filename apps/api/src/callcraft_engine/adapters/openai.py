import base64
import json
import logging
from typing import Any, Dict, Optional, Tuple
import httpx
from callcraft_engine.adapters.base import BaseAIAdapter

logger = logging.getLogger("callcraft.engine.adapter.openai")


class OpenAIAdapter(BaseAIAdapter):
    async def execute_structured_extraction(
        self,
        image_bytes: Optional[bytes],
        mime_type: Optional[str],
        tool_schema: Dict[str, Any],
        system_prompt: Optional[str],
        user_prompt: Optional[str],
        api_key: str,
        model_identifier: str = "gpt-4o",
    ) -> Tuple[Dict[str, Any], Dict[str, int]]:
        if not api_key or not api_key.strip():
            raise ValueError("OpenAI API Key is missing. Please configure a valid API key in settings or request header.")

        url = "https://api.openai.com/v1/chat/completions"

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
            "model": model_identifier,
            "messages": messages,
            "tools": tools,
            "tool_choice": {"type": "function", "function": {"name": func_name}},
        }

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code != 200:
                    err_json = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                    err_msg = err_json.get("error", {}).get("message") or resp.text or f"HTTP {resp.status_code}"
                    raise ValueError(f"OpenAI API Error [{resp.status_code}]: {err_msg}")

                res_data = resp.json()
                choice = res_data.get("choices", [])[0]
                message = choice.get("message", {})
                tool_calls = message.get("tool_calls", [])
                if not tool_calls:
                    raise ValueError("No tool call returned from OpenAI API response.")

                raw_args_str = tool_calls[0].get("function", {}).get("arguments", "{}")
                raw_args = json.loads(raw_args_str)

                usage = res_data.get("usage", {})
                tokens = {
                    "prompt_tokens": usage.get("prompt_tokens", 0),
                    "completion_tokens": usage.get("completion_tokens", 0),
                    "total_tokens": usage.get("total_tokens", 0),
                }

                return raw_args, tokens
            except httpx.RequestError as e:
                raise ValueError(f"Network error connecting to OpenAI API: {e}")
