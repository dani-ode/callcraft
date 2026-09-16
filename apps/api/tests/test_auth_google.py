import pytest
import respx
import ulid
from httpx import ASGITransport, AsyncClient

from callcraft_api import app
from callcraft_api.config import settings
from callcraft_api.services.redis_cache import redis_service


@pytest.mark.asyncio
async def test_get_google_auth_url():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/internal/v1/auth/google/url")
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert "state" in data
        assert "accounts.google.com" in data["url"]
        assert settings.google_client_id in data["url"]

        # State must be in cache and valid
        is_valid = await redis_service.verify_and_consume_oauth_state(data["state"])
        assert is_valid is True


@pytest.mark.asyncio
async def test_google_callback_with_google_error():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(
            "/internal/v1/auth/google/callback?error=access_denied&error_description=User+denied+consent",
            follow_redirects=False,
        )
        assert response.status_code == 302
        location = response.headers["location"]
        assert "/login?error=" in location
        assert "User" in location or "access_denied" in location


@pytest.mark.asyncio
async def test_google_callback_missing_params():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/internal/v1/auth/google/callback", follow_redirects=False)
        assert response.status_code == 302
        assert "error=missing_oauth_parameters" in response.headers["location"]


@pytest.mark.asyncio
async def test_google_callback_invalid_state():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(
            "/internal/v1/auth/google/callback?code=mock_code&state=non_existent_state",
            follow_redirects=False,
        )
        assert response.status_code == 302
        assert "error=invalid_or_expired_state" in response.headers["location"]


@pytest.mark.asyncio
@respx.mock
async def test_google_callback_unverified_email():
    state = "test_state_unverified"
    await redis_service.set_oauth_state(state, ttl=600)

    respx.post("https://oauth2.googleapis.com/token").respond(
        200, json={"access_token": "mock_access_token_123"}
    )
    respx.get("https://www.googleapis.com/oauth2/v3/userinfo").respond(
        200, json={
            "email": "unverified@gmail.com",
            "email_verified": False,
            "name": "Unverified User",
        }
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(
            f"/internal/v1/auth/google/callback?code=mock_code&state={state}",
            follow_redirects=False,
        )
        assert response.status_code == 302
        assert "error=unverified_google_email" in response.headers["location"]


@pytest.mark.asyncio
@respx.mock
async def test_google_callback_and_exchange_flow():
    unique_suffix = str(ulid.new()).lower()[-8:]
    test_google_email = f"googleuser_{unique_suffix}@example.com"
    test_google_name = f"Google User {unique_suffix}"
    test_picture = "https://lh3.googleusercontent.com/a/mockavatar"

    state = f"valid_oauth_state_{unique_suffix}"
    await redis_service.set_oauth_state(state, ttl=600)

    respx.post("https://oauth2.googleapis.com/token").respond(
        200, json={"access_token": "mock_google_token_valid"}
    )
    respx.get("https://www.googleapis.com/oauth2/v3/userinfo").respond(
        200, json={
            "email": test_google_email,
            "email_verified": True,
            "name": test_google_name,
            "picture": test_picture,
        }
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Trigger callback (Direct from Google)
        cb_resp = await ac.get(
            f"/internal/v1/auth/google/callback?code=valid_code&state={state}",
            follow_redirects=False,
        )
        assert cb_resp.status_code == 302
        location = cb_resp.headers["location"]
        assert "/auth/callback?code=" in location

        # Extract one-time exchange code from redirect URL
        exchange_code = location.split("code=")[1].split("&")[0]
        assert exchange_code

        # 2. Exchange code for session data
        exchange_resp = await ac.post(
            "/internal/v1/auth/google/exchange",
            json={"code": exchange_code},
        )
        assert exchange_resp.status_code == 200
        session_data = exchange_resp.json()

        assert session_data["email"] == test_google_email
        assert session_data["name"] == test_google_name
        assert session_data["avatar"] == test_picture
        assert session_data["status"] == "active"
        assert session_data["role"] == "developer"
        assert "id" in session_data

        # 3. Verify exchange code is single-use (replay must fail)
        replay_resp = await ac.post(
            "/internal/v1/auth/google/exchange",
            json={"code": exchange_code},
        )
        assert replay_resp.status_code == 400
