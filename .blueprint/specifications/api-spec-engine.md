# Specifications — Dynamic API Specification Engine

Dokumen ini menjelaskan rancangan teknis **API Specification Engine** pada **OCR Platform**, mencakup skema JSON deklaratif, taksonomi tipe data platform, algoritma translasi ke *AI Function/Tool Calling*, serta mekanisme validasi dan *Type Coercion* otomatis.

---

## 1. Supported Data Types Taxonomy

Platform menyediakan taksonomi tipe data kaya (*rich data types*) yang memungkinkan pengguna mendefinisikan bidang ekstraksi secara presisi.

```text
Platform Data Types
├── Basic Types
│   ├── string       (String pendek, default max 255 char)
│   ├── text         (String panjang/paragraf)
│   ├── integer      (Bilangan bulat)
│   ├── number       (Bilangan desimal / floating-point)
│   └── boolean      (true / false)
│
├── Special Types (Auto-formatted & Validate)
│   ├── email        (Format email valid)
│   ├── phone        (Nomor telepon / WhatsApp format E.164)
│   ├── date         (Format tanggal YYYY-MM-DD)
│   ├── datetime     (Format ISO-8601 YYYY-MM-DDTHH:mm:ssZ)
│   ├── currency     (Nilai uang / moneter desimal)
│   └── enum         (Pilihan terbatas string dari opsi yang ditentukan)
│
└── Container Types (Recursive Nested Structures)
    ├── object       (Objek JSON bertingkat memiliki properti turunan)
    └── array        (Daftar berulang dari elemen tipe tertentu atau objek)
```

---

## 2. Request & Response Schema Specifications

### A. Request Schema Standard
Mendefinisikan input payload HTTP `POST /v1/ocr/{user_id}` yang diterima dari aplikasi customer:

```json
{
  "type": "object",
  "properties": {
    "image": {
      "type": "image",
      "sources": ["base64", "url"],
      "required": true,
      "description": "File gambar dokumen (Base64 string atau HTTP URL)"
    },
    "prompt": {
      "type": "string",
      "required": false,
      "description": "Instruksi khusus tambahan untuk ekstraksi ini"
    }
  }
}
```

---

### B. Response Schema Standard (Nested Recursive Example)
Contoh spesifikasi kustom pengguna untuk ekstraksi **KTP Indonesia**:

```json
{
  "type": "object",
  "properties": {
    "nik": {
      "type": "string",
      "required": true,
      "description": "16 digit Nomor Induk Kependudukan"
    },
    "full_name": {
      "type": "string",
      "required": true,
      "description": "Nama lengkap sesuai KTP"
    },
    "gender": {
      "type": "enum",
      "required": true,
      "enum_values": ["LAKI-LAKI", "PEREMPUAN"]
    },
    "birth": {
      "type": "object",
      "required": true,
      "properties": {
        "place": {
          "type": "string",
          "required": true,
          "description": "Kota/Kabupaten tempat lahir"
        },
        "date": {
          "type": "date",
          "required": true,
          "description": "Tanggal lahir format YYYY-MM-DD"
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

Sebelum dikirimkan ke provider AI (OpenAI GPT-4o atau Google Gemini 1.5), Engine secara dinamis mengonversi `response_schema` milik pengguna menjadi deklarasi fungsi resmi (*Tool Calling Spec*).

```text
           User Response Schema JSON
                      │
                      ▼
┌───────────────────────────────────────────┐
│     Rust Tool Schema Converter Engine     │
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
        "description": "Ekstrak informasi terstruktur dari dokumen gambar yang diberikan sesuai spesifikasi schema.",
        "parameters": {
          "type": "object",
          "properties": {
            "nik": { "type": "string", "description": "16 digit Nomor Induk Kependudukan" },
            "full_name": { "type": "string", "description": "Nama lengkap sesuai KTP" },
            "gender": { "type": "string", "enum": ["LAKI-LAKI", "PEREMPUAN"] },
            "birth": {
              "type": "object",
              "properties": {
                "place": { "type": "string" },
                "date": { "type": "string", "description": "Format YYYY-MM-DD" }
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

AI output yang dikembalikan via tool call tidak boleh dipercaya 100% tanpa validasi tipe. Engine menjalankan pipeline sanitasi 4-tahap:

```text
Raw Tool Arguments JSON (Returned by AI)
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 1. Recursive JSON Structure Validation              │
│    Check mandatory properties present               │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 2. Type Coercion (Toleransi Kesalahan Tipe AI)      │
│    - Number string ("123") ➔ Integer (123)         │
│    - Int number (100)      ➔ String ("100")         │
│    - Date string ("15-08-1995") ➔ Standard Date    │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 3. Pattern & Enum Validation                        │
│    - Match against enum values (Case-insensitive)   │
│    - Validate Regex / Email / Phone rules           │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 4. Null & Default Fallback Sanitization             │
│    Set default values for missing optional fields   │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
    Clean & Validated Response JSON
```

---

## 5. Rust Core Data Types & Struct Specifications

Struktur data internal di Rust (`crates/ocr-engine`):

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PlatformDataType {
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldDefinition {
    pub r#type: PlatformDataType,
    pub required: bool,
    pub description: Option<String>,
    pub default: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponseSchema {
    pub title: Option<String>,
    pub properties: HashMap<String, FieldDefinition>,
}

impl ResponseSchema {
    /// Mengonversi ResponseSchema menjadi JSON Schema standar untuk Tool Calling AI
    pub fn to_ai_tool_schema(&self) -> serde_json::Value {
        // Implementation logic
        serde_json::json!({})
    }
    
    /// Memvalidasi dan melakukan coercion pada raw JSON output milik AI
    pub fn validate_and_coerce(&self, raw: serde_json::Value) -> Result<serde_json::Value, ValidationError> {
        // Implementation logic
        Ok(raw)
    }
}
```
