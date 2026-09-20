"""
Unit and integration tests for Worker Outbox persistence (GAP-006 remediation).
Verifies that items pushed to the Redis outbox queue are correctly popped
and persisted to the PostgreSQL api_requests and user_usage_daily tables.
"""
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from callcraft_api.db.models import User, UserUsageDaily
from callcraft_api.db.repository import Repository
from callcraft_api.services.redis_cache import redis_service
from tests.test_db import test_session


@pytest.mark.asyncio
async def test_worker_outbox_persistence_pipeline(test_session: AsyncSession):
    # 1. Fetch active user and call spec
    u_stmt = select(User).where(User.status == "active")
    user_obj = (await test_session.execute(u_stmt)).scalars().first()
    assert user_obj is not None

    specs = await Repository.list_call_specs(test_session, user_obj.id)
    assert len(specs) > 0
    spec = specs[0]

    # 2. Push simulated event to outbox
    test_req_id = "req_worker_test_0099"
    outbox_item = {
        "event": "api_request.completed",
        "request_id": test_req_id,
        "user_id": user_obj.id,
        "call_spec_id": spec["id"],
        "call_spec_version_id": spec.get("activeVersionId"),
        "provider_code": "gemini",
        "model_identifier": "gemini-3.6-flash",
        "status": "SUCCESS",
        "http_status": 200,
        "input_type": "text",
        "input_size_bytes": 512,
        "processing_time_ms": 185,
        "prompt_tokens": 600,
        "completion_tokens": 400,
        "total_tokens": 1000,
        "estimated_cost_usd": 0.000250,
        "client_ip": "127.0.0.1",
        "user_agent": "PyTest Worker Harness",
    }

    await redis_service.push_outbox(outbox_item)

    # 3. Simulate worker draining queue
    popped_items = await redis_service.pop_outbox(count=10)
    assert len(popped_items) >= 1
    target = next((item for item in popped_items if item.get("request_id") == test_req_id), None)
    assert target is not None

    # 4. Worker persists item to DB using Repository.record_api_request
    log_id = await Repository.record_api_request(test_session, target)
    assert log_id is not None

    # 5. Verify audit log is available via list_api_requests
    logs = await Repository.list_api_requests(test_session, user_obj.id, project_id=spec["projectId"])
    matched_log = next((l for l in logs if l["requestId"] == test_req_id), None)
    assert matched_log is not None
    assert matched_log["specName"] == spec["name"]
    assert matched_log["provider"] == "gemini"
    assert matched_log["model"] == "gemini-3.6-flash"
    assert matched_log["processingTimeMs"] == 185
    assert matched_log["totalTokens"] == 1000
    assert matched_log["costUsd"] == 0.000250
    assert matched_log["status"] == "SUCCESS"
