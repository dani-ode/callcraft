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

        tools = [{
            "type": "function",
            "function": tool_schema,
        }]

        func_name = tool_schema.get("name", "extract_structured_data")

        payload = {
            "model": model_identifier,
            "messages": messages,
            "tools": tools,
            "tool_choice": {"type": "function", "function": {"name": func_name}},
        }

        # Mock fallback for dev/demo
        if not api_key or api_key.startswith("mock_") or api_key == "demo":
            logger.info("Using OpenAI mock extraction response for dev/demo key.")
            mock_data = {
                "nik": "3271041508950001",
                "full_name": "BUDI SANTOSO",
                "gender": "LAKI-LAKI",
                "date_of_birth": "1995-08-15",
                "invoice_number": "INV-2026-8899",
                "vendor_name": "CALLCRAFT TECH",
                "total_amount": 1500000.0,
            }
            func_props = tool_schema.get("parameters", {}).get("properties", {})
            filtered = {k: v for k, v in mock_data.items() if k in func_props}
            if not filtered:
                filtered = mock_data
            return filtered, {"prompt_tokens": 400, "completion_tokens": 100, "total_tokens": 500}

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            res_data = resp.json()

            choice = res_data.get("choices", [])[0]
            message = choice.get("message", {})
            tool_calls = message.get("tool_calls", [])
            if not tool_calls:
                raise ValueError("No tool call returned from OpenAI API")

            raw_args_str = tool_calls[0].get("function", {}).get("arguments", "{}")
            raw_args = json.loads(raw_args_str)

            usage = res_data.get("usage", {})
            tokens = {
                "prompt_tokens": usage.get("prompt_tokens", 0),
                "completion_tokens": usage.get("completion_tokens", 0),
                "total_tokens": usage.get("total_tokens", 0),
            }

            return raw_args, tokens
