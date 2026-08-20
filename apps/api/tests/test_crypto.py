import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from callcraft_engine.crypto import (
    decrypt_aes_256_gcm,
    encrypt_aes_256_gcm,
    hash_secret_argon2,
    verify_secret_argon2,
)


def test_aes_256_gcm_encrypt_decrypt():
    master_key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    original_api_key = "AIzaSyDummyGeminiApiKey1234567890"

    ciphertext, nonce = encrypt_aes_256_gcm(original_api_key, master_key)
    assert ciphertext != original_api_key

    decrypted = decrypt_aes_256_gcm(ciphertext, nonce, master_key)
    assert decrypted == original_api_key


def test_argon2_hash_verify():
    customer_secret = "call_sk_live_sample_customer_key_998877"

    hash_str = hash_secret_argon2(customer_secret)
    assert hash_str != customer_secret

    assert verify_secret_argon2(customer_secret, hash_str) is True
    assert verify_secret_argon2("call_sk_live_wrong_key", hash_str) is False
