import json

import httpx
import pytest

from callcraft_engine.adapters.experiential import (
    EXPERIENTIAL_BASE_URL,
    EXPERIENTIAL_MODEL_ID,
    ExperientialAdapter,
)
from callcraft_engine.adapters.factory import get_adapter


def _tool_schema():
    return {
        "type": "function",
        "function": {
            "name": "extract_data",
            "description": "Extract structured data",
            "parameters": {"type": "object", "properties": {"answer": {"type": "string"}}},
        },
    }


def test_factory_routes_claude_fable_to_experiential():
    assert isinstance(get_adapter("anthropic", model_identifier=EXPERIENTIAL_MODEL_ID), ExperientialAdapter)


def test_factory_rejects_unknown_provider():
    with pytest.raises(ValueError, match="Unsupported AI provider"):
        get_adapter("unknown-provider")


@pytest.mark.asyncio
async def test_experiential_requires_environment_key(monkeypatch):
    monkeypatch.delenv("EXPLABS_API_KEY", raising=False)

    with pytest.raises(ValueError, match="EXPLABS_API_KEY is missing"):
        await ExperientialAdapter().execute_structured_extraction(
            image_bytes=None,
            mime_type=None,
            tool_schema=_tool_schema(),
            system_prompt=None,
            user_prompt="hello",
            api_key="ignored-provider-key",
        )


@pytest.mark.asyncio
async def test_experiential_uses_gateway_model_key_and_tools(monkeypatch):
    monkeypatch.setenv("EXPLABS_API_KEY", "xpl_test_gateway_key")
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["authorization"] = request.headers["Authorization"]
        captured["payload"] = json.loads(request.content)
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "tool_calls": [
                                {
                                    "function": {
                                        "name": "extract_data",
                                        "arguments": '{"answer":"gateway-confirmed"}',
                                    }
                                }
                            ]
                        }
                    }
                ],
                "usage": {"prompt_tokens": 12, "completion_tokens": 4, "total_tokens": 16},
            },
        )

    transport = httpx.MockTransport(handler)
    original_client = httpx.AsyncClient

    def mocked_client(*args, **kwargs):
        kwargs["transport"] = transport
        return original_client(*args, **kwargs)

    monkeypatch.setattr(httpx, "AsyncClient", mocked_client)
    result, usage = await ExperientialAdapter().execute_structured_extraction(
        image_bytes=None,
        mime_type=None,
        tool_schema=_tool_schema(),
        system_prompt="system instruction",
        user_prompt="user instruction",
        api_key="direct-provider-key-must-not-be-used",
    )

    assert captured["url"] == f"{EXPERIENTIAL_BASE_URL}/chat/completions"
    assert captured["authorization"] == "Bearer xpl_test_gateway_key"
    assert captured["payload"]["model"] == EXPERIENTIAL_MODEL_ID
    assert captured["payload"]["tools"] == [_tool_schema()]
    assert result["answer"] == "gateway-confirmed"
    assert result["_executed_tools"] == [{"name": "extract_data", "status": "success"}]
    assert usage == {"prompt_tokens": 12, "completion_tokens": 4, "total_tokens": 16}


@pytest.mark.asyncio
async def test_experiential_rejects_other_models(monkeypatch):
    monkeypatch.setenv("EXPLABS_API_KEY", "xpl_test_gateway_key")

    with pytest.raises(ValueError, match="only supports model"):
        await ExperientialAdapter().execute_structured_extraction(
            image_bytes=None,
            mime_type=None,
            tool_schema=_tool_schema(),
            system_prompt=None,
            user_prompt="hello",
            api_key="ignored",
            model_identifier="claude-sonnet-5",
        )
