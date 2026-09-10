import pytest
from unittest.mock import AsyncMock, patch
from httpx import ASGITransport, AsyncClient
from callcraft_api import app


@pytest.mark.asyncio
async def test_public_projects_missing_headers():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Missing X-USER-ID
        resp = await ac.get("/v1/projects")
        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "MISSING_USER_ID"

        # 2. Missing Authorization
        resp = await ac.get("/v1/projects", headers={"X-USER-ID": "usr_test123"})
        assert resp.status_code == 401
        assert resp.json()["error"]["code"] == "UNAUTHORIZED_MISSING_TOKEN"

        # 3. Missing X-CALL-PUBLIC-KEY
        resp = await ac.get(
            "/v1/projects",
            headers={"X-USER-ID": "usr_test123", "Authorization": "Bearer call_sk_live_123"},
        )
        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "MISSING_PUBLIC_KEY"


@pytest.mark.asyncio
async def test_public_projects_invalid_key():
    with patch("callcraft_api.db.repository.Repository.verify_api_credential", new_callable=AsyncMock) as mock_verify:
        mock_verify.return_value = None
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            resp = await ac.get(
                "/v1/projects",
                headers={
                    "X-USER-ID": "usr_test123",
                    "Authorization": "Bearer call_sk_invalid",
                    "X-CALL-PUBLIC-KEY": "pk_live_invalid",
                },
            )
            assert resp.status_code == 401
            assert resp.json()["error"]["code"] == "INVALID_API_KEY"


@pytest.mark.asyncio
async def test_public_projects_success_user_wide():
    mock_cred = {
        "id": "crd_01",
        "user_id": "usr_test123",
        "project_id": None,
        "name": "Global Key",
        "public_key": "pk_live_123",
        "environment": "production",
        "ip_whitelist": [],
    }
    mock_projects = [
        {
            "id": "prj_01",
            "userId": "usr_test123",
            "name": "Project Alpha",
            "slug": "project-alpha",
            "description": "Alpha description",
            "color": "#e1b329",
            "icon": "Boxes",
            "status": "active",
            "specsCount": 2,
            "keysCount": 1,
            "createdAt": "2026-09-10T12:00:00Z",
            "updatedAt": "2026-09-10T12:00:00Z",
        }
    ]

    with patch("callcraft_api.db.repository.Repository.verify_api_credential", new_callable=AsyncMock) as mock_verify, \
         patch("callcraft_api.db.repository.Repository.list_projects", new_callable=AsyncMock) as mock_list_p:
        mock_verify.return_value = mock_cred
        mock_list_p.return_value = mock_projects

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            resp = await ac.get(
                "/v1/projects",
                headers={
                    "X-USER-ID": "usr_test123",
                    "Authorization": "Bearer call_sk_valid",
                    "X-CALL-PUBLIC-KEY": "pk_live_123",
                },
            )
            assert resp.status_code == 200
            body = resp.json()
            assert body["meta"]["status"] == "completed"
            assert "requestId" in body["meta"]
            assert len(body["data"]) == 1
            assert body["data"][0]["id"] == "prj_01"
            assert body["data"][0]["specsCount"] == 2


@pytest.mark.asyncio
async def test_public_projects_scoped_to_project():
    mock_cred = {
        "id": "crd_02",
        "user_id": "usr_test123",
        "project_id": "prj_scoped_99",
        "name": "Scoped Key",
        "public_key": "pk_live_scoped",
        "environment": "production",
        "ip_whitelist": [],
    }
    mock_project = {
        "id": "prj_scoped_99",
        "userId": "usr_test123",
        "name": "Scoped Project",
        "slug": "scoped-project",
        "description": "Only visible project",
        "color": "#e1b329",
        "icon": "Boxes",
        "status": "active",
    }

    with patch("callcraft_api.db.repository.Repository.verify_api_credential", new_callable=AsyncMock) as mock_verify, \
         patch("callcraft_api.db.repository.Repository.get_project", new_callable=AsyncMock) as mock_get_p:
        mock_verify.return_value = mock_cred
        mock_get_p.return_value = mock_project

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            resp = await ac.get(
                "/v1/projects",
                headers={
                    "X-USER-ID": "usr_test123",
                    "Authorization": "Bearer call_sk_valid",
                    "X-CALL-PUBLIC-KEY": "pk_live_scoped",
                },
            )
            assert resp.status_code == 200
            body = resp.json()
            assert len(body["data"]) == 1
            assert body["data"][0]["id"] == "prj_scoped_99"


@pytest.mark.asyncio
async def test_public_specs_list_and_filter():
    mock_cred = {
        "id": "crd_01",
        "user_id": "usr_test123",
        "project_id": None,
        "name": "Global Key",
        "public_key": "pk_live_123",
        "environment": "production",
        "ip_whitelist": [],
    }
    mock_specs = [
        {
            "id": "spc_01",
            "userId": "usr_test123",
            "projectId": "prj_01",
            "name": "Invoice Parser",
            "slug": "invoice-parser",
            "description": "Extracts invoice line items",
            "allowPdfInput": True,
            "allowAdditionalPrompt": True,
            "responseSchema": {"type": "object", "properties": {"total": {"type": "number"}}},
        }
    ]

    with patch("callcraft_api.db.repository.Repository.verify_api_credential", new_callable=AsyncMock) as mock_verify, \
         patch("callcraft_api.db.repository.Repository.list_call_specs", new_callable=AsyncMock) as mock_list_s:
        mock_verify.return_value = mock_cred
        mock_list_s.return_value = mock_specs

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # 1. Without query params
            resp = await ac.get(
                "/v1/specs",
                headers={
                    "X-USER-ID": "usr_test123",
                    "Authorization": "Bearer call_sk_valid",
                    "X-CALL-PUBLIC-KEY": "pk_live_123",
                },
            )
            assert resp.status_code == 200
            body = resp.json()
            assert len(body["data"]) == 1
            assert body["data"][0]["slug"] == "invoice-parser"

            # 2. With projectId query parameter
            resp2 = await ac.get(
                "/v1/specs?projectId=prj_01",
                headers={
                    "X-USER-ID": "usr_test123",
                    "Authorization": "Bearer call_sk_valid",
                    "X-CALL-PUBLIC-KEY": "pk_live_123",
                },
            )
            assert resp2.status_code == 200
            assert mock_list_s.call_args[0][1] == "usr_test123"
            assert mock_list_s.call_args[1] == {"project_id": "prj_01"}


