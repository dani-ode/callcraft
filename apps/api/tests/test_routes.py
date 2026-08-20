import pytest
from httpx import ASGITransport, AsyncClient

from callcraft_api import app


@pytest.mark.asyncio
async def test_health_check_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "callcraft-api"


@pytest.mark.asyncio
async def test_public_call_execution_unauthorized():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/v1/call/test_user_id", json={"prompt": "Test"})
        assert response.status_code == 401


@pytest.mark.asyncio
async def test_public_call_execution_success():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": "Bearer call_sk_sample_key_1234567890"}
        payload = {"prompt": "Extract document metadata"}
        response = await ac.post("/v1/call/test_user_id", json=payload, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert data["data"]["nik"] == "3271041508950001"


@pytest.mark.asyncio
async def test_internal_and_admin_status_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        internal_resp = await ac.get("/internal/v1/status")
        assert internal_resp.status_code == 200
        assert internal_resp.json()["channel"] == "internal"

        admin_resp = await ac.get("/admin/v1/status")
        assert admin_resp.status_code == 200
        assert admin_resp.json()["channel"] == "admin"
