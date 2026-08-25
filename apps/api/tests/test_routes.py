import pytest
from unittest.mock import AsyncMock, patch
from httpx import ASGITransport, AsyncClient
from callcraft_api import app
from callcraft_api.routers.internal import get_current_user_id


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
async def test_auth_register_verify_and_login_flow():
    import ulid
    test_email = f"testuser_{str(ulid.new()).lower()[-6:]}@callcraft.dev"

    with patch("callcraft_api.services.email.send_verification_email", return_value=True):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # 1. Register new user
            reg_resp = await ac.post("/internal/v1/auth/register", json={
                "name": "Test User",
                "email": test_email,
                "password": "securepassword123"
            })
            assert reg_resp.status_code == 200
            reg_data = reg_resp.json()
            assert "id" in reg_data
            assert reg_data["email"] == test_email

            # 2. Attempt duplicate registration for existing email (must return 400)
            dup_resp = await ac.post("/internal/v1/auth/register", json={
                "name": "Test User Dup",
                "email": test_email,
                "password": "anotherpassword"
            })
            assert dup_resp.status_code == 400
            assert "sudah terdaftar" in dup_resp.json()["error"]["message"]

            # 3. Force status active via admin endpoint
            await ac.put(f"/internal/v1/admin/users/{reg_data['id']}/verify")

            # 4. Login with correct credentials
            login_resp = await ac.post("/internal/v1/auth/login", json={
                "email": test_email,
                "password": "securepassword123"
            })
            assert login_resp.status_code == 200
            assert login_resp.json()["id"] == reg_data["id"]

            # 5. Login with wrong password
            wrong_resp = await ac.post("/internal/v1/auth/login", json={
                "email": test_email,
                "password": "wrongpassword"
            })
            assert wrong_resp.status_code == 401


@pytest.mark.asyncio
async def test_user_profile_update_and_get():
    import ulid
    user_email = f"profileuser_{str(ulid.new()).lower()[-6:]}@callcraft.dev"

    with patch("callcraft_api.services.email.send_verification_email", return_value=True):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            reg_resp = await ac.post("/internal/v1/auth/register", json={
                "name": "Profile Owner",
                "email": user_email,
                "password": "mypassword123"
            })
            user_id = reg_resp.json()["id"]
            await ac.put(f"/internal/v1/admin/users/{user_id}/verify")

            # Update profile
            update_resp = await ac.put(f"/internal/v1/users/profile?user_id={user_id}", json={
                "full_name": "Updated Name",
                "bio": "AI Security Specialist",
                "company": "Callcraft Devs",
                "location": "Jakarta",
            })
            assert update_resp.status_code == 200
            assert update_resp.json()["user"]["fullName"] == "Updated Name"
            assert update_resp.json()["user"]["bio"] == "AI Security Specialist"

            # Get profile me
            me_resp = await ac.get(f"/internal/v1/users/me?user_id={user_id}")
            assert me_resp.status_code == 200
            assert me_resp.json()["fullName"] == "Updated Name"
            assert me_resp.json()["company"] == "Callcraft Devs"


