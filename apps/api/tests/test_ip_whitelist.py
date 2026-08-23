import pytest
from callcraft_engine.ip_utils import validate_ip_or_cidr, is_ip_allowed


def test_validate_ip_or_cidr():
    # Valid IPs & CIDRs
    assert validate_ip_or_cidr("192.168.1.1") is True
    assert validate_ip_or_cidr("10.0.0.0/24") is True
    assert validate_ip_or_cidr("127.0.0.1") is True
    assert validate_ip_or_cidr("2001:db8::1") is True
    assert validate_ip_or_cidr("2001:db8::/32") is True

    # Invalid IPs & CIDRs
    assert validate_ip_or_cidr("invalid_ip") is False
    assert validate_ip_or_cidr("256.256.256.256") is False
    assert validate_ip_or_cidr("10.0.0.0/33") is False
    assert validate_ip_or_cidr("") is False


def test_is_ip_allowed_empty_whitelist():
    # Empty whitelist allows all IPs
    assert is_ip_allowed("192.168.1.1", []) is True
    assert is_ip_allowed("10.0.0.5", None) is True


def test_is_ip_allowed_exact_matching():
    whitelist = ["192.168.1.50", "127.0.0.1", "2001:db8::1"]

    assert is_ip_allowed("192.168.1.50", whitelist) is True
    assert is_ip_allowed("127.0.0.1", whitelist) is True
    assert is_ip_allowed("2001:db8::1", whitelist) is True

    assert is_ip_allowed("192.168.1.51", whitelist) is False
    assert is_ip_allowed("10.0.0.1", whitelist) is False


def test_is_ip_allowed_cidr_matching():
    whitelist = ["10.0.0.0/24", "172.16.0.0/16", "2001:db8::/32"]

    assert is_ip_allowed("10.0.0.1", whitelist) is True
    assert is_ip_allowed("10.0.0.254", whitelist) is True
    assert is_ip_allowed("10.0.1.1", whitelist) is False

    assert is_ip_allowed("172.16.50.12", whitelist) is True
    assert is_ip_allowed("172.17.0.1", whitelist) is False

    assert is_ip_allowed("2001:db8:1234::1", whitelist) is True
    assert is_ip_allowed("2001:db9::1", whitelist) is False


@pytest.mark.asyncio
async def test_route_ip_whitelist_enforcement():
    from unittest.mock import patch, AsyncMock
    from httpx import ASGITransport, AsyncClient
    from callcraft_api import app

    mock_cred = {
        "id": "crd_test_ip_key",
        "user_id": "usr_test",
        "name": "Test Restricted Key",
        "public_key": "pk_live_test",
        "environment": "production",
        "ip_whitelist": ["192.168.1.100", "10.0.0.0/24"],
    }

    with patch("callcraft_api.db.repository.Repository.verify_api_credential", new_callable=AsyncMock) as mock_verify:
        mock_verify.return_value = mock_cred

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # 1. Request from non-whitelisted IP (203.0.113.50) via X-Forwarded-For -> expect 403 Forbidden
            res = await ac.post(
                "/v1/call/usr_test",
                json={"prompt": "test"},
                headers={"Authorization": "Bearer call_sk_live_test", "X-Forwarded-For": "203.0.113.50", "X-CALL-SPEC-ID": "ktp-parser"},
            )
            assert res.status_code == 403
            assert "tidak terdaftar" in res.json()["detail"]

            # 2. Request from whitelisted IP (10.0.0.15) via X-Forwarded-For -> passes IP check (progresses past auth)
            with patch("callcraft_api.services.redis_cache.redis_service.get_spec", new_callable=AsyncMock) as mock_redis:
                mock_redis.return_value = {"id": "spec_1", "slug": "ktp-parser", "use_external_api_key": False}
                res_allowed = await ac.post(
                    "/v1/call/usr_test",
                    json={"prompt": "test"},
                    headers={"Authorization": "Bearer call_sk_live_test", "X-Forwarded-For": "10.0.0.15", "X-CALL-SPEC-ID": "ktp-parser"},
                )
                # Should pass IP check (status != 403)
                assert res_allowed.status_code != 403
