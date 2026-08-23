"use client";

import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import {
  FileText,
  Key,
  Play,
  Sparkles,
  Upload,
  Copy,
  Check,
  Globe,
  Sliders,
  Code,
  Layers,
  ShieldCheck,
  Info,
  Save,
  AlertTriangle,
  Terminal,
} from "lucide-react";
import { SchemaField } from "@/components/schema-builder/types";
import { jsonSchemaToSchemaFields } from "@/components/schema-builder/schema-helpers";
import {
  PYTHON_API_URL,
  getActiveUserId,
  fetchApiKeys,
  fetchUserAiProviders,
  fetchPlaygroundState,
  savePlaygroundState,
} from "@/lib/api-client";
import { ApiCredential } from "@/lib/types";

interface DynamicSpecFormProps {
  specName: string;
  specSlug: string;
  specId: string;
  userId?: string;
  useExternalApiKey?: boolean;
  requestSchema?: any;
  responseSchema?: any;
  systemPrompt?: string;
  extractionPrompt?: string;
  provider: string;
  setProvider: (p: string) => void;
  aiModelName: string;
  setAiModelName: (m: string) => void;
  apiKey: string;
  setApiKey: (k: string) => void;
  aiApiKey: string;
  setAiApiKey: (k: string) => void;
  imageUrl: string;
  setImageUrl: (url: string) => void;
  prompt: string;
  setPrompt: (p: string) => void;
  extraInputs: Record<string, any>;
  setExtraInputs: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  onRunTest: () => void;
  loading: boolean;
  /** Called whenever the internal checkbox state changes, so the parent can
   *  know whether optional headers like X-AI-MODEL-NAME / X-AI-API-KEY
   *  should be included in the actual API request. */
  onCheckedStateChange?: (state: Record<string, boolean>) => void;
}

