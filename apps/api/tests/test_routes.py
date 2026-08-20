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
        headers = {
            "Authorization": "Bearer call_sk_live_dev_secret_key_12345",
            "X-CALL-SPEC-ID": "ktp-parser",
        }
        payload = {"prompt": "Extract document metadata"}
        response = await ac.post("/v1/call/usr_default_dev_01", json=payload, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert data["data"]["nik"] == "3271041508950001"


@pytest.mark.asyncio
async def test_internal_specs_and_templates_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Test Internal Status
        status_resp = await ac.get("/internal/v1/status")
        assert status_resp.status_code == 200
        assert status_resp.json()["channel"] == "internal"

        # Test Internal Specs List
        specs_resp = await ac.get("/internal/v1/specs")
        assert specs_resp.status_code == 200
        specs_data = specs_resp.json()
        assert isinstance(specs_data, list)
        assert len(specs_data) >= 2

        # Test Internal Templates List
        tmpl_resp = await ac.get("/internal/v1/templates")
        assert tmpl_resp.status_code == 200
        tmpl_data = tmpl_resp.json()
        assert isinstance(tmpl_data, list)

        # Test Internal Keys List
        keys_resp = await ac.get("/internal/v1/keys")
        assert keys_resp.status_code == 200
        keys_data = keys_resp.json()
        assert isinstance(keys_data, list)


@pytest.mark.asyncio
async def test_admin_status_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        admin_resp = await ac.get("/admin/v1/status")
        assert admin_resp.status_code == 200
        assert admin_resp.json()["channel"] == "admin"
