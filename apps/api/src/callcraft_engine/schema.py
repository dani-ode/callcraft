from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class PlatformDataType(str, Enum):
    STRING = "string"
    TEXT = "text"
    INTEGER = "integer"
    NUMBER = "number"
    BOOLEAN = "boolean"
    EMAIL = "email"
    PHONE = "phone"
    DATE = "date"
    DATETIME = "datetime"
    CURRENCY = "currency"
    ENUM = "enum"
    OBJECT = "object"
    ARRAY = "array"


class FieldDefinition(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    type: PlatformDataType
    required: bool = True
    description: Optional[str] = None
    default: Optional[Any] = None
    enum_values: Optional[List[str]] = Field(default=None, alias="values")
    properties: Optional[Dict[str, "FieldDefinition"]] = None
    items: Optional["FieldDefinition"] = None


FieldDefinition.model_rebuild()


class ResponseSchema(BaseModel):
    title: Optional[str] = None
    properties: Dict[str, FieldDefinition]
