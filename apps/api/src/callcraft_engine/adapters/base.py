from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Tuple, Union


class BaseAIAdapter(ABC):
    @abstractmethod
    async def execute_structured_extraction(
        self,
        image_bytes: Optional[bytes],
        mime_type: Optional[str],
        tool_schema: Union[Dict[str, Any], List[Dict[str, Any]]],
        system_prompt: Optional[str],
        user_prompt: Optional[str],
        api_key: str,
        model_identifier: str,
        images: Optional[List[Tuple[bytes, str]]] = None,
    ) -> Tuple[Dict[str, Any], Dict[str, int]]:
        """
        Executes structured JSON extraction.
        Returns: Tuple[raw_json_dict, token_usage_dict]
        """
        pass
