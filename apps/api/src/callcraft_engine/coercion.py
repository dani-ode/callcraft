from typing import Any, Dict, List
from .schema import FieldDefinition, PlatformDataType, ResponseSchema


class CoercionError(Exception):
    pass


def validate_and_coerce(schema: ResponseSchema, raw_value: Any, allow_missing_required: bool = False) -> Dict[str, Any]:
    if not isinstance(raw_value, dict):
        raise CoercionError("Root AI payload must be a JSON object")

    result_map: Dict[str, Any] = {}

    if "_ai_message" in raw_value:
        result_map["_ai_message"] = raw_value["_ai_message"]
    if "_executed_tools" in raw_value:
        result_map["_executed_tools"] = raw_value["_executed_tools"]

    for field_name, field_def in schema.properties.items():
        val = raw_value.get(field_name)

        if val is None:
            if field_def.required and not allow_missing_required:
                raise CoercionError(f"Missing required field: {field_name}")
            else:
                result_map[field_name] = (
                    field_def.default if field_def.default is not None else None
                )
        else:
            coerced_val = _coerce_field_value(field_name, field_def, val, allow_missing_required=allow_missing_required)
            result_map[field_name] = coerced_val

    return result_map


def _coerce_field_value(field_name: str, field_def: FieldDefinition, val: Any, allow_missing_required: bool = False) -> Any:
    dtype = field_def.type

    if dtype in (
        PlatformDataType.STRING,
        PlatformDataType.TEXT,
        PlatformDataType.EMAIL,
        PlatformDataType.PHONE,
        PlatformDataType.DATE,
        PlatformDataType.DATETIME,
        PlatformDataType.CURRENCY,
    ):
        if val is None:
            return None
        if isinstance(val, (str, int, float, bool)):
            return str(val).strip()
        raise CoercionError(f"Type mismatch for field {field_name}: expected string")

    elif dtype == PlatformDataType.INTEGER:
        if isinstance(val, int):
            return val
        if isinstance(val, float):
            return int(val)
        if isinstance(val, str):
            try:
                return int(val.strip())
            except ValueError:
                raise CoercionError(f"Type mismatch for field {field_name}: expected integer")
        raise CoercionError(f"Type mismatch for field {field_name}: expected integer")

    elif dtype == PlatformDataType.NUMBER:
        if isinstance(val, (int, float)):
            return float(val)
        if isinstance(val, str):
            try:
                return float(val.strip())
            except ValueError:
                raise CoercionError(f"Type mismatch for field {field_name}: expected number")
        raise CoercionError(f"Type mismatch for field {field_name}: expected number")

    elif dtype == PlatformDataType.BOOLEAN:
        if isinstance(val, bool):
            return val
        if isinstance(val, str):
            s = val.strip().lower()
            if s in ("true", "1", "yes"):
                return True
            if s in ("false", "0", "no"):
                return False
        raise CoercionError(f"Type mismatch for field {field_name}: expected boolean")

    elif dtype == PlatformDataType.ENUM:
        if not isinstance(val, str):
            raise CoercionError(f"Type mismatch for field {field_name}: expected enum string")
        str_val = val.strip()
        allowed = field_def.enum_values or []
        for a in allowed:
            if a.lower() == str_val.lower():
                return a
        allowed_str = ", ".join(allowed)
        raise CoercionError(
            f"Invalid enum value '{str_val}' for field {field_name}. Allowed values: {allowed_str}"
        )

    elif dtype == PlatformDataType.OBJECT:
        if not isinstance(val, dict):
            raise CoercionError(f"Type mismatch for field {field_name}: expected object")
        sub_props = field_def.properties or {}
        sub_schema = ResponseSchema(title=field_name, properties=sub_props)
        return validate_and_coerce(sub_schema, val, allow_missing_required=allow_missing_required)

    elif dtype == PlatformDataType.ARRAY:
        if not isinstance(val, list):
            raise CoercionError(f"Type mismatch for field {field_name}: expected array")
        res_list: List[Any] = []
        item_def = field_def.items or FieldDefinition(type=PlatformDataType.STRING)
        for i, item in enumerate(val):
            coerced_item = _coerce_field_value(f"{field_name}[{i}]", item_def, item, allow_missing_required=allow_missing_required)
            res_list.append(coerced_item)
        return res_list

    return val
