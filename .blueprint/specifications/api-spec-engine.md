# Specifications — Dynamic API Specification Engine

This document details the technical design of the **API Specification Engine** in **Callcraft**, covering declarative JSON schemas, data type taxonomy, AI Function/Tool Calling translation algorithms, and automated Pydantic validation & *Type Coercion* post-processing pipelines.

---

## 1. Supported Data Types Taxonomy

Callcraft provides a rich taxonomy of data types allowing users to define precise field constraints for extraction and structure validation.

```text
Platform Data Types
├── Basic Types
│   ├── string       (Short text string, default max 255 chars)
│   ├── text         (Long text string / full paragraphs)
│   ├── integer      (Whole integer numbers)
│   ├── number       (Floating-point / decimal numbers)
│   └── boolean      (Boolean true / false)
│
├── Special Types (Auto-formatted & Validated)
│   ├── email        (Valid RFC 5322 email string)
│   ├── phone        (International E.164 telephone format)
│   ├── date         (Standard ISO date YYYY-MM-DD)
│   ├── datetime     (Standard ISO 8601 YYYY-MM-DDTHH:mm:ssZ)
│   ├── currency     (Monetary decimal representation)
│   └── enum         (Strict string choices from predefined list)
│
└── Container Types (Recursive Nested Structures)
    ├── object       (Nested JSON object containing child properties)
    └── array        (List of recurring items or objects)
```

---

## 2. Request & Response Schema Specifications

### A. Request Schema Standard
Defines incoming HTTP `POST /v1/call/{user_id}` request payloads received from customer applications:

```json
{
  "type": "object",
  "properties": {
    "image": {
      "type": "image",
      "sources": ["base64", "url"],
      "required": false,
      "description": "Image or document file (Base64 string or remote HTTP URL)"
    },
    "prompt": {
      "type": "string",
      "required": false,
      "description": "Custom prompt instructions overriding default template prompts"
    },
    "variables": {
      "type": "object",
      "required": false,
      "description": "Dynamic JSON context variables for runtime interpolation"
    }
  }
}
```

---

### B. Response Schema Standard (Nested Recursive Example)
Example custom user specification for structured document extraction:

```json
{
  "type": "object",
  "properties": {
    "nik": {
      "type": "string",
      "required": true,
      "description": "16-digit national identification number"
    },
    "full_name": {
      "type": "string",
      "required": true,
      "description": "Full name as printed on document"
    },
    "gender": {
      "type": "enum",
      "required": true,
      "enum_values": ["MALE", "FEMALE"]
    },
    "birth": {
      "type": "object",
      "required": true,
      "properties": {
        "place": {
          "type": "string",
          "required": true,
          "description": "City or municipality of birth"
        },
        "date": {
          "type": "date",
          "required": true,
          "description": "Date of birth in YYYY-MM-DD format"
        }
      }
    },
    "address": {
      "type": "object",
      "required": true,
      "properties": {
        "street": { "type": "string", "required": false },
        "rt_rw": { "type": "string", "required": false },
        "district": { "type": "string", "required": false },
        "city": { "type": "string", "required": true }
      }
    },
    "family_members": {
      "type": "array",
      "required": false,
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string", "required": true },
          "relation": { "type": "string", "required": true }
        }
      }
    }
  }
}
```

---

## 3. Algorithm: Schema to AI Tool / Function Calling Translation

Before dispatching requests to AI Vision/LLM providers (Google Gemini, OpenAI GPT-4o, Anthropic Claude), the Engine dynamically translates the user's `response_schema` into native **Tool Calling Specs**.

```text
           User Response Schema JSON
                      │
                      ▼
┌───────────────────────────────────────────┐
│   Python Tool Schema Converter Engine     │
│                                           │
│  Map 'date', 'email', 'enum' -> Standard   │
│  JSON Schema primitive types (string)     │
│  Inject field descriptions & constraints  │
└─────────────────────┬─────────────────────┘
                      │
                      ▼
┌───────────────────────────────────────────┐
│       AI Native Function Calling Spec     │
└───────────────────────────────────────────┘
```

### Generated OpenAI Function Calling Payload Example:
```json
{
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "extract_document_data",
        "description": "Extract structured information from input documents according to schema specification.",
        "parameters": {
          "type": "object",
          "properties": {
            "nik": { "type": "string", "description": "16-digit national identification number" },
            "full_name": { "type": "string", "description": "Full name as printed on document" },
            "gender": { "type": "string", "enum": ["MALE", "FEMALE"] },
            "birth": {
              "type": "object",
              "properties": {
                "place": { "type": "string" },
                "date": { "type": "string", "description": "YYYY-MM-DD format" }
              },
              "required": ["place", "date"]
            }
          },
          "required": ["nik", "full_name", "gender", "birth"]
        }
      }
    }
  ],
  "tool_choice": { "type": "function", "function": { "name": "extract_document_data" } }
}
```

