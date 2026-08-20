from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, Tuple


class BaseAIAdapter(ABC):
    @abstractmethod
    async def execute_structured_extraction(
        self,
        image_bytes: Optional[bytes],
        mime_type: Optional[str],
        tool_schema: Dict[str, Any],
        system_prompt: Optional[str],
        user_prompt: Optional[str],
        api_key: str,
        model_identifier: str,
    ) -> Tuple[Dict[str, Any], Dict[str, int]]:
        """
        Executes structured JSON extraction.
        Returns: Tuple[raw_json_dict, token_usage_dict]
        """
        pass
