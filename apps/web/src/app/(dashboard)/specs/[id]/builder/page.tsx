"use client";

import { useState, useEffect, Suspense, useRef } from "react";
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
  CheckCircle2,
  AlertCircle,
  Trash2,
  AlertTriangle,
  FlaskConical,
  MessageSquarePlus,
  Download,
  Upload,
  Cpu,
  FileJson,
  Copy,
  Check,
  X,
  Server,
  Workflow,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { SchemaField } from "@/components/schema-builder/types";
import { FieldListRenderer } from "@/components/schema-builder/field-list-renderer";
import { SchemaPreview } from "@/components/schema-builder/schema-preview";
import { ExecutionSettings } from "@/components/schema-builder/execution-settings";
import { ToolCallingSettings } from "@/components/schema-builder/tool-calling-settings";
import { buildJsonSchema, jsonSchemaToSchemaFields } from "@/components/schema-builder/schema-helpers";
import {
  updateCallSpec,
  createCallSpec,
  deleteCallSpec,
  fetchCallSpecById,
  exportCallSpecJson,
  importCallSpecJson,
} from "@/lib/api-client";
import { getActiveUserId } from "@/lib/api/core";
import { useAuth } from "@/context/auth-context";
import { useProject } from "@/context/project-context";
import { ToolCallingConfig } from "@/lib/types";


