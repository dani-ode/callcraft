import base64
import json
import logging
from typing import Any, Dict, List, Optional, Tuple, Union
import httpx
from callcraft_engine.adapters.base import BaseAIAdapter

logger = logging.getLogger("callcraft.engine.adapter.openai")


class OpenAIAdapter(BaseAIAdapter):
    async def execute_structured_extraction(
        self,
        image_bytes: Optional[bytes],
        mime_type: Optional[str],
        tool_schema: Union[Dict[str, Any], List[Dict[str, Any]]],
        system_prompt: Optional[str],
        user_prompt: Optional[str],
        api_key: str,
        model_identifier: str = "gpt-4o",
        images: Optional[List[Tuple[bytes, str]]] = None,
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

        if images:
            for img_b, m_t in images:
                b64_str = base64.b64encode(img_b).decode("utf-8")
                media = m_t or "image/jpeg"
                user_content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:{media};base64,{b64_str}"},
                })
        elif image_bytes:
            b64_str = base64.b64encode(image_bytes).decode("utf-8")
            media = mime_type or "image/jpeg"
            user_content.append({
                "type": "image_url",
                "image_url": {"url": f"data:{media};base64,{b64_str}"},
            })

        if not user_content:
            user_content.append({"type": "text", "text": "Extract structured JSON from document."})

        messages.append({"role": "user", "content": user_content})

        tools = []
        if isinstance(tool_schema, list):
            for t in tool_schema:
                fn = t.get("function", t) if isinstance(t, dict) else t
                tools.append({"type": "function", "function": fn})
        elif isinstance(tool_schema, dict):
            fn = tool_schema.get("function", tool_schema)
            tools.append({"type": "function", "function": fn})

        first_func_name = tools[0]["function"].get("name", "extract_structured_data") if tools and isinstance(tools[0], dict) and isinstance(tools[0].get("function"), dict) else "extract_structured_data"

        payload = {
            "model": model_identifier,
            "messages": messages,
            "tools": tools,
            "tool_choice": "auto",
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
                choice = res_data.get("choices", [])[0] if res_data.get("choices") else {}
                message = choice.get("message", {}) if isinstance(choice, dict) else {}
                tool_calls = message.get("tool_calls", []) if isinstance(message, dict) else []

                executed_tools = []
                raw_args = {}

                if tool_calls:
                    for tc in tool_calls:
                        fn = tc.get("function", {}) if isinstance(tc, dict) else {}
                        if isinstance(fn, dict) and fn.get("name"):
                            executed_tools.append({"name": fn.get("name"), "status": "success"})

                    raw_args_str = tool_calls[0].get("function", {}).get("arguments", "{}") if isinstance(tool_calls[0], dict) else "{}"
                    try:
                        raw_args = json.loads(raw_args_str)
                    except Exception:
                        raw_args = {}

                if not isinstance(raw_args, dict):
                    raw_args = {}

                raw_args["_executed_tools"] = executed_tools
                if isinstance(message, dict) and message.get("content"):
                    raw_args["_ai_message"] = str(message.get("content")).strip()

                usage = res_data.get("usage", {})
                tokens = {
                    "prompt_tokens": usage.get("prompt_tokens", 0),
                    "completion_tokens": usage.get("completion_tokens", 0),
                    "total_tokens": usage.get("total_tokens", 0),
                }

                return raw_args, tokens
            except httpx.RequestError as e:
                raise ValueError(f"Network error connecting to OpenAI API: {e}")
