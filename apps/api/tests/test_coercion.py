import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

import pytest
from callcraft_engine.coercion import CoercionError, validate_and_coerce
from callcraft_engine.schema import FieldDefinition, PlatformDataType, ResponseSchema


def test_coercion_string_int_enum_and_defaults():
    props = {
        "nik": FieldDefinition(type=PlatformDataType.STRING, required=True),
        "age": FieldDefinition(type=PlatformDataType.INTEGER, required=True),
        "gender": FieldDefinition(
            type=PlatformDataType.ENUM,
            required=True,
            enum_values=["LAKI-LAKI", "PEREMPUAN"],
        ),
        "is_active": FieldDefinition(type=PlatformDataType.BOOLEAN, required=False, default=True),
    }

    schema = ResponseSchema(properties=props)

    raw_ai_output = {
        "nik": "3271041508950001",
        "age": "28",
        "gender": "laki-laki",
    }

    coerced = validate_and_coerce(schema, raw_ai_output)

    assert coerced["nik"] == "3271041508950001"
    assert coerced["age"] == 28
    assert coerced["gender"] == "LAKI-LAKI"
    assert coerced["is_active"] is True


def test_coercion_missing_required_field_raises():
    props = {
        "nik": FieldDefinition(type=PlatformDataType.STRING, required=True),
    }
    schema = ResponseSchema(properties=props)

    with pytest.raises(CoercionError, match="Missing required field: nik"):
        validate_and_coerce(schema, {})
