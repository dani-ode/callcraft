"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Sparkles,
  Plus,
  Code,
  Trash2,
  Sliders,
  Layers,
  Bot,
  FileCode2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

export interface SchemaField {
  id: string;
  name: string;
  type: "string" | "number" | "integer" | "boolean" | "date" | "enum" | "object" | "array";
  required: boolean;
  description?: string;
  enumValues?: string;
  arrayItemType?: "string" | "number" | "object";
  properties?: SchemaField[];
}

// Standalone Component to Render Field Rows & Child Properties without focus loss
function FieldListRenderer({
  fields,
  onChange,
  onDelete,
  depth = 0,
}: {
  fields: SchemaField[];
  onChange: (updated: SchemaField[]) => void;
  onDelete: (id: string) => void;
  depth?: number;
}) {
  return (
    <div className={`space-y-3 ${depth > 0 ? "pl-4 border-l-2 border-indigo-500/30 my-2" : ""}`}>
      {fields.map((field, idx) => (
        <div
          key={field.id}
          className="p-4 rounded-xl glass-panel border border-slate-800 space-y-3 bg-slate-900/60 transition-all hover:border-slate-700"
        >
          {/* Top Bar: Name, Type Selector, Required, and Delete Button */}
          <div className="grid grid-cols-12 gap-3 items-center">
            <div className="col-span-4">
              <input
                type="text"
                value={field.name}
                onChange={(e) => {
                  const next = [...fields];
                  next[idx] = { ...next[idx], name: e.target.value };
                  onChange(next);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-indigo-300 font-mono focus:outline-none focus:border-indigo-500"
                placeholder="field_name"
              />
            </div>

            <div className="col-span-4">
              <select
                value={field.type}
                onChange={(e) => {
                  const next = [...fields];
                  const newType = e.target.value as any;
                  const updated = { ...next[idx], type: newType };
                  if (newType === "object" && !updated.properties) {
                    updated.properties = [];
                  }
                  if (newType === "array" && !updated.arrayItemType) {
                    updated.arrayItemType = "string";
                  }
                  next[idx] = updated;
                  onChange(next);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-semibold"
              >
                <option value="string">string (Text)</option>
                <option value="number">number (Float)</option>
                <option value="integer">integer (Whole Num)</option>
                <option value="boolean">boolean (True/False)</option>
                <option value="date">date (YYYY-MM-DD)</option>
                <option value="enum">enum (Options)</option>
                <option value="object">object (Nested Properties)</option>
                <option value="array">array (List Items)</option>
              </select>
            </div>

            <div className="col-span-3 flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => {
                    const next = [...fields];
                    next[idx] = { ...next[idx], required: e.target.checked };
                    onChange(next);
                  }}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                />
                <span>Required</span>
              </label>
            </div>

            <div className="col-span-1 flex justify-end">
              <button
                type="button"
                onClick={() => onDelete(field.id)}
                title="Delete field"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Description Input */}
          <div>
            <input
              type="text"
              value={field.description || ""}
              onChange={(e) => {
                const next = [...fields];
                next[idx] = { ...next[idx], description: e.target.value };
                onChange(next);
              }}
              className="w-full bg-slate-950/60 border border-slate-800/80 rounded-lg px-2.5 py-1 text-[11px] text-slate-400 focus:outline-none focus:border-slate-700"
              placeholder="Field description/instructions for AI model..."
            />
          </div>

          {/* Enum Value Options */}
          {field.type === "enum" && (
            <div className="pt-1">
              <label className="text-[10px] font-semibold text-purple-300">Allowed Enum Values (comma-separated):</label>
              <input
                type="text"
                value={field.enumValues || ""}
                onChange={(e) => {
                  const next = [...fields];
                  next[idx] = { ...next[idx], enumValues: e.target.value };
                  onChange(next);
                }}
                className="w-full mt-1 bg-slate-950 border border-purple-500/30 rounded-lg px-2.5 py-1 text-xs text-purple-200 font-mono focus:outline-none"
                placeholder="LAKI-LAKI, PEREMPUAN"
              />
            </div>
          )}

          {/* Array Options */}
          {field.type === "array" && (
            <div className="pt-1 space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-medium text-slate-400">Array Item Element Type:</span>
                <select
                  value={field.arrayItemType || "string"}
                  onChange={(e) => {
                    const next = [...fields];
                    const updated = { ...next[idx], arrayItemType: e.target.value as any };
                    if (e.target.value === "object" && !updated.properties) {
                      updated.properties = [];
                    }
                    next[idx] = updated;
                    onChange(next);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-indigo-300 font-semibold"
                >
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="object">object (Array of Nested Objects)</option>
                </select>
              </div>
            </div>
          )}

          {/* Child Properties for Objects or Array of Objects */}
          {(field.type === "object" || (field.type === "array" && field.arrayItemType === "object")) && (
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Sub-Properties ({field.properties?.length || 0})</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const next = [...fields];
                    const childList = [...(next[idx].properties || [])];
                    childList.push({
                      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                      name: "",
                      type: "string",
                      required: true,
                    });
                    next[idx] = { ...next[idx], properties: childList };
                    onChange(next);
                  }}
                  className="px-2.5 py-1 rounded-md bg-indigo-600/20 text-indigo-300 text-[11px] font-medium hover:bg-indigo-600/30 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Sub-Property</span>
                </button>
              </div>

              {field.properties && field.properties.length > 0 ? (
                <FieldListRenderer
                  fields={field.properties}
                  onChange={(updatedChildren) => {
                    const next = [...fields];
                    next[idx] = { ...next[idx], properties: updatedChildren };
                    onChange(next);
                  }}
                  onDelete={(childId) => {
                    const next = [...fields];
                    next[idx] = {
                      ...next[idx],
                      properties: (next[idx].properties || []).filter((c) => c.id !== childId),
                    };
                    onChange(next);
                  }}
                  depth={depth + 1}
                />
              ) : (
                <p className="text-[11px] text-slate-500 italic pl-2">No child properties added yet.</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function VisualSchemaBuilderPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<"response" | "request" | "settings">("response");
  const [specName, setSpecName] = useState("Indonesian KTP Parser");
  const [specSlug, setSpecSlug] = useState("ktp-parser");
  const [selectedModel, setSelectedModel] = useState("gemini-3.6-flash");
  const [systemPrompt, setSystemPrompt] = useState(
    "Extract clear, exact text fields from the document image adhering strictly to the JSON schema."
  );
  const [extractionPrompt, setExtractionPrompt] = useState(
    "Verify NIK structure against 16-digit standard. Ensure all text fields are uppercase."
  );

  // Status mapping for AI Provider Key configured status (queried from /keys)
  const providerKeyStatus: Record<string, { active: boolean; label: string }> = {
    gemini: { active: true, label: "Google Gemini Key Configured & Active" },
    openai: { active: true, label: "OpenAI Key Configured & Active" },
    anthropic: { active: false, label: "Anthropic Key Required (Inactive)" },
    deepseek: { active: false, label: "DeepSeek Key Required (Inactive)" },
  };

  const getProviderFromModel = (model: string): string => {
    if (model.startsWith("gemini")) return "gemini";
    if (model.startsWith("gpt")) return "openai";
    if (model.startsWith("claude")) return "anthropic";
    if (model.startsWith("deepseek") || model.startsWith("ocr")) return "deepseek";
    return "gemini";
  };

  const currentProviderCode = getProviderFromModel(selectedModel);
  const currentProviderStatus = providerKeyStatus[currentProviderCode] || { active: false, label: "Key Required" };

  // Request Schema Fields
  const [requestFields, setRequestFields] = useState<SchemaField[]>([
    { id: "req_1", name: "image", type: "string", required: true, description: "Base64 encoded string or URL of document" },
  ]);

  // Response Schema Fields (Supports Nested Objects & Arrays)
  const [responseFields, setResponseFields] = useState<SchemaField[]>([
    { id: "res_1", name: "nik", type: "string", required: true, description: "16-digit National Identification Number" },
    { id: "res_2", name: "full_name", type: "string", required: true, description: "Full legal name as written on document" },
    {
      id: "res_3",
      name: "gender",
      type: "enum",
      required: true,
      enumValues: "LAKI-LAKI, PEREMPUAN",
      description: "Gender classification",
    },
    { id: "res_4", name: "date_of_birth", type: "date", required: false, description: "Date of birth (YYYY-MM-DD)" },
    {
      id: "res_5",
      name: "address_details",
      type: "object",
      required: false,
      description: "Structured address hierarchy",
      properties: [
        { id: "res_5_1", name: "street", type: "string", required: true, description: "Street address" },
        { id: "res_5_2", name: "rt_rw", type: "string", required: false, description: "RT/RW unit number" },
        { id: "res_5_3", name: "city", type: "string", required: true, description: "City or regency" },
      ],
    },
    {
      id: "res_6",
      name: "line_items",
      type: "array",
      required: false,
      arrayItemType: "object",
      description: "Extracted document line items list",
      properties: [
        { id: "res_6_1", name: "item_name", type: "string", required: true, description: "Name of item" },
        { id: "res_6_2", name: "price", type: "number", required: true, description: "Item unit price" },
      ],
    },
  ]);

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Helper function to build standard JSON schema from field list recursively
  const buildJsonSchema = (fieldList: SchemaField[]): Record<string, any> => {
    const properties: Record<string, any> = {};
    const requiredFields: string[] = [];

    fieldList.forEach((f) => {
      if (!f.name.trim()) return;
      if (f.required) requiredFields.push(f.name);

      if (f.type === "enum") {
        properties[f.name] = {
          type: "string",
          enum: f.enumValues ? f.enumValues.split(",").map((s) => s.trim()).filter(Boolean) : [],
          description: f.description || undefined,
        };
      } else if (f.type === "array") {
        if (f.arrayItemType === "object" && f.properties && f.properties.length > 0) {
          properties[f.name] = {
            type: "array",
            items: buildJsonSchema(f.properties),
            description: f.description || undefined,
          };
        } else {
          properties[f.name] = {
            type: "array",
            items: { type: f.arrayItemType || "string" },
            description: f.description || undefined,
          };
        }
      } else if (f.type === "object") {
        properties[f.name] = buildJsonSchema(f.properties || []);
        if (f.description) properties[f.name].description = f.description;
      } else {
        properties[f.name] = {
          type: f.type,
          description: f.description || undefined,
        };
      }
    });

    return {
      type: "object",
      properties,
      ...(requiredFields.length > 0 ? { required: requiredFields } : {}),
    };
  };

  const currentFieldList = activeTab === "request" ? requestFields : responseFields;
  const setCurrentFieldList = activeTab === "request" ? setRequestFields : setResponseFields;

  const handleAddField = (parentProperties?: SchemaField[], setParentProperties?: (p: SchemaField[]) => void) => {
    const newField: SchemaField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: "",
      type: "string",
      required: true,
      description: "",
    };

    if (parentProperties && setParentProperties) {
      setParentProperties([...parentProperties, newField]);
    } else {
      setCurrentFieldList([...currentFieldList, newField]);
    }
  };

  const handleDeleteField = (id: string, list: SchemaField[], setList: (l: SchemaField[]) => void) => {
    const filterRecursive = (items: SchemaField[]): SchemaField[] => {
      return items
        .filter((item) => item.id !== id)
        .map((item) => ({
          ...item,
          properties: item.properties ? filterRecursive(item.properties) : undefined,
        }));
    };
    setList(filterRecursive(list));
  };

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Action Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <Link href="/specs" className="p-2 rounded-xl glass-panel text-slate-400 hover:text-slate-200">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Code className="w-5 h-5 text-indigo-400" />
              <span>Visual API Schema Builder</span>
            </h1>
            <p className="text-xs text-slate-400">Spec ID: {params.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {savedSuccess && (
            <span className="text-xs text-emerald-400 font-semibold animate-pulse">✓ Saved Successfully</span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save & Publish Version</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Request, Response, Settings) */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("response")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === "response"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-400 hover:text-slate-200 glass-panel"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Response Schema (AI Output)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("request")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === "request"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-400 hover:text-slate-200 glass-panel"
          }`}
        >
          <FileCode2 className="w-4 h-4" />
          <span>Request Schema (Input Payload)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === "settings"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-400 hover:text-slate-200 glass-panel"
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Prompt & Execution Settings</span>
        </button>
      </div>

      {/* Main Split Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel: Schema Editor Nodes */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
          {activeTab === "settings" ? (
            <div className="space-y-5">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>API & Model Configurations</span>
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Spec Name</label>
                    <input
                      type="text"
                      value={specName}
                      onChange={(e) => setSpecName(e.target.value)}
                      className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300">API Slug</label>
                    <input
                      type="text"
                      value={specSlug}
                      onChange={(e) => setSpecSlug(e.target.value)}
                      className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* AI Model Selector */}
                <div className="space-y-3 p-4 rounded-xl glass-panel border border-slate-800 bg-slate-900/40">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-purple-400" />
                      <span>Preferred Execution AI Model</span>
                    </label>

                    {/* Simple Provider Key Status Badge */}
                    {currentProviderStatus.active ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>Key Configured</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[10px] font-semibold border border-amber-500/20 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <span>Key Setup Required</span>
                      </span>
                    )}
                  </div>

                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-semibold focus:outline-none focus:border-indigo-500"
                  >
                    <optgroup label="Google Gemini (Key Configured)">
                      <option value="gemini-3.6-flash">Gemini 3.6 Flash (Default - Fast Vision & Tools)</option>
                      <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                      <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite</option>
                    </optgroup>
                    <optgroup label="OpenAI (Key Configured)">
                      <option value="gpt-5.6-luna">GPT-5.6 Luna (High Accuracy Reasoning)</option>
                      <option value="gpt-5.6-terra">GPT-5.6 Terra</option>
                      <option value="gpt-5.6-sol">GPT-5.6 Sol</option>
                    </optgroup>
                    <optgroup label="Anthropic Claude (Setup Required in API Keys menu)">
                      <option value="claude-sonnet-5">Claude Sonnet 5</option>
                      <option value="claude-opus-5">Claude Opus 5</option>
                      <option value="claude-haiku-4.5">Claude Haiku 4.5</option>
                    </optgroup>
                    <optgroup label="DeepSeek & OCR (Setup Required in API Keys menu)">
                      <option value="deepseek-vl2">DeepSeek VL2 (Multimodal Vision)</option>
                      <option value="deepseek-ocr">DeepSeek OCR Engine</option>
                      <option value="ocr-4.1">OCR 4.1 Precision Engine</option>
                    </optgroup>
                  </select>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Manage, test, or update AI Provider API keys:</span>
                    <Link
                      href="/keys"
                      className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
                    >
                      <span>API Credentials Menu</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">System Extraction Prompt (System Role)</label>
                  <textarea
                    rows={3}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="w-full mt-1.5 bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
                    placeholder="Base system prompt given to the AI model..."
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Preset Extraction Directives (Additional Spec Prompt)</span>
                    <span className="text-[10px] text-indigo-400 font-normal">Appended to extraction instructions</span>
                  </label>
                  <textarea
                    rows={3}
                    value={extractionPrompt}
                    onChange={(e) => setExtractionPrompt(e.target.value)}
                    className="w-full mt-1.5 bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-indigo-200 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
                    placeholder="Specific directives for this API spec (e.g. Ensure NIK is 16 digits, format all text to uppercase)..."
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">
                    {activeTab === "response" ? "Response Schema Fields (Target AI Output)" : "Request Schema Fields (Input API Payload)"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {activeTab === "response"
                      ? "Define structured output fields, nested objects, and item arrays."
                      : "Define input fields sent by client applications (e.g. image, prompt, metadata)."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddField()}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Property</span>
                </button>
              </div>

              {currentFieldList.length > 0 ? (
                <FieldListRenderer
                  fields={currentFieldList}
                  onChange={(updated) => setCurrentFieldList(updated)}
                  onDelete={(id) => handleDeleteField(id, currentFieldList, setCurrentFieldList)}
                />
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs italic">
                  No properties added yet. Click &quot;Add Property&quot; to define fields.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel: Real-Time JSON Schema Preview */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Real-Time JSON Schema Preview ({activeTab.toUpperCase()})</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Pydantic v2 & OpenAPI 3.0 Compatible</span>
          </div>

          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-emerald-400 overflow-x-auto min-h-[380px]">
            <pre>{JSON.stringify(buildJsonSchema(currentFieldList), null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
