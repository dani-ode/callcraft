import logging
from typing import Dict, Type
from callcraft_engine.adapters.base import BaseAIAdapter
from callcraft_engine.adapters.gemini import GeminiAdapter
from callcraft_engine.adapters.openai import OpenAIAdapter
from callcraft_engine.adapters.anthropic import AnthropicAdapter
from callcraft_engine.adapters.mistral import MistralAdapter
from callcraft_engine.adapters.deepseek import DeepSeekAdapter
from callcraft_engine.adapters.experiential import EXPERIENTIAL_MODEL_ID, ExperientialAdapter

logger = logging.getLogger("callcraft.engine.adapters.factory")

_ADAPTER_REGISTRY: Dict[str, Type[BaseAIAdapter]] = {
    "gemini": GeminiAdapter,
    "openai": OpenAIAdapter,
    "anthropic": AnthropicAdapter,
    "mistral": MistralAdapter,
    "deepseek": DeepSeekAdapter,
}


def get_adapter(provider_code: str = "gemini", model_identifier: str | None = None) -> BaseAIAdapter:
    """Return an adapter for a known provider, with explicit model gateway routing."""
    if model_identifier == EXPERIENTIAL_MODEL_ID:
        return ExperientialAdapter()

    code = provider_code.lower().strip()
    adapter_cls = _ADAPTER_REGISTRY.get(code)
    if adapter_cls is None:
        raise ValueError(f"Unsupported AI provider: {provider_code}")
    return adapter_cls()
