import base64
import json
import os
from typing import Any, Dict, List, Optional, Tuple, Union

import httpx

from callcraft_engine.adapters.base import BaseAIAdapter


EXPERIENTIAL_BASE_URL = "https://api.experientiallabs.ai/v1"
EXPERIENTIAL_MODEL_ID = "claude-fable-5.1"
EXPERIENTIAL_API_KEY_ENV = "EXPLABS_API_KEY"


class ExperientialAdapter(BaseAIAdapter):
    """OpenAI Chat Completions adapter for the Experiential model gateway."""

    async def execute_structured_extraction(
        self,
        image_bytes: Optional[bytes],
        mime_type: Optional[str],
        tool_schema: Union[Dict[str, Any], List[Dict[str, Any]]],
        system_prompt: Optional[str],
        user_prompt: Optional[str],
        api_key: str,
        model_identifier: str = EXPERIENTIAL_MODEL_ID,
        images: Optional[List[Tuple[bytes, str]]] = None,
    ) -> Tuple[Dict[str, Any], Dict[str, int]]:
        if model_identifier != EXPERIENTIAL_MODEL_ID:
            raise ValueError(
                f"Experiential gateway only supports model '{EXPERIENTIAL_MODEL_ID}', "
                f"not '{model_identifier}'."
            )

        gateway_api_key = os.getenv(EXPERIENTIAL_API_KEY_ENV, "").strip()
        if not gateway_api_key:
            raise ValueError(
                "EXPLABS_API_KEY is missing. Create an Experiential key under Settings -> API keys "
                "and export EXPLABS_API_KEY before using claude-fable-5.1."
            )

        messages: List[Dict[str, Any]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        user_content: List[Dict[str, Any]] = []
        if user_prompt:
            user_content.append({"type": "text", "text": user_prompt})

        input_images = images or ([(image_bytes, mime_type or "image/jpeg")] if image_bytes else [])
        for input_image, input_mime_type in input_images:
            encoded = base64.b64encode(input_image).decode("utf-8")
            user_content.append(
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{input_mime_type};base64,{encoded}"},
                }
            )

        if not user_content:
            user_content.append({"type": "text", "text": "Extract structured JSON from document."})
        messages.append({"role": "user", "content": user_content})

        schema_items = tool_schema if isinstance(tool_schema, list) else [tool_schema]
        tools: List[Dict[str, Any]] = []
        for item in schema_items:
            if not isinstance(item, dict):
                continue
            function = item.get("function", item)
            if isinstance(function, dict):
                tools.append({"type": "function", "function": function})

        payload: Dict[str, Any] = {
            "model": EXPERIENTIAL_MODEL_ID,
            "messages": messages,
            "tools": tools,
            "tool_choice": "auto",
        }
        headers = {
            "Authorization": f"Bearer {gateway_api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{EXPERIENTIAL_BASE_URL}/chat/completions", json=payload, headers=headers
                )
        except httpx.RequestError as exc:
            raise ValueError(f"Network error connecting to Experiential gateway: {exc}") from exc

        if response.status_code != 200:
            try:
                error_payload = response.json()
            except ValueError:
                error_payload = {}
            message = error_payload.get("error", {}).get("message") or response.text or f"HTTP {response.status_code}"
            raise ValueError(f"Experiential gateway error [{response.status_code}]: {message}")

        response_data = response.json()
        choices = response_data.get("choices", [])
        if not choices or not isinstance(choices[0], dict):
            raise ValueError("Experiential gateway returned no completion choices.")
        message = choices[0].get("message", {})
        if not isinstance(message, dict):
            raise ValueError("Experiential gateway returned an invalid completion message.")

        raw_arguments: Dict[str, Any] = {}
        executed_tools: List[Dict[str, str]] = []
        for tool_call in message.get("tool_calls", []):
            if not isinstance(tool_call, dict):
                continue
            function = tool_call.get("function", {})
            if not isinstance(function, dict):
                continue
            name = function.get("name")
            if name:
                executed_tools.append({"name": name, "status": "success"})
            if not raw_arguments:
                arguments = function.get("arguments", "{}")
                try:
                    decoded = json.loads(arguments)
                except (TypeError, json.JSONDecodeError) as exc:
                    raise ValueError("Experiential gateway returned invalid tool-call JSON arguments.") from exc
                if not isinstance(decoded, dict):
                    raise ValueError("Experiential gateway tool-call arguments must be a JSON object.")
                raw_arguments = decoded

        if executed_tools:
            raw_arguments["_executed_tools"] = executed_tools
        if message.get("content"):
            raw_arguments["_ai_message"] = str(message["content"]).strip()

        usage = response_data.get("usage", {})
        tokens = {
            "prompt_tokens": usage.get("prompt_tokens", 0),
            "completion_tokens": usage.get("completion_tokens", 0),
            "total_tokens": usage.get("total_tokens", 0),
        }
        return raw_arguments, tokens
