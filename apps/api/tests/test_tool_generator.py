import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from callcraft_engine.schema import FieldDefinition, PlatformDataType, ResponseSchema
from callcraft_engine.tool_generator import generate_ai_tool_schema


def test_generate_ai_tool_schema():
    props = {
        "nik": FieldDefinition(type=PlatformDataType.STRING, required=True, description="NIK 16 Digit"),
        "age": FieldDefinition(type=PlatformDataType.INTEGER, required=True),
        "gender": FieldDefinition(
            type=PlatformDataType.ENUM,
            required=True,
            enum_values=["LAKI-LAKI", "PEREMPUAN"],
        ),
        "is_active": FieldDefinition(type=PlatformDataType.BOOLEAN, required=False, default=True),
    }
    schema = ResponseSchema(title="Document", properties=props)

    tool_spec = generate_ai_tool_schema("extract_data", "Extract identity info", schema)

    assert tool_spec["type"] == "function"
    assert tool_spec["function"]["name"] == "extract_data"
    fn_params = tool_spec["function"]["parameters"]
    assert fn_params["type"] == "object"
    assert "nik" in fn_params["properties"]
    assert fn_params["properties"]["nik"]["type"] == "string"
    assert "required" in fn_params
    assert "nik" in fn_params["required"]
    assert "age" in fn_params["required"]
    assert "is_active" not in fn_params["required"]
