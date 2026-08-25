import json
import logging
from decimal import Decimal
from datetime import datetime, date
from uuid import UUID
from typing import Any, Dict, Optional
import redis.asyncio as redis
from callcraft_api.config import settings

logger = logging.getLogger("callcraft.redis")

def _json_default_serializer(obj: Any) -> Any:
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, UUID):
        return str(obj)
    raise TypeError(f"Object of type {obj.__class__.__name__} is not JSON serializable")

def dumps_safe(data: Any) -> str:
    return json.dumps(data, default=_json_default_serializer)

# In-memory Redis simulation for offline / testing
_MEM_CACHE: Dict[str, str] = {}
_MEM_OUTBOX: list = []


class RedisCacheService:
    def __init__(self):
        self._client: Optional[redis.Redis] = None
        self._is_connected: bool = False

    async def connect(self):
        try:
            self._client = redis.from_url(settings.redis_url, decode_responses=True)
            await self._client.ping()
            self._is_connected = True
            logger.info("Connected to Redis successfully.")
        except Exception as e:
            logger.warning(f"Redis connection failed, running in memory-simulated mode: {e}")
            self._is_connected = False

    async def get_spec(self, user_id: str, spec_slug: str) -> Optional[Dict[str, Any]]:
        key = f"callcraft:spec:{user_id}:{spec_slug}"
        if self._is_connected and self._client:
            try:
                data = await self._client.get(key)
                if data:
                    return json.loads(data)
            except Exception as e:
                logger.warning(f"Redis get_spec error: {e}")
        
        if key in _MEM_CACHE:
            return json.loads(_MEM_CACHE[key])
        return None

    async def set_spec(self, user_id: str, spec_slug: str, spec_data: Dict[str, Any], ttl: int = 3600):
        key = f"callcraft:spec:{user_id}:{spec_slug}"
        val = dumps_safe(spec_data)
        if self._is_connected and self._client:
            try:
                await self._client.setex(key, ttl, val)
                return
            except Exception as e:
                logger.warning(f"Redis set_spec error: {e}")

        _MEM_CACHE[key] = val

    async def delete_spec(self, user_id: str, spec_id_or_slug: str):
        key = f"callcraft:spec:{user_id}:{spec_id_or_slug}"
        if self._is_connected and self._client:
            try:
                await self._client.delete(key)
            except Exception as e:
                logger.warning(f"Redis delete_spec error: {e}")

        if key in _MEM_CACHE:
            del _MEM_CACHE[key]

    async def push_outbox(self, request_payload: Dict[str, Any]):
        key = "callcraft:outbox:api_requests"
        val = dumps_safe(request_payload)
        if self._is_connected and self._client:
            try:
                await self._client.rpush(key, val)
                return
            except Exception as e:
                logger.warning(f"Redis push_outbox error: {e}")

        _MEM_OUTBOX.append(request_payload)

    async def pop_outbox(self, count: int = 50) -> list:
        key = "callcraft:outbox:api_requests"
        items = []
        if self._is_connected and self._client:
            try:
                for _ in range(count):
                    val = await self._client.lpop(key)
                    if not val:
                        break
                    if isinstance(val, (str, bytes)):
                        items.append(json.loads(val))
                return items
            except Exception as e:
                logger.warning(f"Redis pop_outbox error: {e}")

        for _ in range(min(count, len(_MEM_OUTBOX))):
            items.append(_MEM_OUTBOX.pop(0))
        return items


redis_service = RedisCacheService()
