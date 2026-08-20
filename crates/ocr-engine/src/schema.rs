use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DataType {
    String,
    Text,
    Integer,
    Number,
    Boolean,
    Email,
    Phone,
    Date,
    DateTime,
    Currency,
    Enum { values: Vec<String> },
    Object { properties: HashMap<String, FieldDefinition> },
    Array { items: Box<FieldDefinition> },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FieldDefinition {
    pub r#type: DataType,
    #[serde(default)]
    pub required: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ResponseSchema {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    pub properties: HashMap<String, FieldDefinition>,
}

impl ResponseSchema {
    pub fn new(properties: HashMap<String, FieldDefinition>) -> Self {
        Self {
            title: None,
            properties,
        }
    }
}
