import pytest
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from callcraft_api.middleware.rate_limiter import TokenBucketRateLimiterMiddleware

app = FastAPI()
app.add_middleware(TokenBucketRateLimiterMiddleware, rate_limit_per_minute=3)


@app.post("/v1/call/test_user")
async def dummy_endpoint():
    return {"status": "ok"}


def test_rate_limiter_limit_exceeded():
    client = TestClient(app)
    headers = {"Authorization": "Bearer call_sk_rate_limit_test_key"}

    # First 3 requests should pass (limit is 3 req/min)
    for i in range(3):
        res = client.post("/v1/call/test_user", json={}, headers=headers)
        assert res.status_code == 200

    # 4th request must fail with 429 Too Many Requests
    exceeded_res = client.post("/v1/call/test_user", json={}, headers=headers)
    assert exceeded_res.status_code == 429
    assert "Rate limit exceeded" in exceeded_res.json()["detail"]
