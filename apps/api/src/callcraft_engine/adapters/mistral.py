import base64
import json
import logging
from typing import Any, Dict, List, Optional, Tuple, Union
import httpx
from callcraft_engine.adapters.base import BaseAIAdapter

logger = logging.getLogger("callcraft.engine.adapter.mistral")


class MistralAdapter(BaseAIAdapter):
    async def execute_structured_extraction(
        self,
        image_bytes: Optional[bytes],
        mime_type: Optional[str],
        tool_schema: Union[Dict[str, Any], List[Dict[str, Any]]],
        system_prompt: Optional[str],
        user_prompt: Optional[str],
        api_key: str,
        model_identifier: str = "mistral-medium-3.5",
        images: Optional[List[Tuple[bytes, str]]] = None,
    ) -> Tuple[Dict[str, Any], Dict[str, int]]:
        if not api_key or not api_key.strip():
            raise ValueError("Mistral AI API Key is missing. Please configure a valid API key in settings or request header.")

        url = "https://api.mistral.ai/v1/chat/completions"

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
                    "image_url": f"data:{media};base64,{b64_str}",
                })
        elif image_bytes:
            b64_str = base64.b64encode(image_bytes).decode("utf-8")
            media = mime_type or "image/jpeg"
            user_content.append({
                "type": "image_url",
                "image_url": f"data:{media};base64,{b64_str}",
            })

        if not user_content:
            user_content.append({"type": "text", "text": "Extract structured data from document."})

        messages.append({"role": "user", "content": user_content})

        tools = []
        if isinstance(tool_schema, list):
            for t in tool_schema:
                fn = t.get("function", t) if isinstance(t, dict) else t
                tools.append({"type": "function", "function": fn})
        elif isinstance(tool_schema, dict):
            fn = tool_schema.get("function", tool_schema)
            tools.append({"type": "function", "function": fn})

        payload = {
            "model": model_identifier if "mistral" in model_identifier or "pixtral" in model_identifier else "mistral-large-latest",
            "messages": messages,
            "tools": tools,
            "tool_choice": "any" if len(tools) > 1 else "auto",
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
                    raise ValueError(f"Mistral API Error [{resp.status_code}]: {err_msg}")

                res_data = resp.json()
                choices = res_data.get("choices", [])
                if not choices:
                    raise ValueError("Mistral API returned an empty response choices list.")

                message = choices[0].get("message", {})
                tool_calls = message.get("tool_calls", [])
                executed_tools = []
                for tc in tool_calls:
                    fn = tc.get("function", {})
                    if fn.get("name"):
                        executed_tools.append({"name": fn.get("name"), "status": "success"})

                extracted_json = None
                if tool_calls:
                    call = tool_calls[0]
                    args_str = call.get("function", {}).get("arguments", "{}")
                    try:
                        extracted_json = json.loads(args_str) if isinstance(args_str, str) else args_str
                    except Exception as parse_err:
                        raise ValueError(f"Failed to parse Mistral tool arguments JSON: {parse_err}")
                else:
                    content_str = message.get("content", "{}")
                    try:
                        extracted_json = json.loads(content_str)
                    except Exception:
                        raise ValueError(f"Mistral API returned non-JSON text output: {content_str[:200]}")

                if isinstance(extracted_json, dict) and executed_tools:
                    extracted_json["_executed_tools"] = executed_tools

                usage = res_data.get("usage", {})
                tokens = {
                    "prompt_tokens": usage.get("prompt_tokens", 0),
                    "completion_tokens": usage.get("completion_tokens", 0),
                    "total_tokens": usage.get("total_tokens", 0),
                }

                return extracted_json or {}, tokens
            except httpx.RequestError as req_err:
                raise ValueError(f"Network error connecting to Mistral API: {req_err}")
