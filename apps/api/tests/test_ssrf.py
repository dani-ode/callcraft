import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

import pytest
from callcraft_engine.ssrf import SsrfError, validate_url_ip


def test_ssrf_validator_blocks_private_and_loopback():
    with pytest.raises(SsrfError):
        validate_url_ip("http://127.0.0.1/admin")

    with pytest.raises(SsrfError):
        validate_url_ip("http://169.254.169.254/latest/meta-data/")

    with pytest.raises(SsrfError):
        validate_url_ip("ftp://example.com/file.jpg")