function VisualSchemaBuilderContent({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { activeProject } = useProject();

  const [activeTab, setActiveTab] = useState<"response" | "tools" | "request" | "settings">("response");
  const [specName, setSpecName] = useState("");
  const [specSlug, setSpecSlug] = useState(params.id || "");
  const [selectedModel, setSelectedModel] = useState("gemini-3.6-flash");
  const [extractionPrompt, setExtractionPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [additionalPrompt, setAdditionalPrompt] = useState("");
  const [allowAdditionalPrompt, setAllowAdditionalPrompt] = useState(true);
  const [useExternalApiKey, setUseExternalApiKey] = useState(true);
  const [toolsConfig, setToolsConfig] = useState<ToolCallingConfig>({
    enabled: true,
    toolChoice: "auto",
    tools: [],
  });

  const [requestFields, setRequestFields] = useState<SchemaField[]>([]);
  const [responseFields, setResponseFields] = useState<SchemaField[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Export, Import & MCP Modal States
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  const [showMcpModal, setShowMcpModal] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle Export JSON
  const handleExportJson = async () => {
    try {
      if (params.id !== "new") {
        const specJson = await exportCallSpecJson(params.id);
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(specJson, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `${specSlug || "callcraft"}-spec.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      } else {
        const localExport = {
          version: "1.0",
          name: specName || "New Custom Spec",
          slug: specSlug || "my-custom-spec",
          description: "New CallCraft Spec Draft",
          requestSchema: buildJsonSchema(requestFields),
          responseSchema: buildJsonSchema(responseFields),
          prompts: {
            positivePrompt: extractionPrompt,
            negativePrompt: negativePrompt,
            additionalPrompt: additionalPrompt,
          },
          toolsConfig: toolsConfig,
          config: {
            allowAdditionalPrompt,
            useExternalApiKey,
            externalModelName: selectedModel,
          },
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(localExport, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `${specSlug || "draft"}-spec.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      }
    } catch (err: any) {
      console.error("Export JSON error:", err);
      alert(err.message || "Gagal meng-export JSON");
    }
  };

  // Handle Import JSON File Select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        setImportJsonText(text);
        setImportError(null);
      } catch (err: any) {
        setImportError("Gagal membaca file JSON");
      }
    };
    reader.readAsText(file);
  };

  // Handle Import Confirm
  const handleImportConfirm = async () => {
    if (!importJsonText.trim()) {
      setImportError("Isi JSON atau upload file JSON terlebih dahulu");
      return;
    }
    let parsed: any = null;
    try {
      parsed = JSON.parse(importJsonText);
    } catch (err: any) {
      setImportError("Format JSON tidak valid: " + err.message);
      return;
    }

    setIsImporting(true);
    setImportError(null);
    try {
      const res = await importCallSpecJson(params.id, parsed);
      const updatedSpec = res.spec;
      if (updatedSpec) {
        if (updatedSpec.name) setSpecName(updatedSpec.name);
        if (updatedSpec.slug) setSpecSlug(updatedSpec.slug);
        if (updatedSpec.positivePrompt !== undefined || updatedSpec.extractionPrompt !== undefined) {
          setExtractionPrompt(updatedSpec.positivePrompt || updatedSpec.extractionPrompt || "");
        }
        if (updatedSpec.negativePrompt !== undefined) setNegativePrompt(updatedSpec.negativePrompt || "");
        if (updatedSpec.additionalPrompt !== undefined) setAdditionalPrompt(updatedSpec.additionalPrompt || "");
        if (updatedSpec.allowAdditionalPrompt !== undefined) setAllowAdditionalPrompt(updatedSpec.allowAdditionalPrompt);
        if (updatedSpec.useExternalApiKey !== undefined) setUseExternalApiKey(updatedSpec.useExternalApiKey);
        if (updatedSpec.externalModelName) setSelectedModel(updatedSpec.externalModelName);
        if (updatedSpec.toolsConfig) setToolsConfig(updatedSpec.toolsConfig);
        if (updatedSpec.responseSchema) setResponseFields(jsonSchemaToSchemaFields(updatedSpec.responseSchema));
        if (updatedSpec.requestSchema) setRequestFields(jsonSchemaToSchemaFields(updatedSpec.requestSchema));
      }

      setImportSuccessMsg("Spec JSON berhasil di-import!");
      setTimeout(() => {
        setShowImportModal(false);
        setImportSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setImportError(err.message || "Gagal meng-import JSON");
    } finally {
      setIsImporting(false);
    }
  };

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(key);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };


  // Read active tab from URL query parameter on mount/refresh
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "tools" || tabParam === "request" || tabParam === "settings" || tabParam === "response") {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Tab change handler that updates URL query param seamlessly
  const handleTabChange = (newTab: "response" | "tools" | "request" | "settings") => {
    setActiveTab(newTab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", newTab);
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  };

  // Load existing spec details & schemas dynamically from backend database on load
  useEffect(() => {
    let isMounted = true;
    if (params.id === "new") {
      setSpecName("New Custom Spec");
      setSpecSlug("my-custom-spec");
      setRequestFields([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetchCallSpecById(params.id)
      .then((specObj) => {
        if (!isMounted || !specObj) return;
        if (specObj.name) setSpecName(specObj.name);
        if (specObj.slug) setSpecSlug(specObj.slug);
        if (specObj.positivePrompt !== undefined || specObj.extractionPrompt !== undefined) {
          setExtractionPrompt(specObj.positivePrompt || specObj.extractionPrompt || "");
        }
        if (specObj.negativePrompt !== undefined) {
          setNegativePrompt(specObj.negativePrompt || "");
        }
        if (specObj.additionalPrompt !== undefined) {
          setAdditionalPrompt(specObj.additionalPrompt || "");
        }
        if (specObj.allowAdditionalPrompt !== undefined) {
          setAllowAdditionalPrompt(specObj.allowAdditionalPrompt);
        }
        if (specObj.useExternalApiKey !== undefined) {
          setUseExternalApiKey(specObj.useExternalApiKey);
        }
        if (specObj.externalModelName) {
          setSelectedModel(specObj.externalModelName);
        }
        if (specObj.toolsConfig && typeof specObj.toolsConfig === "object") {
          setToolsConfig(specObj.toolsConfig);
        }

        const resSchema = specObj.responseSchema;
        if (resSchema && typeof resSchema === "object") {
          const parsedResponseFields = jsonSchemaToSchemaFields(resSchema);
          setResponseFields(parsedResponseFields);
        }

        console.log("[Callcraft Builder] Loaded Spec Object:", specObj);
        console.log("[Callcraft Builder] specObj.requestSchema:", specObj?.requestSchema);

        const reqSchema = specObj?.requestSchema;
        if (reqSchema && typeof reqSchema === "object") {
          const parsedRequestFields = jsonSchemaToSchemaFields(reqSchema);
          console.log("[Callcraft Builder] Parsed requestFields for Visual Tree:", parsedRequestFields);
          setRequestFields(parsedRequestFields);
        }
      })
      .catch((err) => {
        console.warn("[Callcraft Builder] Spec load notice:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [params.id]);

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

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const responseSchemaObj = buildJsonSchema(responseFields);
      const requestSchemaObj = buildJsonSchema(requestFields);

      if (params.id === "new") {
        const newSpec = await createCallSpec({
          name: specName || "New Custom Spec",
          slug: specSlug || "my-custom-spec",
          projectId: activeProject?.id,
          requestSchema: requestSchemaObj,
          responseSchema: responseSchemaObj,
          toolsConfig: toolsConfig,
          positivePrompt: extractionPrompt,
          extractionPrompt: extractionPrompt,
          negativePrompt: negativePrompt,
          additionalPrompt: additionalPrompt,
          allowAdditionalPrompt: allowAdditionalPrompt,
          useExternalApiKey: useExternalApiKey,
          externalModelName: selectedModel,
        });

        setSaveSuccess(true);
        setTimeout(() => {
          router.push(`/specs/${newSpec.id}/builder`);
        }, 1000);
      } else {
        const updatedSpec = await updateCallSpec(params.id, {
          name: specName || "Untitled Spec",
          slug: specSlug || params.id,
          requestSchema: requestSchemaObj,
          responseSchema: responseSchemaObj,
          toolsConfig: toolsConfig,
          positivePrompt: extractionPrompt,
          extractionPrompt: extractionPrompt,
          negativePrompt: negativePrompt,
          additionalPrompt: additionalPrompt,
          allowAdditionalPrompt: allowAdditionalPrompt,
          useExternalApiKey: useExternalApiKey,
          externalModelName: selectedModel,
        });

        if (updatedSpec) {
          const specObj = updatedSpec as any;
          if (specObj.name) setSpecName(specObj.name);
          if (specObj.slug) setSpecSlug(specObj.slug);
          if (specObj.positivePrompt !== undefined || specObj.extractionPrompt !== undefined) setExtractionPrompt(specObj.positivePrompt || specObj.extractionPrompt || "");
          if (specObj.negativePrompt !== undefined) setNegativePrompt(specObj.negativePrompt || "");
          if (specObj.additionalPrompt !== undefined) setAdditionalPrompt(specObj.additionalPrompt || "");
          if (specObj.allowAdditionalPrompt !== undefined) setAllowAdditionalPrompt(specObj.allowAdditionalPrompt);
          if (specObj.useExternalApiKey !== undefined) setUseExternalApiKey(specObj.useExternalApiKey);
          if (specObj.externalModelName) setSelectedModel(specObj.externalModelName);

          const resSchema = specObj.responseSchema;
          const reqSchema = specObj.requestSchema;
          if (resSchema && typeof resSchema === "object") {
            setResponseFields(jsonSchemaToSchemaFields(resSchema));
          }
          if (reqSchema && typeof reqSchema === "object") {
            setRequestFields(jsonSchemaToSchemaFields(reqSchema));
          }
        }

        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      }
    } catch (err: any) {
      setSaveError(err.message || "Failed to save Call Spec");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (params.id === "new") return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteCallSpec(params.id);
      setShowDeleteModal(false);
      router.push("/specs");
    } catch (err: any) {
      console.error("[Callcraft Builder] Delete error:", err);
      setDeleteError(err.message || "Gagal menghapus Call Spec");
    } finally {
      setIsDeleting(false);
    }
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
          {saveSuccess && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
              <CheckCircle2 className="w-4 h-4" />
              <span>Saved & Published</span>
            </span>
          )}
          {saveError && (
            <span className="text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              <span>{saveError}</span>
            </span>
          )}
          {params.id !== "new" && (
            <Link
              href={`/playground?specId=${params.id}`}
              className="px-3.5 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm"
              title="Coba spec ini di Interactive API Playground"
            >
              <FlaskConical className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Playground</span>
            </Link>
          )}

          {/* MCP Server Integration Button */}
          <button
            type="button"
            onClick={() => setShowMcpModal(true)}
            className="px-3 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-600 dark:text-purple-300 border border-purple-500/30 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm"
            title="Koneksikan ke IDE / Cursor / Claude / Langflow / n8n via MCP Server"
          >
            <Cpu className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">MCP Server</span>
          </button>

          {/* Export Spec JSON Button */}
          <button
            type="button"
            onClick={handleExportJson}
            disabled={isLoading}
            className="px-3 py-2 rounded-xl glass-panel hover:bg-[#e1b329]/15 text-[#8a715e] dark:text-[#edd6bb] border border-[#edd6bb]/30 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
            title="Download spesifikasi lengkap dalam format JSON"
          >
            <Download className="w-4 h-4 text-[#e1b329]" />
            <span className="hidden sm:inline">Export JSON</span>
          </button>

          {/* Import Spec JSON Button */}
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            disabled={isLoading}
            className="px-3 py-2 rounded-xl glass-panel hover:bg-[#e1b329]/15 text-[#8a715e] dark:text-[#edd6bb] border border-[#edd6bb]/30 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
            title="Import file JSON untuk mengganti atau memperbarui spesifikasi"
          >
            <Upload className="w-4 h-4 text-[#e1b329]" />
            <span className="hidden sm:inline">Import JSON</span>
          </button>


          {params.id !== "new" && (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              disabled={isDeleting || isSaving || isLoading}
              title="Hapus Call Spec ini secara permanen"
              className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span className="hidden sm:inline">Hapus Spec</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading || isDeleting}
            title="Save changes and publish schema version to API backend"
            className={`px-4 py-2 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 text-xs font-extrabold shadow-lg shadow-[#e1b329]/20 flex items-center gap-2 transition-all ${
              isSaving || isLoading ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSaving ? "Saving..." : "Save & Publish Version"}</span>
          </button>
        </div>
      </div>

      {/* Redesigned Navigation Tabs: High-Contrast Light Mode Styling & Hidden Horizontal Scrollbar Track */}
      <div className="shrink-0 overflow-x-auto max-w-full pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="inline-flex items-center whitespace-nowrap rounded-2xl bg-[#f5ebe0] dark:bg-black/60 p-1.5 border border-[#d8be9f] dark:border-[#edd6bb]/20 shadow-md">
          <button
            type="button"
            onClick={() => handleTabChange("response")}
            title="Define target structured output fields for AI responses"
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border-r border-[#d8be9f] dark:border-[#edd6bb]/20 last:border-r-0 ${
              activeTab === "response"
                ? "bg-[#e1b329] text-slate-950 shadow-md shadow-[#e1b329]/20 font-extrabold ring-1 ring-[#e1b329]"
                : "text-[#5c4b3c] hover:text-[#2c1d11] dark:text-[#edd6bb]/80 dark:hover:text-[#edd6bb] hover:bg-[#edd6bb]/20 dark:hover:bg-[#edd6bb]/10"
            }`}
          >
            <Sparkles className="w-4 h-4 text-inherit" />
            <span>Response Schema (AI Output)</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("tools")}
            title="Configure Tool Calling, Agent Roles, and Text/Image Context"
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border-r border-[#d8be9f] dark:border-[#edd6bb]/20 last:border-r-0 ${
              activeTab === "tools"
                ? "bg-[#e1b329] text-slate-950 shadow-md shadow-[#e1b329]/20 font-extrabold ring-1 ring-[#e1b329]"
                : "text-[#5c4b3c] hover:text-[#2c1d11] dark:text-[#edd6bb]/80 dark:hover:text-[#edd6bb] hover:bg-[#edd6bb]/20 dark:hover:bg-[#edd6bb]/10"
            }`}
          >
            <Sparkles className="w-4 h-4 text-inherit" />
            <span>Tool Calling & Actions</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("request")}
            title="Define input payload parameters sent by client applications"
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border-r border-[#d8be9f] dark:border-[#edd6bb]/20 last:border-r-0 ${
              activeTab === "request"
                ? "bg-[#e1b329] text-slate-950 shadow-md shadow-[#e1b329]/20 font-extrabold ring-1 ring-[#e1b329]"
                : "text-[#5c4b3c] hover:text-[#2c1d11] dark:text-[#edd6bb]/80 dark:hover:text-[#edd6bb] hover:bg-[#edd6bb]/20 dark:hover:bg-[#edd6bb]/10"
            }`}
          >
            <FileCode2 className="w-4 h-4 text-inherit" />
            <span>Request Schema (Input Payload)</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("settings")}
            title="Configure system prompt, instructions, and target AI models"
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === "settings"
                ? "bg-[#e1b329] text-slate-950 shadow-md shadow-[#e1b329]/20 font-extrabold ring-1 ring-[#e1b329]"
                : "text-[#5c4b3c] hover:text-[#2c1d11] dark:text-[#edd6bb]/80 dark:hover:text-[#edd6bb] hover:bg-[#edd6bb]/20 dark:hover:bg-[#edd6bb]/10"
            }`}
          >
            <Sliders className="w-4 h-4 text-inherit" />
            <span>Prompt & Execution Settings</span>
          </button>
        </div>
      </div>

      {/* Main Split Screen with Independent Expandable Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1 min-h-[480px] h-[520px] lg:h-full overflow-hidden relative">
        {/* Left Column: Visual Schema Editor Panel */}
        <div
          className={`glass-panel p-4 sm:p-5 rounded-2xl border border-[#edd6bb]/25 dark:border-[#edd6bb]/20 flex flex-col h-full overflow-hidden transition-all duration-300 ${
            expandedPanel === "editor"
              ? "fixed inset-2 sm:inset-4 z-[999] bg-[#fdfaf5] dark:bg-[#120e0b] shadow-2xl rounded-3xl"
              : expandedPanel === "preview"
              ? "hidden lg:flex opacity-30 pointer-events-none"
              : ""
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#edd6bb]/25 mb-3 shrink-0">
            <div>
              <h2 className="text-base font-extrabold flex items-center gap-2 text-[#2c1d11] dark:text-[#edd6bb]">
                {activeTab === "settings" ? (
                  <>
                    <Sliders className="w-4 h-4 text-[#e1b329]" />
                    <span>Execution Configuration</span>
                  </>
                ) : (
                  <>
                    <Code className="w-4 h-4 text-[#e1b329]" />
                    <span>Visual {activeTab === "request" ? "Request" : "Response"} Field Tree</span>
                  </>
                )}
              </h2>
              <p className="text-[11px] opacity-75">
                {activeTab === "settings"
                  ? "Configure model selection and extraction instructions"
                  : "Add, edit, reorder, or nest fields via drag and drop"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {activeTab !== "settings" && (
                <button
                  type="button"
                  onClick={handleAddField}
                  className="px-3 py-1.5 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 text-xs font-extrabold shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Property</span>
                </button>
              )}

              {/* Panel Expand / Collapse Button */}
              <button
                type="button"
                onClick={() => setExpandedPanel(expandedPanel === "editor" ? null : "editor")}
                className="p-1.5 rounded-xl bg-[#edd6bb]/30 dark:bg-[#edd6bb]/15 hover:bg-[#e1b329]/25 text-[#5c4b3c] dark:text-[#ffb443] transition-all border border-[#d8be9f] dark:border-[#edd6bb]/20"
                title={expandedPanel === "editor" ? "Exit Fullscreen Editor" : "Fullscreen Editor"}
              >
                {expandedPanel === "editor" ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Scrollable Container for Field Cards, Tools, or Settings */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-1 space-y-3">
            {isLoading ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-6 h-6 border-2 border-[#e1b329] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-[#8a715e] dark:text-[#edd6bb]/70 font-semibold">Loading schema specification...</p>
              </div>
            ) : activeTab === "tools" ? (
              <ToolCallingSettings toolsConfig={toolsConfig} setToolsConfig={setToolsConfig} />
            ) : activeTab === "settings" ? (
              <ExecutionSettings
                specName={specName}
                setSpecName={setSpecName}
                specSlug={specSlug}
                setSpecSlug={setSpecSlug}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                positivePrompt={extractionPrompt}
                extractionPrompt={extractionPrompt}
                setExtractionPrompt={setExtractionPrompt}
                negativePrompt={negativePrompt}
                setNegativePrompt={setNegativePrompt}
                useExternalApiKey={useExternalApiKey}
                setUseExternalApiKey={setUseExternalApiKey}
                currentProviderStatus={providerKeyStatus[getProviderFromModel(selectedModel)] || { active: true, label: "Provider Active" }}
              />
            ) : (
              <div className="space-y-3">
                {activeTab === "request" && (
                  <div className="p-3.5 rounded-2xl bg-[#edd6bb]/25 dark:bg-slate-900/60 border border-[#edd6bb]/40 dark:border-slate-800 flex items-center justify-between shadow-sm">
                    <div>
                      <div className="text-xs font-extrabold text-[#2c1d11] dark:text-[#edd6bb] flex items-center gap-1.5">
                        <MessageSquarePlus className="w-4 h-4 text-[#e1b329]" />
                        <span>Request Additional Prompt (User Instruction)</span>
                      </div>
                      <p className="text-[11px] text-[#8a715e] dark:text-slate-400 mt-0.5">
                        Izinkan pemanggil API / Playground menyertakan instruksi tambahan kustom (<code className="font-mono text-[10px]">prompt</code>). Default: <strong className="text-emerald-600 dark:text-emerald-400">True</strong>
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                      <input
                        type="checkbox"
                        checked={allowAdditionalPrompt}
                        onChange={(e) => setAllowAdditionalPrompt(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#e1b329]"></div>
                    </label>
                  </div>
                )}
                {currentFieldList.length > 0 ? (
                  <FieldListRenderer
                    fields={currentFieldList}
                    allRootFields={currentFieldList}
                    onChange={setCurrentFieldList}
                    onDelete={handleDeleteField}
                    selectedFieldId={selectedFieldId}
                    onSelectFieldId={setSelectedFieldId}
                    isRequestSchema={activeTab === "request"}
                  />
                ) : (
                  <div className="text-center py-12 space-y-3">
                    <div className="p-3 rounded-2xl bg-[#e1b329]/15 inline-block text-[#e1b329]">
                      <Code className="w-8 h-8" />
                    </div>
                    <h3 className="text-sm font-bold">No fields defined yet</h3>
                    <p className="text-xs opacity-75 max-w-xs mx-auto">
                      Click &quot;Add Property&quot; to define fields for your schema.
                    </p>
                    <button
                      type="button"
                      onClick={handleAddField}
                      className="px-4 py-2 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 text-xs font-extrabold shadow-md inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add First Field</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Code & JSON Schema Live Preview Panel */}
        <div
          className={`glass-panel p-4 sm:p-5 rounded-2xl border border-[#edd6bb]/25 dark:border-[#edd6bb]/20 flex flex-col h-full overflow-hidden transition-all duration-300 ${
            expandedPanel === "preview"
              ? "fixed inset-2 sm:inset-4 z-[999] bg-[#fdfaf5] dark:bg-[#120e0b] shadow-2xl rounded-3xl"
              : expandedPanel === "editor"
              ? "hidden lg:flex opacity-30 pointer-events-none"
              : ""
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#edd6bb]/25 mb-3 shrink-0">
            <div>
              <h2 className="text-base font-extrabold flex items-center gap-2 text-[#2c1d11] dark:text-[#edd6bb]">
                <FileCode2 className="w-4 h-4 text-[#e1b329]" />
                <span>Monaco Code & JSON Schema Preview</span>
              </h2>
              <p className="text-[11px] opacity-75">
                Real-time generated JSON Schema & OpenAPI 3.0 specs with syntax highlighting
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExpandedPanel(expandedPanel === "preview" ? null : "preview")}
                className="p-1.5 rounded-xl bg-[#edd6bb]/30 dark:bg-[#edd6bb]/15 hover:bg-[#e1b329]/25 text-[#5c4b3c] dark:text-[#ffb443] transition-all border border-[#d8be9f] dark:border-[#edd6bb]/20"
                title={expandedPanel === "preview" ? "Exit Fullscreen Preview" : "Fullscreen Preview"}
              >
                {expandedPanel === "preview" ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <SchemaPreview
              fields={currentFieldList}
              activeTabName={activeTab === "request" ? "Request Payload Schema" : "Response Schema (AI Output)"}
              selectedFieldId={selectedFieldId}
              onSelectFieldId={setSelectedFieldId}
            />
          </div>
        </div>
      </div>

      {/* Global Confirmation Modal for Call Spec Deletion */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass-panel max-w-md w-full p-6 rounded-3xl border border-rose-500/30 shadow-2xl space-y-5 bg-[#fdfaf5] dark:bg-[#1c1713] text-[#5c4b3c] dark:text-[#edd6bb]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                  Hapus Call Spec Ini?
                </h3>
                <p className="text-xs text-[#8a715e] dark:text-[#8b7e6d]">
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 font-medium">
              Apakah Anda yakin ingin menghapus Call Spec <strong className="font-bold">{specName || specSlug || params.id}</strong>? Seluruh skema payload, versi, dan konfigurasi terkait akan dihapus secara permanen dari database.
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 border border-rose-500/30">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl glass-panel text-xs font-bold border border-[#8a715e]/25 hover:bg-[#8a715e]/15 text-[#5c4b3c] dark:text-[#edd6bb] transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-extrabold shadow-lg shadow-rose-600/30 flex items-center gap-1.5 transition-all"
              >
                {isDeleting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{isDeleting ? "Menghapus..." : "Ya, Hapus Spec"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Spec JSON Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl p-6 rounded-3xl glass-card border border-[#edd6bb]/30 bg-[#fdfbf7] dark:bg-[#1a1612] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#edd6bb]/20">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#e1b329]/15 text-[#e1b329]">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                    Import Spec JSON
                  </h3>
                  <p className="text-xs text-[#8a715e] dark:text-[#8b7e6d]">
                    Upload file .json atau tempel kode JSON spesifikasi CallCraft.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-500/10 text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-[#5c4b3c] dark:text-[#edd6bb]/90">
                  Upload File JSON:
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-[#e1b329]/15 hover:bg-[#e1b329]/25 text-[#e1b329] text-xs font-bold flex items-center gap-1.5 transition-all border border-[#e1b329]/30"
                >
                  <FileJson className="w-4 h-4" />
                  <span>Pilih File JSON</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#5c4b3c] dark:text-[#edd6bb]/90 block mb-1">
                  Konten JSON Spesifikasi:
                </label>
                <textarea
                  rows={10}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder={`{\n  "name": "Custom Spec",\n  "responseSchema": { ... },\n  "prompts": { "positivePrompt": "..." }\n}`}
                  className="w-full p-3 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs border border-slate-700 focus:outline-none focus:border-[#e1b329] focus:ring-1 focus:ring-[#e1b329]"
                />
              </div>

              {importError && (
                <div className="p-3 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 border border-rose-500/30">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 border border-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{importSuccessMsg}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isImporting}
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-xl glass-panel text-xs font-bold border border-[#8a715e]/25 hover:bg-[#8a715e]/15 text-[#5c4b3c] dark:text-[#edd6bb] transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isImporting}
                onClick={handleImportConfirm}
                className="px-4 py-2 rounded-xl bg-[#e1b329] hover:bg-[#d0a21f] disabled:opacity-50 text-slate-950 text-xs font-extrabold shadow-lg shadow-[#e1b329]/30 flex items-center gap-1.5 transition-all"
              >
                {isImporting ? (
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>{isImporting ? "Importing..." : "Replace & Import JSON"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MCP Server Info & Configuration Modal */}
      {showMcpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-3xl p-6 rounded-3xl glass-card border border-purple-500/30 bg-[#fdfbf7] dark:bg-[#181424] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-purple-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-500/15 text-purple-400">
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>CallCraft Model Context Protocol (MCP) Server</span>
                  </h3>
                  <p className="text-xs text-purple-400 font-medium">
                    Manipulasi spesifikasi CallCraft langsung dari Cursor, Antigravity, Claude, Langflow, atau n8n
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMcpModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-500/10 text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Endpoint URLs */}
              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                <h4 className="font-extrabold text-purple-300 flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  <span>Koneksi MCP Server Transport</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">SSE Endpoint (Cursor/Claude)</span>
                    <div className="flex items-center justify-between text-purple-300 font-mono text-[11px]">
                      <span className="truncate">http://localhost:8081/mcp/v1/sse</span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(`http://localhost:8081/mcp/v1/sse?user_id=${user?.id || getActiveUserId() || "<YOUR_USER_ID>"}`, "sse")}
                        className="p-1 hover:text-white transition-all shrink-0"
                      >
                        {copiedSnippet === "sse" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">HTTP RPC Endpoint (Langflow/n8n)</span>
                    <div className="flex items-center justify-between text-purple-300 font-mono text-[11px]">
                      <span className="truncate">http://localhost:8081/mcp/v1/rpc</span>
                      <button
                        type="button"
                        onClick={() => handleCopyText("http://localhost:8081/mcp/v1/rpc", "rpc")}
                        className="p-1 hover:text-white transition-all shrink-0"
                      >
                        {copiedSnippet === "rpc" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* IDE Stdio Config */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-200 flex items-center gap-2">
                    <Code className="w-4 h-4 text-amber-400" />
                    <span>Konfigurasi Cursor / Claude Desktop / Antigravity (Stdio Mode)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(
                        JSON.stringify(
                          {
                            mcpServers: {
                              callcraft: {
                                command: "python",
                                args: [
                                  "-m",
                                  "callcraft_api.mcp_stdio",
                                  "--user-id",
                                  user?.id || getActiveUserId() || "<YOUR_USER_ID>",
                                ],
                              },
                            },
                          },
                          null,
                          2
                        ),
                        "stdio_json"
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold flex items-center gap-1 text-[11px] transition-all"
                  >
                    {copiedSnippet === "stdio_json" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSnippet === "stdio_json" ? "Copied!" : "Copy Config JSON"}</span>
                  </button>
                </div>

                <pre className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] overflow-x-auto">
{`{
  "mcpServers": {
    "callcraft": {
      "command": "python",
      "args": [
        "-m", "callcraft_api.mcp_stdio",
        "--user-id", "${user?.id || getActiveUserId() || "<YOUR_USER_ID>"}"
      ]
    }
  }
}`}
                </pre>
              </div>

              {/* Langflow & n8n workflow guide */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-200 flex items-center gap-2">
                  <Workflow className="w-4 h-4 text-emerald-400" />
                  <span>Integrasi Workflow Langflow & n8n</span>
                </h4>
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 text-[11px] leading-relaxed space-y-1.5">
                  <p>
                    Gunakan <strong>HTTP Request Node</strong> di n8n atau Langflow dengan method <code>POST</code> ke <code>http://localhost:8081/mcp/v1/rpc</code>.
                  </p>
                  <p>
                    Sertakan Header: <code>X-USER-ID: {user?.id || getActiveUserId() || "<YOUR_USER_ID>"}</code>
                  </p>
                  <p className="font-mono text-purple-300 text-[10px] pt-1">
                    Body: {"{"} "jsonrpc": "2.0", "id": "1", "method": "tools/call", "params": {"{"} "name": "callcraft_get_spec_section", "arguments": {"{"} "spec_id": "{params.id}", "section": "prompts" {"}"} {"}"} {"}"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowMcpModal(false)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold shadow-lg shadow-purple-600/30 transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function VisualSchemaBuilderPage({ params }: { params: { id: string } }) {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center space-y-3">
          <div className="w-6 h-6 border-2 border-[#e1b329] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#8a715e] dark:text-[#edd6bb]/70 font-semibold">
            Loading Schema Builder...
          </p>
        </div>
      }
    >
      <VisualSchemaBuilderContent params={params} />
    </Suspense>
  );
}
