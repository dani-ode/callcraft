"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Sparkles,
  Plus,
  Code,
  FileCode2,
  Sliders,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { SchemaField } from "@/components/schema-builder/types";
import { FieldListRenderer } from "@/components/schema-builder/field-list-renderer";
import { SchemaPreview } from "@/components/schema-builder/schema-preview";
import { ExecutionSettings } from "@/components/schema-builder/execution-settings";

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

  // Provider configured status (queried from /keys)
  const providerKeyStatus: Record<string, { active: boolean; label: string }> = {
    gemini: { active: true, label: "Google Gemini Key Configured & Active" },
    openai: { active: true, label: "OpenAI Key Configured & Active" },
    anthropic: { active: false, label: "Anthropic Key Required (Inactive)" },
    mistral: { active: false, label: "Mistral Key Required (Inactive)" },
    deepseek: { active: false, label: "DeepSeek Key Required (Inactive)" },
  };

  const getProviderFromModel = (model: string): string => {
    if (model.startsWith("gemini")) return "gemini";
    if (model.startsWith("gpt")) return "openai";
    if (model.startsWith("claude")) return "anthropic";
    if (model.startsWith("mistral") || model.startsWith("pixtral")) return "mistral";
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
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [expandedPanel, setExpandedPanel] = useState<"editor" | "preview" | null>(null);

  const currentFieldList = activeTab === "request" ? requestFields : responseFields;
  const setCurrentFieldList = activeTab === "request" ? setRequestFields : setResponseFields;

  const handleAddField = () => {
    const newField: SchemaField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: "",
      type: "string",
      required: true,
      description: "",
    };
    setCurrentFieldList([...currentFieldList, newField]);
  };

  const handleDeleteField = (id: string) => {
    const filterRecursive = (items: SchemaField[]): SchemaField[] => {
      return items
        .filter((item) => item.id !== id)
        .map((item) => ({
          ...item,
          properties: item.properties ? filterRecursive(item.properties) : undefined,
        }));
    };
    setCurrentFieldList(filterRecursive(currentFieldList));
  };

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-6 lg:h-[calc(100vh-100px)] flex flex-col">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#edd6bb]/25 gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/specs"
            className="p-2 rounded-xl glass-panel text-[#8a715e] dark:text-[#edd6bb] hover:bg-[#e1b329]/15 border border-[#edd6bb]/25 transition-all"
            title="Back to API Specs list"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold flex items-center gap-2">
              <Code className="w-5 h-5 text-[#e1b329]" />
              <span>Visual API Schema Builder</span>
            </h1>
            <p className="text-xs opacity-75 font-mono">Spec ID: {params.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {savedSuccess && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold animate-pulse">
              ✓ Saved Successfully
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            title="Save changes and publish schema version"
            className="px-4 py-2 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 text-xs font-extrabold shadow-lg shadow-[#e1b329]/20 flex items-center gap-2 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save & Publish Version</span>
          </button>
        </div>
      </div>

      {/* Redesigned Navigation Tabs with Crisp Grid Borders & Visual Separators */}
      <div className="shrink-0 overflow-x-auto max-w-full pb-1">
        <div className="inline-flex items-center whitespace-nowrap rounded-2xl bg-[#0d0907]/60 dark:bg-black/60 p-1.5 border border-[#edd6bb]/30 dark:border-[#edd6bb]/20 shadow-md">
          <button
            type="button"
            onClick={() => setActiveTab("response")}
            title="Define target structured output fields for AI responses"
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border-r border-[#edd6bb]/20 last:border-r-0 ${
              activeTab === "response"
                ? "bg-[#e1b329] text-slate-950 shadow-md shadow-[#e1b329]/20 font-extrabold ring-1 ring-[#e1b329]"
                : "text-[#edd6bb]/80 hover:text-[#edd6bb] hover:bg-[#edd6bb]/10"
            }`}
          >
            <Sparkles className="w-4 h-4 text-inherit" />
            <span>Response Schema (AI Output)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("request")}
            title="Define input payload parameters sent by client applications"
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border-r border-[#edd6bb]/20 last:border-r-0 ${
              activeTab === "request"
                ? "bg-[#e1b329] text-slate-950 shadow-md shadow-[#e1b329]/20 font-extrabold ring-1 ring-[#e1b329]"
                : "text-[#edd6bb]/80 hover:text-[#edd6bb] hover:bg-[#edd6bb]/10"
            }`}
          >
            <FileCode2 className="w-4 h-4 text-inherit" />
            <span>Request Schema (Input Payload)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            title="Configure system prompt, instructions, and target AI models"
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === "settings"
                ? "bg-[#e1b329] text-slate-950 shadow-md shadow-[#e1b329]/20 font-extrabold ring-1 ring-[#e1b329]"
                : "text-[#edd6bb]/80 hover:text-[#edd6bb] hover:bg-[#edd6bb]/10"
            }`}
          >
            <Sliders className="w-4 h-4 text-inherit" />
            <span>Prompt & Execution Settings</span>
          </button>
        </div>
      </div>

      {/* Main Split Screen with Independent Expandable Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1 min-h-[480px] h-[520px] lg:h-full overflow-hidden relative">
        {/* Fullscreen Backdrop Overlay when a panel is expanded */}
        {expandedPanel !== null && (
          <div
            onClick={() => setExpandedPanel(null)}
            className="fixed inset-0 z-[998] bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          />
        )}

        {/* Left Panel: Schema Editor Nodes */}
        <div
          className={`glass-panel p-4 sm:p-5 rounded-2xl border border-[#edd6bb]/25 flex flex-col overflow-hidden shadow-xl transition-all ${
            expandedPanel === "editor"
              ? "fixed inset-3 sm:inset-5 z-[999] bg-[#fdfaf5] dark:bg-[#120e0b] h-[calc(100vh-2.5rem)] w-[calc(100vw-2.5rem)] border-[#e1b329]/50 shadow-2xl"
              : expandedPanel === "preview"
              ? "hidden"
              : "h-full"
          }`}
        >
          {activeTab === "settings" ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
              <ExecutionSettings
                specName={specName}
                setSpecName={setSpecName}
                specSlug={specSlug}
                setSpecSlug={setSpecSlug}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                systemPrompt={systemPrompt}
                setSystemPrompt={setSystemPrompt}
                extractionPrompt={extractionPrompt}
                setExtractionPrompt={setExtractionPrompt}
                currentProviderStatus={currentProviderStatus}
              />
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#edd6bb]/20 shrink-0">
                <div>
                  <h3 className="text-sm font-extrabold">
                    {activeTab === "response" ? "Response Schema Fields (Target AI Output)" : "Request Schema Fields (Input API Payload)"}
                  </h3>
                  <p className="text-[11px] opacity-75">
                    {activeTab === "response"
                      ? "Define structured output fields, nested objects, item arrays, and drag-and-drop hierarchy."
                      : "Define input fields sent by client applications (e.g. image, prompt, metadata)."}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleAddField}
                    title="Add a new root-level property to the schema"
                    className="px-3 py-1.5 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 text-xs font-extrabold shadow-md shadow-[#e1b329]/20 flex items-center gap-1.5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Property</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpandedPanel(expandedPanel === "editor" ? null : "editor")}
                    title={expandedPanel === "editor" ? "Restore split screen view" : "Maximize editor panel to full screen vertical overlay"}
                    className="p-2 rounded-xl glass-panel text-[#8a715e] dark:text-[#edd6bb] hover:bg-[#e1b329]/20 border border-[#edd6bb]/25 transition-all"
                  >
                    {expandedPanel === "editor" ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Scrollable Container for Field Cards */}
              <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-1 space-y-3">
                {currentFieldList.length > 0 ? (
                  <FieldListRenderer
                    fields={currentFieldList}
                    allRootFields={currentFieldList}
                    onChange={(updated) => setCurrentFieldList(updated)}
                    onDelete={(id) => handleDeleteField(id)}
                    selectedFieldId={selectedFieldId}
                    onSelectFieldId={setSelectedFieldId}
                  />
                ) : (
                  <div className="text-center py-12 opacity-60 text-xs italic">
                    No properties added yet. Click &quot;Add Property&quot; to define fields.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Real-Time JSON Schema Preview */}
        <div
          className={`overflow-hidden flex flex-col transition-all ${
            expandedPanel === "preview"
              ? "fixed inset-3 sm:inset-5 z-[999] bg-[#fdfaf5] dark:bg-[#120e0b] h-[calc(100vh-2.5rem)] w-[calc(100vw-2.5rem)] rounded-2xl border border-[#e1b329]/50 shadow-2xl p-1"
              : expandedPanel === "editor"
              ? "hidden"
              : "h-full"
          }`}
        >
          <SchemaPreview
            fields={currentFieldList}
            activeTabName={activeTab}
            selectedFieldId={selectedFieldId}
            onSelectFieldId={setSelectedFieldId}
            isExpanded={expandedPanel === "preview"}
            onToggleExpand={() => setExpandedPanel(expandedPanel === "preview" ? null : "preview")}
          />
        </div>
      </div>
    </div>
  );
}


