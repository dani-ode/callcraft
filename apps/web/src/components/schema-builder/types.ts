export interface SchemaField {
  id: string;
  name: string;
  type: "string" | "number" | "integer" | "boolean" | "date" | "enum" | "object" | "array" | "text" | "file";
  required: boolean;
  description?: string;
  enumValues?: string;
  arrayItemType?: "string" | "number" | "object";
  allowedExtensions?: string;
  properties?: SchemaField[];
}

export interface ParentOption {
  id: string | null; // null represents Root level
  label: string;
  depth: number;
  type: "object" | "array";
}
