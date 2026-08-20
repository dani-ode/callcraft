import time
import logging
from typing import Dict, Tuple
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from callcraft_api.services.redis_cache import redis_service

logger = logging.getLogger("callcraft.middleware.rate_limiter")

# Fallback in-memory rate limiting counters {api_key: (count, reset_timestamp)}
_MEM_RATE_LIMITS: Dict[str, Tuple[int, float]] = {}


class TokenBucketRateLimiterMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, rate_limit_per_minute: int = 60):
        super().__init__(app)
        self.rate_limit_per_minute = rate_limit_per_minute

    async def dispatch(self, request: Request, call_next):
        # Only rate limit customer data plane calls `/v1/call/*`
        if request.url.path.startswith("/v1/call/"):
            auth_header = request.headers.get("Authorization")
            api_key = auth_header.replace("Bearer ", "").strip() if auth_header and auth_header.startswith("Bearer ") else "anonymous"

            current_time = time.time()

            # Redis / Memory rate check
            redis_key = f"callcraft:rate:{api_key}"
            allowed = True

            if redis_service._is_connected and redis_service._client:
                try:
                    count = await redis_service._client.incr(redis_key)
                    if count == 1:
                        await redis_service._client.expire(redis_key, 60)
                    if count > self.rate_limit_per_minute:
                        allowed = False
                except Exception as e:
                    logger.warning(f"Redis rate limiter failed: {e}")
            else:
                # Memory Fallback
                count, reset_at = _MEM_RATE_LIMITS.get(api_key, (0, current_time + 60))
                if current_time > reset_at:
                    count = 1
                    reset_at = current_time + 60
                else:
                    count += 1
                
                _MEM_RATE_LIMITS[api_key] = (count, reset_at)
                if count > self.rate_limit_per_minute:
                    allowed = False

            if not allowed:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Maximum allowed is {self.rate_limit_per_minute} requests per minute.",
                    headers={"Retry-After": "60"},
                )

        return await call_next(request)
