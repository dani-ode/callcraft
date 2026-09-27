import pytest
from callcraft_api.config import Settings


@pytest.fixture(scope='session', autouse=True)
def ensure_db_initialized():
    """Configuration validation does not require database initialization."""
    return None


def test_execution_hmac_key_requires_32_bytes():
    settings = Settings(
        app_name='CallCraft', app_env='test', port=8080,
        postgres_user='u', postgres_password='p', postgres_db='d', postgres_host='h', postgres_port=5432,
        redis_host='h', redis_port=6379, redis_password='p', master_encryption_key='x',
        service_client_id='id', service_client_secret='secret', callcraft_execution_hmac_key='a' * 64,
    )
    settings.validate_execution_security()


def test_execution_hmac_key_rejects_short_or_non_hex():
    settings = Settings(
        app_name='CallCraft', app_env='test', port=8080,
        postgres_user='u', postgres_password='p', postgres_db='d', postgres_host='h', postgres_port=5432,
        redis_host='h', redis_port=6379, redis_password='p', master_encryption_key='x',
        service_client_id='id', service_client_secret='secret', callcraft_execution_hmac_key='eaf450085c15c3b880c66d0b78f2c041',
    )
    with pytest.raises(ValueError, match='CALLCRAFT_EXECUTION_HMAC_KEY'):
        settings.validate_execution_security()