@pytest.mark.asyncio
async def test_public_specs_project_mismatch_forbidden():
    mock_cred = {
        "id": "crd_scoped",
        "user_id": "usr_test123",
        "project_id": "prj_alpha",
        "name": "Alpha Key",
        "public_key": "pk_live_alpha",
        "environment": "production",
        "ip_whitelist": [],
    }

    with patch("callcraft_api.db.repository.Repository.verify_api_credential", new_callable=AsyncMock) as mock_verify:
        mock_verify.return_value = mock_cred

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            resp = await ac.get(
                "/v1/specs?projectId=prj_beta",
                headers={
                    "X-USER-ID": "usr_test123",
                    "Authorization": "Bearer call_sk_alpha",
                    "X-CALL-PUBLIC-KEY": "pk_live_alpha",
                },
            )
            assert resp.status_code == 403
            assert resp.json()["error"]["code"] == "PROJECT_MISMATCH"


@pytest.mark.asyncio
async def test_public_spec_detail_with_extracted_variables():
    mock_cred = {
        "id": "crd_01",
        "user_id": "usr_test123",
        "project_id": None,
        "name": "Global Key",
        "public_key": "pk_live_123",
        "environment": "production",
        "ip_whitelist": [],
    }
    mock_spec = {
        "id": "spc_01",
        "userId": "usr_test123",
        "projectId": "prj_01",
        "name": "Receipt Extractor",
        "slug": "receipt-extractor",
        "description": "Extracts merchant and date",
        "allowPdfInput": True,
        "allowAdditionalPrompt": True,
        "positivePrompt": "Extract data for {{merchantName}} from invoice date {{invoiceDate}}",
        "additionalPrompt": "Focus on currency {{currencyCode}}",
        "negativePrompt": "Do not hallucinate",
        "requestSchema": {"type": "object", "properties": {"note": {"type": "string"}}},
        "responseSchema": {"type": "object", "properties": {"total": {"type": "number"}}},
    }

    with patch("callcraft_api.db.repository.Repository.verify_api_credential", new_callable=AsyncMock) as mock_verify, \
         patch("callcraft_api.db.repository.Repository.get_call_spec", new_callable=AsyncMock) as mock_get_s:
        mock_verify.return_value = mock_cred
        mock_get_s.return_value = mock_spec

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # 1. Via Query Param ?specId=receipt-extractor
            resp1 = await ac.get(
                "/v1/specs?specId=receipt-extractor",
                headers={
                    "X-USER-ID": "usr_test123",
                    "Authorization": "Bearer call_sk_valid",
                    "X-CALL-PUBLIC-KEY": "pk_live_123",
                },
            )
            assert resp1.status_code == 200
            data1 = resp1.json()["data"]
            assert data1["id"] == "spc_01"
            assert "merchantName" in data1["promptVariables"]
            assert "invoiceDate" in data1["promptVariables"]
            assert "currencyCode" in data1["promptVariables"]
            assert "pdf" in data1["requiredInputs"]
            assert "image" in data1["requiredInputs"]
            assert data1["executionEndpoint"] == "/v1/call"

            # 2. Via Path Param /v1/specs/{spec_id_or_slug}
            resp2 = await ac.get(
                "/v1/specs/spc_01",
                headers={
                    "X-USER-ID": "usr_test123",
                    "Authorization": "Bearer call_sk_valid",
                    "X-CALL-PUBLIC-KEY": "pk_live_123",
                },
            )
            assert resp2.status_code == 200
            data2 = resp2.json()["data"]
            assert data2["slug"] == "receipt-extractor"


@pytest.mark.asyncio
async def test_public_spec_detail_not_found():
    mock_cred = {
        "id": "crd_01",
        "user_id": "usr_test123",
        "project_id": None,
        "name": "Global Key",
        "public_key": "pk_live_123",
        "environment": "production",
        "ip_whitelist": [],
    }

    with patch("callcraft_api.db.repository.Repository.verify_api_credential", new_callable=AsyncMock) as mock_verify, \
         patch("callcraft_api.db.repository.Repository.get_call_spec", new_callable=AsyncMock) as mock_get_s:
        mock_verify.return_value = mock_cred
        mock_get_s.return_value = None

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            resp = await ac.get(
                "/v1/specs/nonexistent-spec",
                headers={
                    "X-USER-ID": "usr_test123",
                    "Authorization": "Bearer call_sk_valid",
                    "X-CALL-PUBLIC-KEY": "pk_live_123",
                },
            )
            assert resp.status_code == 404
            assert resp.json()["error"]["code"] == "SPEC_NOT_FOUND"