export function DynamicSpecForm({
  specName,
  specSlug,
  specId,
  userId,
  useExternalApiKey = true,
  requestSchema,
  responseSchema,
  systemPrompt,
  extractionPrompt,
  provider,
  setProvider,
  aiModelName,
  setAiModelName,
  apiKey,
  setApiKey,
  aiApiKey,
  setAiApiKey,
  imageUrl,
  setImageUrl,
  prompt,
  setPrompt,
  extraInputs,
  setExtraInputs,
  onRunTest,
  loading,
  onCheckedStateChange,
}: DynamicSpecFormProps) {
  // Postman Request Tabs: "body" | "headers" | "auth"
  const [activeRequestTab, setActiveRequestTab] = useState<"body" | "headers" | "auth">("body");
  
  // Body Sub-tab: "form" (Key-Value) vs "json" (Raw JSON Payload preview)
  const [bodyMode, setBodyMode] = useState<"form" | "json">("form");

  // Available Credentials State for Public Key Select Dropdown
  const [availableKeys, setAvailableKeys] = useState<ApiCredential[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string>("");
  const [publicKey, setPublicKey] = useState<string>("");
  const [keysError, setKeysError] = useState<string | null>(null);

  // Fetch Live Credentials from Backend API on mount
  useEffect(() => {
    fetchApiKeys()
      .then((keys) => {
        if (keys && keys.length > 0) {
          setAvailableKeys(keys);
          setSelectedKeyId(keys[0].id);
          setPublicKey(keys[0].publicKey);
          if ((keys[0] as any).secret_key) {
            setApiKey((keys[0] as any).secret_key);
          } else {
            setApiKey(`call_sk_live_${keys[0].publicKey.replace("pk_live_", "")}`);
          }
        } else {
          setAvailableKeys([]);
          setKeysError("Belum ada API Key yang dibuat di akun Anda.");
        }
      })
      .catch((err) => {
        console.warn("[Playground] Keys load error", err);
        setKeysError("Gagal memuat API Key dari server.");
      });
  }, []);

  // Save State UI Feedback
  const [savingState, setSavingState] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [credentialDeletedWarning, setCredentialDeletedWarning] = useState<boolean>(false);

  // Load saved playground state for this specId from DB on mount / spec change
  useEffect(() => {
    if (!specId) return;
    setCredentialDeletedWarning(false);

    fetchPlaygroundState(specId).then((state) => {
      if (state) {
        if (state.checkedStates) {
          setCheckedState(state.checkedStates);
          // onCheckedStateChange will be called automatically via the useEffect above
        }
        if (state.prompt !== undefined && state.prompt !== null) {
          setPrompt(state.prompt);
        }
        if (state.imageUrl !== undefined && state.imageUrl !== null) {
          setImageUrl(state.imageUrl);
        }
        if (state.extraInputs) {
          setExtraInputs(state.extraInputs);
        }
        if (state.aiModelName !== undefined && state.aiModelName !== null) {
          setAiModelName(state.aiModelName);
        }
        if (state.aiApiKey !== undefined && state.aiApiKey !== null) {
          setAiApiKey(state.aiApiKey);
        }
        if (state.selectedCredentialId) {
          setSelectedKeyId(state.selectedCredentialId);
          if (state.publicKey) {
            setPublicKey(state.publicKey);
          }
        }
        if (state.credentialDeleted) {
          setCredentialDeletedWarning(true);
        }
      }
    });
  }, [specId]);

  const handleSavePlaygroundState = async () => {
    if (!specId) return;
    setSavingState(true);
    setSaveSuccessMsg(null);
    try {
      await savePlaygroundState(specId, {
        selectedCredentialId: selectedKeyId || null,
        checkedStates: checkedState,
        extraInputs: extraInputs,
        prompt: prompt,
        imageUrl: imageUrl,
        aiModelName: aiModelName,
        aiApiKey: aiApiKey,
      });
      setSaveSuccessMsg("Playground state berhasil disimpan di Database!");
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("[Playground] Save state error", err);
      alert(`Gagal menyimpan state: ${err.message || "Unknown error"}`);
    } finally {
      setSavingState(false);
    }
  };

  const handleSelectCredential = (keyId: string) => {
    setSelectedKeyId(keyId);
    const found = availableKeys.find((k) => k.id === keyId);
    if (found) {
      setPublicKey(found.publicKey);
      if ((found as any).secret_key) {
        setApiKey((found as any).secret_key);
      } else {
        setApiKey(`call_sk_live_${found.publicKey.replace("pk_live_", "")}`);
      }
    }
  };

  // Postman Checkbox state for optional fields (Default X-AI-MODEL-NAME & X-AI-API-KEY unchecked when useExternalApiKey is true)
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>({});

  // Notify parent whenever checkedState changes (after render, not during — avoids the
  // "Cannot update a component while rendering" React warning).
  useEffect(() => {
    onCheckedStateChange?.(checkedState);
  }, [checkedState]); // eslint-disable-line react-hooks/exhaustive-deps

  const isChecked = (key: string) => {
    if (key === "X-AI-MODEL-NAME" || key === "X-AI-API-KEY") {
      return checkedState[key] ?? false;
    }
    return checkedState[key] ?? true;
  };

  const toggleCheck = (key: string) => {
    setCheckedState((prev) => ({ ...prev, [key]: !isChecked(key) }));
  };

  // Copy state for Endpoint URL
  const [urlCopied, setUrlCopied] = useState(false);

  // Compute full execution URL from .env / process.env.NEXT_PUBLIC_API_URL
  const activeUserId = userId || getActiveUserId() || "user_id";
  const endpointUrl = `${PYTHON_API_URL}/v1/call/${activeUserId}`;

  // Parse request schema into visual field structures
  const requestFields: SchemaField[] = requestSchema && typeof requestSchema === "object"
    ? jsonSchemaToSchemaFields(requestSchema)
    : [];

  // Parse response schema into visual field structures to get stats
  const responseFields: SchemaField[] = responseSchema && typeof responseSchema === "object"
    ? jsonSchemaToSchemaFields(responseSchema)
    : [];

  const handleCopyEndpointUrl = () => {
    navigator.clipboard.writeText(endpointUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setExtraInputs((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setImageUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Copy state for cURL command
  const [curlCopied, setCurlCopied] = useState(false);

  // Compute dynamic masked cURL command string
  const maskedPublicKey = publicKey
    ? `${publicKey.substring(0, 12)}••••••••••••`
    : "pk_live_••••••••••••••••";

  const maskedBearerToken = "call_sk_live_••••••••••••••••••••••••";
  const maskedAiApiKey = "••••••••••••••••••••••••••••••••••••";

  const curlHeaderLines = [
    `curl -X POST "${endpointUrl}"`,
    `  -H "Content-Type: application/json"`,
    `  -H "X-CALL-SPEC-ID: ${specSlug || specId}"`,
    `  -H "X-CALL-PUBLIC-KEY: ${maskedPublicKey}"`,
    `  -H "Authorization: Bearer ${maskedBearerToken}"`,
  ];

  if (useExternalApiKey) {
    if (isChecked("X-AI-MODEL-NAME") && aiModelName) {
      curlHeaderLines.push(`  -H "X-AI-MODEL-NAME: ${aiModelName}"`);
    }
    if (isChecked("X-AI-API-KEY")) {
      curlHeaderLines.push(`  -H "X-AI-API-KEY: ${maskedAiApiKey}"`);
    }
  }

  // Helper to truncate base64 image strings for preview display
  const maskLongBase64 = (val: any): any => {
    if (typeof val !== "string") return val;
    if (val.startsWith("data:") && val.includes(";base64,")) {
      const [meta, data] = val.split(";base64,");
      return `${meta};base64,${data.substring(0, 24)}...[base64_truncated]`;
    }
    if (val.length > 120 && (val.startsWith("ey") || val.startsWith("iVBORw") || val.startsWith("/9j/"))) {
      return `${val.substring(0, 32)}...[base64_truncated]`;
    }
    return val;
  };

  // Construct JSON Body preview object considering active/checked parameters
  const bodyJsonPayload = {
    ...(isChecked("image") ? { image: imageUrl } : {}),
    ...(prompt && isChecked("prompt") ? { prompt } : {}),
    ...(Object.keys(extraInputs).reduce((acc, k) => {
      if (isChecked(k)) acc[k] = extraInputs[k];
      return acc;
    }, {} as Record<string, any>)),
  };

  const displayJsonPayload = {
    ...(isChecked("image") ? { image: maskLongBase64(imageUrl) } : {}),
    ...(prompt && isChecked("prompt") ? { prompt } : {}),
    ...(Object.keys(extraInputs).reduce((acc, k) => {
      if (isChecked(k)) acc[k] = maskLongBase64(extraInputs[k]);
      return acc;
    }, {} as Record<string, any>)),
  };

  const bodyPayloadString = JSON.stringify(bodyJsonPayload, null, 2);
  const displayPayloadString = JSON.stringify(displayJsonPayload, null, 2);

  const maskedCurlCommand = `${curlHeaderLines.join(" \\\n")}${
    Object.keys(bodyJsonPayload).length > 0 ? ` \\\n  -d '${bodyPayloadString}'` : ""
  }`;

  const displayCurlCommand = `${curlHeaderLines.join(" \\\n")}${
    Object.keys(displayJsonPayload).length > 0 ? ` \\\n  -d '${displayPayloadString}'` : ""
  }`;

  const handleCopyCurlCommand = () => {
    navigator.clipboard.writeText(maskedCurlCommand);
    setCurlCopied(true);
    setTimeout(() => setCurlCopied(false), 2000);
  };

  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 flex flex-col justify-between h-full">
      <div className="space-y-4">
        {/* Warning Banner if saved credential was deleted */}
        {credentialDeletedWarning && (
          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5 shadow-sm animate-in fade-in duration-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="font-bold block">Pemberitahuan Kredensial API Terhubung</strong>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                API Key yang tersimpan untuk Call Spec ini sebelumnya telah dihapus dari database. Sistem secara otomatis mengalihkan ke Kredensial aktif utama Anda.
              </p>
            </div>
          </div>
        )}

        {/* Postman Endpoint URL Bar */}
        <div className="bg-[#fdf9f3] dark:bg-slate-950 p-3 rounded-xl border border-[#edd6bb]/30 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {/* Postman HTTP Method Badge */}
            <div className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-mono font-black text-xs shrink-0 flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>POST</span>
            </div>

            {/* URL Display */}
            <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 font-mono flex items-center justify-between gap-2 overflow-hidden">
              <span className="truncate select-all text-slate-800 dark:text-slate-200 font-semibold">{endpointUrl}</span>
            </div>

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopyEndpointUrl}
              className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 border border-slate-300 dark:border-slate-700 active:scale-95 shadow-sm"
              title="Copy Endpoint URL to clipboard"
            >
              {urlCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Postman Request Tabs Header: Body | Headers | Auth */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveRequestTab("body")}
            className={`py-2 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeRequestTab === "body"
                ? "border-[#e1b329] text-[#b8860b] dark:text-[#e1b329] bg-amber-500/10 dark:bg-slate-900/50"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/20"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Body</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300">
              {2 + requestFields.filter((f) => f.name !== "image" && f.name !== "prompt").length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveRequestTab("headers")}
            className={`py-2 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeRequestTab === "headers"
                ? "border-[#e1b329] text-[#b8860b] dark:text-[#e1b329] bg-amber-500/10 dark:bg-slate-900/50"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/20"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Headers</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300">
              4
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveRequestTab("auth")}
            className={`py-2 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeRequestTab === "auth"
                ? "border-[#e1b329] text-[#b8860b] dark:text-[#e1b329] bg-amber-500/10 dark:bg-slate-900/50"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/20"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Auth</span>
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-[10px]">
              Bearer
            </span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* POSTMAN TAB 1: BODY */}
        {/* ========================================================================= */}
        {activeRequestTab === "body" && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* Body Mode Selector: Form KV vs Raw JSON */}
            <div className="flex items-center justify-between text-xs pb-1">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium text-[11px]">
                <span>Request Payload Format:</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setBodyMode("form")}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                    bodyMode === "form"
                      ? "bg-[#e1b329] text-slate-950 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  Key-Value Form
                </button>
                <button
                  type="button"
                  onClick={() => setBodyMode("json")}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                    bodyMode === "json"
                      ? "bg-[#e1b329] text-slate-950 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  Raw JSON
                </button>
              </div>
            </div>

            {bodyMode === "form" ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {/* Key-Value Table Container */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-[#fdf9f3] dark:bg-slate-950">

                  {/* ROW 1: image (Mandatory Parameter) */}
                  <div className="flex items-start gap-2.5 py-2.5 px-3 border-b border-slate-200 dark:border-slate-800/60 text-xs">
                    {/* Checkbox Column (Locked Checkbox for required image) */}
                    <div className="pt-1.5 shrink-0">
                      <input
                        type="checkbox"
                        checked={true}
                        disabled={true}
                        readOnly={true}
                        className="rounded border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 text-[#e1b329] cursor-not-allowed opacity-80"
                        title="Parameter image wajib dan tidak dapat dideaktivasi"
                      />
                    </div>

                    {/* Key Column */}
                    <div className="w-4/12 shrink-0">
                      <span className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs block truncate">
                        image
                      </span>
                    </div>

                    {/* Value Column */}
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={imageUrl.startsWith("data:") && imageUrl.includes(";base64,") ? `${imageUrl.substring(0, 35)}... [Base64 Data Attached]` : imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 font-mono focus:outline-none focus:border-[#e1b329]"
                          placeholder="https://example.com/document.png or data:image/png;base64,..."
                        />
                        <label className="px-2 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-[10px] font-bold cursor-pointer flex items-center gap-1 shrink-0">
                          <Upload className="w-3 h-3" />
                          <span>Upload</span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                      {imageUrl && (imageUrl.startsWith("http") || imageUrl.startsWith("data:image/")) && (
                        <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 max-h-24 bg-white dark:bg-slate-900 relative">
                          <img
                            src={imageUrl}
                            alt="Document preview"
                            className="w-full h-24 object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ROW 2: prompt (Optional Parameter) */}
                  <div className={`flex items-start gap-2.5 py-2.5 px-3 border-b border-slate-200 dark:border-slate-800/60 text-xs transition-opacity ${isChecked("prompt") ? "opacity-100" : "opacity-45"}`}>
                    {/* Checkbox Column */}
                    <div className="pt-1.5 shrink-0">
                      <input
                        type="checkbox"
                        checked={isChecked("prompt")}
                        onChange={() => toggleCheck("prompt")}
                        className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#e1b329] focus:ring-0 cursor-pointer"
                      />
                    </div>

                    {/* Key Column */}
                    <div className="w-4/12 shrink-0">
                      <span className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs block truncate">
                        prompt
                      </span>
                    </div>

                    {/* Value Column */}
                    <div className="flex-1">
                      <textarea
                        rows={2}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        disabled={!isChecked("prompt")}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#e1b329] disabled:opacity-50"
                        placeholder={extractionPrompt || "Opsional: Instruksi ekstraksi kustom..."}
                      />
                    </div>
                  </div>

                  {/* ROW 3+: Dynamic Extra Schema Parameters */}
                  {requestFields
                    .filter((field) => field.name !== "image" && field.name !== "prompt")
                    .map((field) => {
                    const active = isChecked(field.name);
                    const isRequired = Boolean(field.required);

                    return (
                      <div key={field.id} className={`flex items-start gap-2.5 py-2.5 px-3 border-b border-slate-200 dark:border-slate-800/60 text-xs transition-opacity ${active ? "opacity-100" : "opacity-45"}`}>
                        {/* Checkbox Column */}
                        <div className="pt-1.5 shrink-0">
                          <input
                            type="checkbox"
                            checked={isRequired ? true : active}
                            disabled={isRequired}
                            onChange={() => !isRequired && toggleCheck(field.name)}
                            className={`rounded border-slate-300 dark:border-slate-700 text-[#e1b329] focus:ring-0 ${isRequired ? "bg-slate-200 dark:bg-slate-800 cursor-not-allowed opacity-80" : "bg-white dark:bg-slate-900 cursor-pointer"}`}
                          />
                        </div>

                        {/* Key Column */}
                        <div className="w-4/12 shrink-0">
                          <span className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs block truncate">
                            {field.name}
                          </span>
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono block mt-0.5">{field.type}</span>
                        </div>

                        {/* Value Column */}
                        <div className="flex-1">
                          {field.type === "boolean" ? (
                            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                              <input
                                type="checkbox"
                                checked={Boolean(extraInputs[field.name])}
                                disabled={!active}
                                onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                                className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#e1b329] focus:ring-0"
                              />
                              <span>{extraInputs[field.name] ? "True" : "False"}</span>
                            </label>
                          ) : field.type === "enum" && field.enumValues ? (
                            <select
                              value={extraInputs[field.name] || ""}
                              disabled={!active}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:border-[#e1b329] disabled:opacity-50"
                            >
                              <option value="">-- Select {field.name} --</option>
                              {field.enumValues.split(",").map((opt, i) => {
                                const trimmed = opt.trim();
                                return (
                                  <option key={i} value={trimmed}>
                                    {trimmed}
                                  </option>
                                );
                              })}
                            </select>
                          ) : field.type === "number" || field.type === "integer" ? (
                            <input
                              type="number"
                              value={extraInputs[field.name] ?? ""}
                              disabled={!active}
                              onChange={(e) => handleFieldChange(field.name, e.target.valueAsNumber || e.target.value)}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:border-[#e1b329] disabled:opacity-50"
                              placeholder={`Numeric value for ${field.name}`}
                            />
                          ) : (
                            <input
                              type="text"
                              value={extraInputs[field.name] || ""}
                              disabled={!active}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:border-[#e1b329] disabled:opacity-50"
                              placeholder={`Value for ${field.name}...`}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-64 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner bg-[#120e0b] dark:bg-slate-950">
                <Editor
                  height="100%"
                  language="json"
                  value={displayPayloadString}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    domReadOnly: true,
                    minimap: { enabled: false },
                    fontSize: 11,
                    fontFamily: "'JetBrains Mono', monospace",
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    padding: { top: 10, bottom: 10 },
                    contextmenu: false,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* POSTMAN TAB 2: HEADERS */}
        {/* ========================================================================= */}
        {activeRequestTab === "headers" && (
          <div className="space-y-3 animate-in fade-in duration-200 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-[#fdf9f3] dark:bg-slate-950">

              {/* HEADER 1: Content-Type (Mandatory) */}
              <div className="flex items-center gap-2.5 py-2.5 px-3 border-b border-slate-200 dark:border-slate-800/60 text-xs">
                {/* Checkbox (Locked) */}
                <div className="shrink-0">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled={true}
                    readOnly={true}
                    className="rounded border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 text-[#e1b329] cursor-not-allowed opacity-80"
                  />
                </div>
                {/* Key */}
                <div className="w-4/12 shrink-0">
                  <span className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs block truncate">
                    Content-Type
                  </span>
                </div>
                {/* Value (Locked display) */}
                <div className="flex-1">
                  <span className="px-2.5 py-1.5 rounded-lg bg-slate-200/60 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono text-xs block w-full truncate">
                    application/json
                  </span>
                </div>
              </div>

              {/* HEADER 2: X-CALL-SPEC-ID (Mandatory) */}
              <div className="flex items-center gap-2.5 py-2.5 px-3 border-b border-slate-200 dark:border-slate-800/60 text-xs">
                {/* Checkbox (Locked) */}
                <div className="shrink-0">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled={true}
                    readOnly={true}
                    className="rounded border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 text-[#e1b329] cursor-not-allowed opacity-80"
                  />
                </div>
                {/* Key */}
                <div className="w-4/12 shrink-0">
                  <span className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs block truncate">
                    X-CALL-SPEC-ID
                  </span>
                </div>
                {/* Value (Locked display) */}
                <div className="flex-1">
                  <span className="px-2.5 py-1.5 rounded-lg bg-slate-200/60 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 text-indigo-700 dark:text-indigo-300 font-mono text-xs block w-full truncate">
                    {specId || specSlug}
                  </span>
                </div>
              </div>

              {/* HEADER 3: X-CALL-PUBLIC-KEY (Mandatory, split input display + dropdown selector) */}
              <div className="flex items-center gap-2.5 py-2.5 px-3 border-b border-slate-200 dark:border-slate-800/60 text-xs">
                {/* Checkbox (Locked/Mandatory) */}
                <div className="shrink-0">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled={true}
                    readOnly={true}
                    className="rounded border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 text-[#e1b329] cursor-not-allowed opacity-80"
                    title="Header X-CALL-PUBLIC-KEY wajib dan tidak dapat dideaktivasi"
                  />
                </div>
                {/* Key */}
                <div className="w-4/12 shrink-0">
                  <span className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs block truncate">
                    X-CALL-PUBLIC-KEY
                  </span>
                </div>
                {/* Value: Split Input (Left: Read-Only Public Key text, Right: Dropdown Selector) */}
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={publicKey}
                    className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-indigo-700 dark:text-indigo-300 font-mono font-bold cursor-not-allowed select-all"
                    placeholder="pk_live_..."
                  />
                  <select
                    value={selectedKeyId}
                    onChange={(e) => handleSelectCredential(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 font-semibold focus:outline-none focus:border-[#e1b329] shrink-0"
                  >
                    {availableKeys.length > 0 ? (
                      availableKeys.map((keyObj) => (
                        <option key={keyObj.id} value={keyObj.id}>
                          {keyObj.name}
                        </option>
                      ))
                    ) : (
                      <option value="">{keysError || "-- Belum Ada API Key --"}</option>
                    )}
                  </select>
                </div>
              </div>

              {/* HEADER 4: X-AI-MODEL-NAME (Behavior depends on useExternalApiKey) */}
              <div className={`flex items-center gap-2.5 py-2.5 px-3 border-b border-slate-200 dark:border-slate-800/60 text-xs transition-opacity ${!useExternalApiKey || isChecked("X-AI-MODEL-NAME") ? "opacity-100" : "opacity-45"}`}>
                {/* Checkbox: Mandatory/Locked if !useExternalApiKey, Toggleable if useExternalApiKey */}
                <div className="shrink-0">
                  <input
                    type="checkbox"
                    checked={!useExternalApiKey ? true : isChecked("X-AI-MODEL-NAME")}
                    disabled={!useExternalApiKey}
                    readOnly={!useExternalApiKey}
                    onChange={() => useExternalApiKey && toggleCheck("X-AI-MODEL-NAME")}
                    className={`rounded border-slate-300 dark:border-slate-700 text-[#e1b329] focus:ring-0 ${!useExternalApiKey ? "bg-slate-200 dark:bg-slate-800 cursor-not-allowed opacity-80" : "bg-white dark:bg-slate-900 cursor-pointer"}`}
                    title={!useExternalApiKey ? "Nama Model AI ditentukan oleh Call Spec (wajib & tidak dapat di-uncheck)" : undefined}
                  />
                </div>
                {/* Key */}
                <div className="w-4/12 shrink-0">
                  <span className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs block truncate">
                    X-AI-MODEL-NAME
                  </span>
                </div>
                {/* Value: Editable if useExternalApiKey & checked, Locked if !useExternalApiKey */}
                <div className="flex-1">
                  <input
                    type="text"
                    value={aiModelName}
                    readOnly={!useExternalApiKey}
                    disabled={!useExternalApiKey || !isChecked("X-AI-MODEL-NAME")}
                    onChange={(e) => useExternalApiKey && setAiModelName(e.target.value)}
                    className={`w-full border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-indigo-700 dark:text-indigo-300 font-mono focus:outline-none focus:border-[#e1b329] ${
                      !useExternalApiKey
                        ? "bg-slate-100 dark:bg-slate-900/60 cursor-not-allowed opacity-80 select-all"
                        : isChecked("X-AI-MODEL-NAME")
                        ? "bg-white dark:bg-slate-900"
                        : "bg-slate-100/60 dark:bg-slate-900/40 opacity-50 cursor-not-allowed"
                    }`}
                    placeholder="e.g. gemini-1.5-flash"
                  />
                </div>
              </div>

              {/* HEADER 5: X-AI-API-KEY (Behavior depends on useExternalApiKey) */}
              <div className={`flex items-center gap-2.5 py-2.5 px-3 text-xs transition-opacity ${!useExternalApiKey || isChecked("X-AI-API-KEY") ? "opacity-100" : "opacity-45"}`}>
                {/* Checkbox: Mandatory/Locked if !useExternalApiKey, Toggleable if useExternalApiKey */}
                <div className="shrink-0">
                  <input
                    type="checkbox"
                    checked={!useExternalApiKey ? true : isChecked("X-AI-API-KEY")}
                    disabled={!useExternalApiKey}
                    readOnly={!useExternalApiKey}
                    onChange={() => useExternalApiKey && toggleCheck("X-AI-API-KEY")}
                    className={`rounded border-slate-300 dark:border-slate-700 text-[#e1b329] focus:ring-0 ${!useExternalApiKey ? "bg-slate-200 dark:bg-slate-800 cursor-not-allowed opacity-80" : "bg-white dark:bg-slate-900 cursor-pointer"}`}
                    title={!useExternalApiKey ? "Kunci AI API Provider ditentukan oleh Call Spec (wajib & tidak dapat di-uncheck)" : undefined}
                  />
                </div>
                {/* Key */}
                <div className="w-4/12 shrink-0">
                  <span className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs block truncate">
                    X-AI-API-KEY
                  </span>
                </div>
                {/* Value: Locked/Editable Password input without Eye Toggle button */}
                <div className="flex-1">
                  <input
                    type="password"
                    value={!useExternalApiKey ? (aiApiKey || "••••••••••••••••••••••••••••••••••••") : aiApiKey}
                    readOnly={!useExternalApiKey}
                    disabled={!useExternalApiKey || !isChecked("X-AI-API-KEY")}
                    onChange={(e) => useExternalApiKey && setAiApiKey(e.target.value)}
                    className={`w-full border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-300 font-mono focus:outline-none focus:border-[#e1b329] ${
                      !useExternalApiKey
                        ? "bg-slate-100 dark:bg-slate-900/60 cursor-not-allowed opacity-80"
                        : isChecked("X-AI-API-KEY")
                        ? "bg-white dark:bg-slate-900"
                        : "bg-slate-100/60 dark:bg-slate-900/40 opacity-50 cursor-not-allowed"
                    }`}
                    placeholder="••••••••••••••••••••••••••••••••••••"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* POSTMAN TAB 3: AUTH */}
        {/* ========================================================================= */}
        {activeRequestTab === "auth" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-3 rounded-xl bg-[#fdf9f3] dark:bg-slate-950 border border-[#edd6bb]/30 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Authentication Type</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
                  Bearer Token
                </span>
              </div>

              {/* Auth Credentials KV Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900/50">

                {/* AUTH ROW 1: Callcraft Secret API Key (Synced with Public Key selection) */}
                <div className="flex items-center gap-2.5 py-2.5 px-3 text-xs">
                  {/* Checkbox (Locked) */}
                  <div className="shrink-0">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled={true}
                      readOnly={true}
                      className="rounded border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 text-[#e1b329] cursor-not-allowed opacity-80"
                    />
                  </div>
                  {/* Key */}
                  <div className="w-4/12 shrink-0">
                    <span className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs block truncate">
                      Bearer Token
                    </span>
                  </div>
                  {/* Value (Synced Password Input without Eye Toggle) */}
                  <div className="flex-1">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-indigo-700 dark:text-indigo-300 font-mono focus:outline-none focus:border-[#e1b329]"
                      placeholder="call_sk_live_..."
                    />
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Token <code className="text-indigo-700 dark:text-indigo-400 font-mono">Authorization: Bearer call_sk_...</code> diverifikasi oleh Callcraft Gateway pada setiap HTTP POST request.
              </p>

              {/* Informative Helper Card for Selected Credential */}
              <div className="p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                  <Info className="w-3.5 h-3.5 text-[#e1b329] shrink-0" />
                  <span>Informasi Kredensial Terhubung</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                  Bearer Token ini otomatis mengikuti API Key yang sedang dipilih:{" "}
                  <strong className="text-[#b8860b] dark:text-[#e1b329] font-bold">
                    {availableKeys.find((k) => k.id === selectedKeyId)?.name || "Belum ada key terpilih"}
                  </strong>{" "}
                  {publicKey ? (
                    <code className="font-mono text-indigo-700 dark:text-indigo-300">({publicKey})</code>
                  ) : (
                    <span className="text-rose-500 italic">(Belum ada public key)</span>
                  )}.
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  * Untuk mengganti kredensial terhubung, pilih melalui dropdown pada tab <strong className="not-italic text-slate-700 dark:text-slate-200 font-bold">Headers → X-CALL-PUBLIC-KEY</strong>.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Execute Test Execution & Save Playground State CTAs */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
        {saveSuccessMsg && (
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRunTest}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] disabled:opacity-50 text-slate-950 text-xs font-extrabold shadow-lg shadow-[#e1b329]/20 flex items-center justify-center gap-2 transition-all transform active:scale-98"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Play className="w-4 h-4 fill-slate-950" />
            )}
            <span>{loading ? "Executing Callcraft API Stream..." : "Send Request (Run Test)"}</span>
          </button>

          <button
            type="button"
            onClick={handleSavePlaygroundState}
            disabled={savingState || loading}
            className="px-4 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-800 dark:text-slate-100 text-xs font-bold border border-slate-300 dark:border-slate-700 shadow-md flex items-center gap-2 transition-all transform active:scale-98 shrink-0"
            title="Simpan konfigurasi & nilai form Playground ini ke Database"
          >
            {savingState ? (
              <div className="w-4 h-4 border-2 border-slate-700 dark:border-slate-300 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save className="w-4 h-4 text-[#e1b329]" />
            )}
            <span>{savingState ? "Saving..." : "Save State"}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CARD BARU: DYNAMIC cURL COMMAND SNIPPET (CARD DIBAWAH FORM UTAMA) */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800 space-y-3 bg-[#fcf9f2] dark:bg-slate-950/80 shadow-md">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-[#b8860b] dark:text-[#e1b329]">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <span>Dynamic cURL Snippet</span>
                <span className="px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-extrabold">
                  POST
                </span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Perintah cURL otomatis ter-update secara dinamis (Informasi sensitif disamarkan).
              </p>
            </div>
          </div>

          {/* Copy cURL Button */}
          <button
            type="button"
            onClick={handleCopyCurlCommand}
            className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-300 dark:border-slate-700 active:scale-95 shrink-0"
            title="Copy dynamic cURL command to clipboard"
          >
            {curlCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy cURL</span>
              </>
            )}
          </button>
        </div>

        {/* Code Block Container - Monaco Shell Editor */}
        <div className="h-44 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner bg-[#120e0b] dark:bg-slate-950">
          <Editor
            height="100%"
            language="shell"
            value={displayCurlCommand}
            theme="vs-dark"
            options={{
              readOnly: true,
              domReadOnly: true,
              minimap: { enabled: false },
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              lineNumbers: "off",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 10, bottom: 10 },
              wordWrap: "on",
              contextmenu: false,
            }}
          />
        </div>
      </div>
    </div>
  );
}