@pytest.mark.asyncio
async def test_public_call_execution_header_and_spec_fallback():
    mock_spec = {
        "id": "spc_test123",
        "name": "KTP Extractor",
        "slug": "ktp-parser",
        "useExternalApiKey": True,
        "externalModelName": "gemini-3.6-flash",
        "externalApiKey": "sk-mock-gemini-key-12345",
        "positivePrompt": "Extract KTP data",
        "responseSchema": {
            "type": "object",
            "properties": {"name": {"type": "string"}},
        },
    }

    mock_adapter = AsyncMock()
    mock_adapter.execute_structured_extraction.return_value = (
        {"name": "John Doe"},
        {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
    )

    with patch("callcraft_api.routers.public.redis_service.get_spec", new_callable=AsyncMock) as mock_get_spec, \
         patch("callcraft_api.routers.public.Repository.verify_api_credential", new_callable=AsyncMock) as mock_verify_cred, \
         patch("callcraft_api.routers.public.redis_service.push_outbox", new_callable=AsyncMock), \
         patch("callcraft_api.routers.public.get_adapter", return_value=mock_adapter) as mock_get_adapter:

        try:
            mock_get_spec.return_value = mock_spec
            mock_verify_cred.return_value = {"id": "cred_1", "ip_whitelist": []}

            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                # 1. Hit without headers (Fallback to spec's model "gemini-3.6-flash")
                resp_fallback = await ac.post(
                    "/v1/call/usr_test123",
                    headers={"Authorization": "Bearer call_sk_valid_key", "X-CALL-PUBLIC-KEY": "pk_live_test_123", "X-CALL-SPEC-ID": "ktp-parser"},
                    json={"prompt": "Extract name"}
                )
                assert resp_fallback.status_code == 200
                data_fallback = resp_fallback.json()
                print("DEBUG data_fallback keys:", list(data_fallback.keys()))
                print("DEBUG data_fallback data:", data_fallback.get("data"))
                res_content = data_fallback["data"]["primaryResult"]["content"] if isinstance(data_fallback["data"], dict) and "primaryResult" in data_fallback["data"] else data_fallback["data"]
                assert res_content["name"] == "John Doe"

                # 2. Hit with override headers
                resp_override = await ac.post(
                    "/v1/call/usr_test123",
                    headers={
                        "Authorization": "Bearer call_sk_valid_key",
                        "X-CALL-PUBLIC-KEY": "pk_live_test_123",
                        "X-CALL-SPEC-ID": "ktp-parser",
                        "X-AI-API-KEY": "sk-user-custom-key-12345",
                        "X-AI-MODEL-NAME": "gpt-5.6-luna",
                    },
                    json={"prompt": "Extract name"}
                )
                assert resp_override.status_code == 200
                data_override = resp_override.json()
                assert "openai" in data_override["data"]["humanReadableMessage"]
                assert "gpt-5.6-luna" in data_override["data"]["humanReadableMessage"]
        except Exception as exc:
            import traceback
            traceback.print_exc()
            raise exc


@pytest.mark.asyncio
async def test_delete_spec_endpoint():
    app.dependency_overrides[get_current_user_id] = lambda: "usr_test123"
    with patch("callcraft_api.routers.internal.specs.Repository.delete_call_spec", new_callable=AsyncMock) as mock_delete:
        mock_delete.return_value = True

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.delete("/internal/v1/specs/spc_test123?user_id=usr_test123")
            assert res.status_code == 200
            data = res.json()
            assert data["id"] == "spc_test123"
            assert "berhasil dihapus" in data["message"]
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_close_account_endpoint():
    from unittest.mock import MagicMock
    from callcraft_api.routers.internal import get_db_session

    app.dependency_overrides[get_current_user_id] = lambda: "usr_test123"

    mock_user = MagicMock()
    mock_user.id = "usr_test123"
    mock_user.password_hash = "mock_hash"

    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = mock_user
    mock_db.execute.return_value = mock_res

    app.dependency_overrides[get_db_session] = lambda: mock_db

    with patch("callcraft_engine.crypto.verify_secret_argon2", return_value=True):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post(
                "/internal/v1/users/me/close-account?user_id=usr_test123",
                json={"password": "valid_password_123"},
            )
            assert res.status_code == 200
            data = res.json()
            assert "berhasil ditutup" in data["message"]

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_global_http_exception_envelope():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Request non-existent endpoint (404)
        res = await ac.get("/v1/non_existent_route_12345")
        assert res.status_code == 404
        data = res.json()
        assert data["meta"]["status"] == "failed"
        assert data["error"]["code"] == "RESOURCE_NOT_FOUND"
        assert "executionTrace" in data or "execution_trace" in data


@pytest.mark.asyncio
async def test_global_validation_error_envelope():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Send invalid body (variables expecting dict, send integer) to trigger 422
        res = await ac.post(
            "/v1/call/usr_test123",
            json={"variables": "invalid_string_not_dict"},
            headers={"Authorization": "Bearer call_sk_valid_key"},
        )
        assert res.status_code == 422
        data = res.json()
        assert data["meta"]["status"] == "failed"
        assert data["error"]["code"] == "INVALID_REQUEST_PAYLOAD"
        assert len(data["error"]["details"]) > 0


@pytest.mark.asyncio
async def test_ai_connection_failure_envelope():
    import httpx

    mock_spec = {
        "id": "spc_test123",
        "name": "KTP Extractor",
        "slug": "ktp-parser",
        "useExternalApiKey": True,
        "externalModelName": "gemini-3.6-flash",
        "externalApiKey": "sk-mock-gemini-key-12345",
        "responseSchema": {"type": "object", "properties": {"name": {"type": "string"}}},
    }

    mock_adapter = AsyncMock()
    mock_adapter.execute_structured_extraction.side_effect = httpx.ConnectError("Failed to establish SSL connection with AI Provider endpoint")

    with patch("callcraft_api.routers.public.redis_service.get_spec", new_callable=AsyncMock) as mock_get_spec, \
         patch("callcraft_api.routers.public.Repository.verify_api_credential", new_callable=AsyncMock) as mock_verify_cred, \
         patch("callcraft_api.routers.public.get_adapter", return_value=mock_adapter):

        mock_get_spec.return_value = mock_spec
        mock_verify_cred.return_value = {"id": "cred_1", "ip_whitelist": []}

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post(
                "/v1/call/usr_test123",
                headers={"Authorization": "Bearer call_sk_valid_key", "X-CALL-PUBLIC-KEY": "pk_live_test_123", "X-CALL-SPEC-ID": "ktp-parser"},
                json={"prompt": "Test AI connection failure"},
            )
            assert res.status_code == 502
            data = res.json()
            assert data["meta"]["status"] == "failed"
            assert "EXECUTION_FAILED" in data["error"]["code"] or "CONNECTION" in data["error"]["code"]
            assert data["error"]["actionableStep"] != ""
