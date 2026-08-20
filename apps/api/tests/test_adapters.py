import pytest
from unittest.mock import AsyncMock, patch
from callcraft_engine.adapters.factory import get_adapter
from callcraft_engine.adapters.gemini import GeminiAdapter
from callcraft_engine.adapters.openai import OpenAIAdapter
from callcraft_engine import (
    FieldDefinition,
    PlatformDataType,
    ResponseSchema,
    generate_ai_tool_schema,
)


def test_tool_schema_generator_formatting():
    props = {
        "nik": FieldDefinition(type=PlatformDataType.STRING, required=True, description="NIK Number"),
        "total_paid": FieldDefinition(type=PlatformDataType.NUMBER, required=True),
        "gender": FieldDefinition(type=PlatformDataType.ENUM, required=True, enum_values=["LAKI-LAKI", "PEREMPUAN"]),
    }
    schema = ResponseSchema(properties=props)
    tool_spec = generate_ai_tool_schema("extract_data", "Extract document fields", schema)

    assert tool_spec["type"] == "function"
    func = tool_spec["function"]
    assert func["name"] == "extract_data"
    assert func["description"] == "Extract document fields"
    assert "nik" in func["parameters"]["properties"]
    assert "total_paid" in func["parameters"]["properties"]
    assert func["parameters"]["properties"]["gender"]["enum"] == ["LAKI-LAKI", "PEREMPUAN"]


def test_adapter_factory_dispatch():
    gemini_adapter = get_adapter("gemini")
    assert isinstance(gemini_adapter, GeminiAdapter)

    openai_adapter = get_adapter("openai")
    assert isinstance(openai_adapter, OpenAIAdapter)

    # Unknown defaults to Gemini
    fallback_adapter = get_adapter("unknown_provider")
    assert isinstance(fallback_adapter, GeminiAdapter)


@pytest.mark.asyncio
async def test_gemini_adapter_missing_key_raises_error():
    adapter = GeminiAdapter()
    with pytest.raises(ValueError, match="Google Gemini API Key is missing"):
        await adapter.execute_structured_extraction(
            image_bytes=None,
            mime_type=None,
            tool_schema={},
            system_prompt=None,
            user_prompt=None,
            api_key="",
        )


@pytest.mark.asyncio
async def test_openai_adapter_missing_key_raises_error():
    adapter = OpenAIAdapter()
    with pytest.raises(ValueError, match="OpenAI API Key is missing"):
        await adapter.execute_structured_extraction(
            image_bytes=None,
            mime_type=None,
            tool_schema={},
            system_prompt=None,
            user_prompt=None,
            api_key="",
        )


@pytest.mark.asyncio
async def test_gemini_adapter_http_error_reporting():
    adapter = GeminiAdapter()
    tool_schema = {"name": "extract_data", "parameters": {"properties": {"nik": {"type": "string"}}}}
    
    with pytest.raises(ValueError, match="Gemini API Error"):
        await adapter.execute_structured_extraction(
            image_bytes=b"fake_bytes",
            mime_type="image/jpeg",
            tool_schema=tool_schema,
            system_prompt="sys",
            user_prompt="usr",
            api_key="invalid_test_key",
        )
