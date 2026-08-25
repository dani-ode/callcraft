from typing import Any, Dict
from .schema import FieldDefinition, PlatformDataType, ResponseSchema


def generate_ai_tool_schema(
    function_name: str,
    description: str,
    schema: ResponseSchema,
) -> Dict[str, Any]:
    properties_json: Dict[str, Any] = {}
    required_fields = []

    for field_name, field_def in schema.properties.items():
        properties_json[field_name] = _field_definition_to_json_schema(field_def)
        if field_def.required:
            required_fields.append(field_name)

    # Attach _ai_commentary parameter so AI generates dynamic contextual commentary for humanReadableMessage
    properties_json["_ai_commentary"] = {
        "type": "string",
        "description": "Komentar/penjelasan ringkas manusiawi dari AI mengenai hasil analisis dokumen ini (misal: jenis dokumen yang ditemukan, atau penjelasan/alasan jika dokumen tidak sesuai atau bingung/tidak jelas).",
    }

    return {
        "type": "function",
        "function": {
            "name": function_name,
            "description": description,
            "parameters": {
                "type": "object",
                "properties": properties_json,
                "required": required_fields,
            },
        },
    }


def _field_definition_to_json_schema(def_item: FieldDefinition) -> Dict[str, Any]:
    dtype = def_item.type
    obj: Dict[str, Any] = {}

    if dtype in (
        PlatformDataType.STRING,
        PlatformDataType.TEXT,
        PlatformDataType.EMAIL,
        PlatformDataType.PHONE,
        PlatformDataType.DATE,
        PlatformDataType.DATETIME,
        PlatformDataType.CURRENCY,
    ):
        obj = {"type": "string"}
    elif dtype == PlatformDataType.INTEGER:
        obj = {"type": "integer"}
    elif dtype == PlatformDataType.NUMBER:
        obj = {"type": "number"}
    elif dtype == PlatformDataType.BOOLEAN:
        obj = {"type": "boolean"}
    elif dtype == PlatformDataType.ENUM:
        obj = {
            "type": "string",
            "enum": def_item.enum_values or [],
        }
    elif dtype == PlatformDataType.OBJECT:
        props_map = {}
        req_list = []
        if def_item.properties:
            for k, v in def_item.properties.items():
                props_map[k] = _field_definition_to_json_schema(v)
                if v.required:
                    req_list.append(k)
        obj = {
            "type": "object",
            "properties": props_map,
            "required": req_list,
        }
    elif dtype == PlatformDataType.ARRAY:
        items_schema = (
            _field_definition_to_json_schema(def_item.items)
            if def_item.items
            else {"type": "string"}
        )
        obj = {
            "type": "array",
            "items": items_schema,
        }

    if def_item.description:
        obj["description"] = def_item.description

    return obj
