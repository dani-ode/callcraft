"""
Callcraft Standard Enterprise ID Generator
Implements Prefixed ULID (Universally Unique Lexicographically Sortable Identifier)
Format: <prefix>_<26_character_ulid> (e.g., usr_01HZX89ABCDEF1234567890XYZ)
"""
import ulid

# Prefixes map for domain entities
PREFIX_USER = "usr"
PREFIX_PROJECT = "prj"
PREFIX_SPEC = "spc"
PREFIX_VERSION = "spv"
PREFIX_CREDENTIAL = "crd"
PREFIX_PROVIDER = "prv"
PREFIX_MODEL = "mdl"
PREFIX_USER_PROVIDER = "uap"
PREFIX_TEMPLATE = "tpl"
PREFIX_COMMENT = "cmt"
PREFIX_REQUEST = "req"
PREFIX_TRACE = "trc"
PREFIX_USAGE = "usg"
PREFIX_PLAYGROUND = "pgs"
PREFIX_ROLE = "rol"
PREFIX_PERMISSION = "prm"
PREFIX_SERVICE = "svc"
PREFIX_SYSTEM_PROMPT = "spm"
PREFIX_APP = "app"


def generate_id(prefix: str) -> str:
    """Generates a standard enterprise prefixed ULID string."""
    return f"{prefix}_{ulid.new().str}"
