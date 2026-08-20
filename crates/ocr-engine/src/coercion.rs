use crate::schema::{DataType, ResponseSchema};
use serde_json::{json, Map, Value};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum CoercionError {
    #[error("Missing required field: {0}")]
    MissingRequiredField(String),
    #[error("Type mismatch for field {0}: expected {1}")]
    TypeMismatch(String, String),
    #[error("Invalid enum value '{0}' for field {1}. Allowed values: {2}")]
    InvalidEnumValue(String, String, String),
}

/// Validates raw JSON returned by AI Vision Model tool call against ResponseSchema and coerces data types
pub fn validate_and_coerce(schema: &ResponseSchema, raw_value: Value) -> Result<Value, CoercionError> {
    let raw_map = raw_value.as_object().ok_or_else(|| {
        CoercionError::TypeMismatch("root".to_string(), "JSON object".to_string())
    })?;

    let mut result_map = Map::new();

    for (field_name, field_def) in &schema.properties {
        let value_opt = raw_map.get(field_name);

        match (value_opt, field_def.required) {
            (None, true) => return Err(CoercionError::MissingRequiredField(field_name.clone())),
            (None, false) => {
                if let Some(def_val) = &field_def.default {
                    result_map.insert(field_name.clone(), def_val.clone());
                } else {
                    result_map.insert(field_name.clone(), Value::Null);
                }
            }
            (Some(val), _) => {
                let coerced_val = coerce_field_value(field_name, &field_def.r#type, val)?;
                result_map.insert(field_name.clone(), coerced_val);
            }        }
    }

    Ok(Value::Object(result_map))
}

fn coerce_field_value(field_name: &str, data_type: &DataType, val: &Value) -> Result<Value, CoercionError> {
    match data_type {
        DataType::String | DataType::Text | DataType::Email | DataType::Phone | DataType::Date | DataType::DateTime | DataType::Currency => {
            match val {
                Value::String(s) => Ok(json!(s.trim())),
                Value::Number(n) => Ok(json!(n.to_string())),
                Value::Bool(b) => Ok(json!(b.to_string())),
                Value::Null => Ok(Value::Null),
                _ => Err(CoercionError::TypeMismatch(field_name.to_string(), "string".to_string())),
            }
        }
        DataType::Integer => match val {
            Value::Number(n) if n.is_i64() => Ok(json!(n.as_i64().unwrap())),
            Value::Number(n) if n.is_f64() => Ok(json!(n.as_f64().unwrap() as i64)),
            Value::String(s) => s.trim().parse::<i64>().map(|i| json!(i)).map_err(|_| {
                CoercionError::TypeMismatch(field_name.to_string(), "integer".to_string())
            }),
            _ => Err(CoercionError::TypeMismatch(field_name.to_string(), "integer".to_string())),
        },
        DataType::Number => match val {
            Value::Number(n) => Ok(json!(n.as_f64().unwrap_or(0.0))),
            Value::String(s) => s.trim().parse::<f64>().map(|f| json!(f)).map_err(|_| {
                CoercionError::TypeMismatch(field_name.to_string(), "number".to_string())
            }),
            _ => Err(CoercionError::TypeMismatch(field_name.to_string(), "number".to_string())),
        },
        DataType::Boolean => match val {
            Value::Bool(b) => Ok(json!(b)),
            Value::String(s) => match s.trim().to_lowercase().as_str() {
                "true" | "1" | "yes" => Ok(json!(true)),
                "false" | "0" | "no" => Ok(json!(false)),
                _ => Err(CoercionError::TypeMismatch(field_name.to_string(), "boolean".to_string())),
            },
            _ => Err(CoercionError::TypeMismatch(field_name.to_string(), "boolean".to_string())),
        },
        DataType::Enum { values } => {
            let str_val = match val {
                Value::String(s) => s.trim(),
                _ => return Err(CoercionError::TypeMismatch(field_name.to_string(), "enum string".to_string())),
            };
            for allowed in values {
                if allowed.eq_ignore_ascii_case(str_val) {
                    return Ok(json!(allowed));
                }
            }
            Err(CoercionError::InvalidEnumValue(
                str_val.to_string(),
                field_name.to_string(),
                values.join(", "),
            ))
        }
        DataType::Object { properties } => {
            let sub_schema = ResponseSchema::new(properties.clone());
            validate_and_coerce(&sub_schema, val.clone())
        }
        DataType::Array { items } => {
            let arr = val.as_array().ok_or_else(|| {
                CoercionError::TypeMismatch(field_name.to_string(), "array".to_string())
            })?;
            let mut list = Vec::new();
            for item in arr {
                let coerced_item = coerce_field_value(&format!("{}[item]", field_name), &items.r#type, item)?;
                list.push(coerced_item);
            }
            Ok(Value::Array(list))
        }
    }
}
