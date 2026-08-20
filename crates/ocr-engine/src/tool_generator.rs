use crate::schema::{DataType, FieldDefinition, ResponseSchema};
use serde_json::{json, Value};

pub fn generate_ai_tool_schema(function_name: &str, description: &str, schema: &ResponseSchema) -> Value {
    let mut properties_json = json!({});
    let mut required_fields = Vec::new();

    for (field_name, field_def) in &schema.properties {
        let field_json = field_definition_to_json_schema(field_def);
        properties_json[field_name] = field_json;
        if field_def.required {
            required_fields.push(field_name.clone());
        }
    }

    json!({
        "type": "function",
        "function": {
            "name": function_name,
            "description": description,
            "parameters": {
                "type": "object",
                "properties": properties_json,
                "required": required_fields
            }
        }
    })
}

fn field_definition_to_json_schema(def: &FieldDefinition) -> Value {
    let mut obj = match &def.r#type {
        DataType::String | DataType::Text | DataType::Email | DataType::Phone | DataType::Date | DataType::DateTime | DataType::Currency => {
            json!({ "type": "string" })
        }
        DataType::Integer => json!({ "type": "integer" }),
        DataType::Number => json!({ "type": "number" }),
        DataType::Boolean => json!({ "type": "boolean" }),
        DataType::Enum { values } => json!({
            "type": "string",
            "enum": values
        }),
        DataType::Object { properties } => {
            let mut props_map = json!({});
            let mut req_list = Vec::new();
            for (k, v) in properties {
                props_map[k] = field_definition_to_json_schema(v);
                if v.required {
                    req_list.push(k.clone());
                }
            }
            json!({
                "type": "object",
                "properties": props_map,
                "required": req_list
            })
        }
        DataType::Array { items } => json!({
            "type": "array",
            "items": field_definition_to_json_schema(items)
        }),
    };

    if let Some(desc) = &def.description {
        obj["description"] = json!(desc);
    }

    obj
}
