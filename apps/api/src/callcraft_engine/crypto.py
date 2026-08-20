import os
from typing import Tuple
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


class CryptoError(Exception):
    pass


ph = PasswordHasher()


def encrypt_aes_256_gcm(plaintext: str, master_key_hex: str) -> Tuple[str, str]:
    """Encrypts plaintext string using AES-256-GCM with master key (32 bytes hex). Returns (ciphertext_hex, nonce_hex)."""
    try:
        key_bytes = bytes.fromhex(master_key_hex)
    except ValueError:
        raise CryptoError("Invalid key length: must be 32 bytes hex")

    if len(key_bytes) != 32:
        raise CryptoError("Invalid key length: must be 32 bytes")

    aesgcm = AESGCM(key_bytes)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)

    return ciphertext.hex(), nonce.hex()


def decrypt_aes_256_gcm(ciphertext_hex: str, nonce_hex: str, master_key_hex: str) -> str:
    """Decrypts ciphertext_hex using AES-256-GCM and master_key_hex."""
    try:
        key_bytes = bytes.fromhex(master_key_hex)
        ciphertext = bytes.fromhex(ciphertext_hex)
        nonce = bytes.fromhex(nonce_hex)
    except ValueError:
        raise CryptoError("Decryption failed: invalid hex string")

    if len(key_bytes) != 32:
        raise CryptoError("Invalid key length: must be 32 bytes")
    if len(nonce) != 12:
        raise CryptoError("Decryption failed: nonce must be 12 bytes")

    try:
        aesgcm = AESGCM(key_bytes)
        decrypted = aesgcm.decrypt(nonce, ciphertext, None)
        return decrypted.decode("utf-8")
    except Exception:
        raise CryptoError("Decryption failed")


def hash_secret_argon2(secret: str) -> str:
    """Hashes secret string using Argon2id."""
    try:
        return ph.hash(secret)
    except Exception:
        raise CryptoError("Password hashing failed")


def verify_secret_argon2(secret: str, hash_str: str) -> bool:
    """Verifies secret string against Argon2id hash string."""
    try:
        return ph.verify(hash_str, secret)
    except VerifyMismatchError:
        return False
    except Exception:
        raise CryptoError("Password verification failed")
