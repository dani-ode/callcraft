import logging
from typing import Dict, Type
from callcraft_engine.adapters.base import BaseAIAdapter
from callcraft_engine.adapters.gemini import GeminiAdapter
from callcraft_engine.adapters.openai import OpenAIAdapter

logger = logging.getLogger("callcraft.engine.adapters.factory")

_ADAPTER_REGISTRY: Dict[str, Type[BaseAIAdapter]] = {
    "gemini": GeminiAdapter,
    "openai": OpenAIAdapter,
    "anthropic": OpenAIAdapter,  # Fallback to OpenAI tool spec structure
    "deepseek": OpenAIAdapter,
}


def get_adapter(provider_code: str = "gemini") -> BaseAIAdapter:
    code = provider_code.lower()
    adapter_cls = _ADAPTER_REGISTRY.get(code, GeminiAdapter)
    return adapter_cls()
