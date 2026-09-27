"""Metadata journal tests; no network/provider invocation."""
import pytest
from callcraft_api.services.execution_journal import fingerprint, ExecutionConflict


@pytest.fixture(scope='session', autouse=True)
def ensure_db_initialized():
    return None


def test_fingerprint_is_canonical_and_secret_bound(monkeypatch):
    monkeypatch.setenv('CALLCRAFT_EXECUTION_HMAC_KEY', 'test-only-first-key')
    initial = fingerprint({'a': 1, 'b': 2})
    assert initial == fingerprint({'b': 2, 'a': 1})
    assert initial != fingerprint({'a': 2, 'b': 2})
    monkeypatch.setenv('CALLCRAFT_EXECUTION_HMAC_KEY', 'test-only-second-key')
    assert initial != fingerprint({'a': 1, 'b': 2})


def test_missing_journal_key_fails_closed(monkeypatch):
    monkeypatch.delenv('CALLCRAFT_EXECUTION_HMAC_KEY', raising=False)
    with pytest.raises(ExecutionConflict, match='EXECUTION_JOURNAL_NOT_CONFIGURED'):
        fingerprint({'private': 'data'})
