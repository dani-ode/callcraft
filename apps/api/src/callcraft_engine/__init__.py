"""
Callcraft Engine — Shared Execution Engine Package
"""

from .schema import PlatformDataType, FieldDefinition, ResponseSchema
from .tool_generator import generate_ai_tool_schema
from .coercion import validate_and_coerce, CoercionError
from .crypto import encrypt_aes_256_gcm, decrypt_aes_256_gcm, hash_secret_argon2, verify_secret_argon2, CryptoError
from .ssrf import validate_url_ip, SsrfError

__all__ = [
    "PlatformDataType",
    "FieldDefinition",
    "ResponseSchema",
    "generate_ai_tool_schema",
    "validate_and_coerce",
    "CoercionError",
    "encrypt_aes_256_gcm",
    "decrypt_aes_256_gcm",
    "hash_secret_argon2",
    "verify_secret_argon2",
    "CryptoError",
    "validate_url_ip",
    "SsrfError",
]