---

## 4. Post-Processing Pipeline: Type Coercion & Schema Validation

AI model tool outputs cannot be trusted implicitly without strict validation. The Engine executes a 4-stage post-processing pipeline:

```text
Raw Tool Arguments JSON (Returned by AI)
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 1. Recursive JSON Structure Validation              │
│    Verify mandatory properties present in object    │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 2. Type Coercion (AI Type Fault Tolerance)          │
│    - Number string ("123") ➔ Integer (123)         │
│    - Int number (100)      ➔ String ("100")         │
│    - Date string ("15-08-1995") ➔ Standard Date    │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 3. Pattern & Enum Validation                        │
│    - Case-insensitive enum matching                 │
│    - Validate Regex / Email / Phone formats         │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 4. Null & Default Fallback Sanitization             │
│    Assign default fallback values for missing items │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
    Clean & Validated Response JSON
```

---

## 5. Python Core Data Types & Pydantic Specifications

Internal engine data structures in Python (`apps/api/src/callcraft_engine`):

```python
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


class ResponseSchema(BaseModel):
    title: Optional[str] = None
    properties: Dict[str, FieldDefinition]

    def to_ai_tool_schema(self, function_name: str = "extract_data", description: str = "") -> Dict[str, Any]:
        """Translates ResponseSchema to standard AI tool calling function parameters."""
        pass
    
    def validate_and_coerce(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validates and coerces raw AI output JSON against field definition constraints."""
        pass
```

---

## 6. Envelope Builder Engine & Hallucination Auto-Retry (Q&A 6 & Q&A 7)

### A. Internal Auto-Retry Algorithm for AI Hallucinations
When raw AI Tool Calling output violates mandatory constraints (e.g., missing required fields, completely invalid JSON structures, or hallucinated property names), the Engine executes an internal auto-retry loop before producing an error response:

```text
       Raw AI Model Tool Output
                  │
                  ▼
   Validate Schema & Required Fields
                  │
        ┌─────────┴─────────┐
        │ Valid?            │
       YES                  NO
        │                   │
        ▼                   ▼
 Return Output      Retry Count < 2 ?
                    ├── YES ──► Re-prompt AI with error feedback prompt
                    └── NO  ──► Emit HTTP 422 with `AI_HALLUCINATION_DETECTED` Error Envelope
```

### B. Python Envelope Pydantic Schemas (`apps/api/src/callcraft_api/utils/envelope.py`)

```python
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ExecutionMode(str, Enum):
    SYNC = "sync"
    ASYNC_WEBHOOK = "async_webhook"


class ExecutionStatus(str, Enum):
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL_SUCCESS = "partial_success"


class MetaBlock(BaseModel):
    request_id: str
    trace_id: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    status: ExecutionStatus
    api_version: str = "v2.1"
    execution_mode: ExecutionMode = ExecutionMode.SYNC


class DetailItem(BaseModel):
    field: Optional[str] = None
    issue: str


class ErrorBlock(BaseModel):
    code: str
    message: str
    details: List[DetailItem] = Field(default_factory=list)
    actionable_step: Optional[str] = None


class ExecutionStep(BaseModel):
    step_id: str
    agent: str
    action_type: str  # e.g., 'tool_call', 'api_call', 'schema_coercion'
    tool_name: str
    status: str       # 'success', 'failed', 'retried'
    duration_ms: int


class ExecutionTraceBlock(BaseModel):
    total_duration_ms: int
    steps: List[ExecutionStep] = Field(default_factory=list)  # MUST ALWAYS BE ARRAY []
    warnings: List[str] = Field(default_factory=list)


class TokenUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class MetricsBlock(BaseModel):
    usage: TokenUsage = Field(default_factory=TokenUsage)
    estimated_cost_usd: float = 0.0


class DataPrimaryResult(BaseModel):
    type: str = "structured_json"
    content: Dict[str, Any]


class DataBlock(BaseModel):
    primary_result: DataPrimaryResult
    human_readable_message: Optional[str] = None


class ResponseEnvelope(BaseModel):
    meta: MetaBlock
    data: Optional[DataBlock] = None
    error: Optional[ErrorBlock] = None
    execution_trace: ExecutionTraceBlock
    metrics: Optional[MetricsBlock] = None
```

