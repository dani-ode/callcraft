"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Key,
  Play,
  Check,
  Save,
  AlertTriangle,
} from "lucide-react";
import { SchemaField } from "@/components/schema-builder/types";
import { jsonSchemaToSchemaFields } from "@/components/schema-builder/schema-helpers";
import {
  PYTHON_API_URL,
  getActiveUserId,
  fetchApiKeys,
  fetchPlaygroundState,
  savePlaygroundState,
} from "@/lib/api-client";
import { ApiCredential } from "@/lib/types";
import { EndpointBar } from "./endpoint-bar";
import { RequestBodyTab } from "./request-body-tab";
import { RequestHeadersTab } from "./request-headers-tab";
import { RequestAuthTab } from "./request-auth-tab";
import { CurlSnippetCard } from "./curl-snippet-card";

import { useProject } from "@/context/project-context";

interface DynamicSpecFormProps {
  specName: string;
  specSlug: string;
  specId: string;
  userId?: string;
  useExternalApiKey?: boolean;
  requestSchema?: any;
  responseSchema?: any;
  positivePrompt?: string;
  extractionPrompt?: string;
  negativePrompt?: string;
  setNegativePrompt?: (p: string) => void;
  additionalPrompt?: string;
  allowAdditionalPrompt?: boolean;
  provider: string;
  setProvider: (p: string) => void;
  aiModelName: string;
  setAiModelName: (m: string) => void;
  apiKey: string;
  setApiKey: (k: string) => void;
  aiApiKey: string;
  setAiApiKey: (k: string) => void;
  prompt: string;
  setPrompt: (p: string) => void;
  extraInputs: Record<string, any>;
  setExtraInputs: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  onRunTest: () => void;
  loading: boolean;
  onCheckedStateChange?: (state: Record<string, boolean>) => void;
  onPublicKeyChange?: (publicKey: string) => void;
}

export function DynamicSpecForm({
  specName,
  specSlug,
  specId,
  userId,
  useExternalApiKey = true,
  requestSchema,
  responseSchema,
  positivePrompt,
  extractionPrompt,
  negativePrompt,
  setNegativePrompt,
  additionalPrompt,
  allowAdditionalPrompt = true,
  provider,
  setProvider,
  aiModelName,
  setAiModelName,
  apiKey,
  setApiKey,
  aiApiKey,
  setAiApiKey,
  prompt,
  setPrompt,
  extraInputs,
  setExtraInputs,
  onRunTest,
  loading,
  onCheckedStateChange,
  onPublicKeyChange,
}: DynamicSpecFormProps) {
  const { activeProject } = useProject();

  // Postman Request Tabs: "body" | "headers" | "auth"
  const [activeRequestTab, setActiveRequestTab] = useState<"body" | "headers" | "auth">("body");
  const [bodyMode, setBodyMode] = useState<"form" | "json">("form");

  // Credentials State for Public Key Select Dropdown
  const [availableKeys, setAvailableKeys] = useState<ApiCredential[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string>("");
  const [publicKey, setPublicKey] = useState<string>("");
  const [keysError, setKeysError] = useState<string | null>(null);

  // Save State UI Feedback
  const [savingState, setSavingState] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [credentialDeletedWarning, setCredentialDeletedWarning] = useState<boolean>(false);

  // Checkbox state for optional fields (Default X-AI-MODEL-NAME & X-AI-API-KEY unchecked when useExternalApiKey is true)
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>({});

  // Fetch Live Credentials from Backend API on mount or project switch
  useEffect(() => {
    fetchApiKeys(activeProject?.id)
      .then((keys) => {
        if (keys && keys.length > 0) {
          setAvailableKeys(keys);
          setSelectedKeyId(keys[0].id);
          setPublicKey(keys[0].publicKey);
          if ((keys[0] as any).secret_key && !apiKey) {
            setApiKey((keys[0] as any).secret_key);
          }
        } else {
          setAvailableKeys([]);
          setSelectedKeyId("");
          setPublicKey("");
        }
      })
      .catch((err) => {
        console.warn("[Playground] Keys load error", err);
        setKeysError(err.message || "Gagal memuat API Key dari server.");
      });
  }, [activeProject?.id]);

  // Sync selected credential & public key with availableKeys without altering bearer token (apiKey)
  useEffect(() => {
    if (selectedKeyId && availableKeys.length > 0) {
      const match = availableKeys.find((k) => k.id === selectedKeyId);
      if (match) {
        setPublicKey(match.publicKey);
        onPublicKeyChange?.(match.publicKey);
      }
    } else if (!selectedKeyId) {
      setPublicKey("");
      onPublicKeyChange?.("");
    }
  }, [availableKeys, selectedKeyId]);

  const handleSelectCredential = (keyId: string) => {
    setSelectedKeyId(keyId);
    if (!keyId) {
      setPublicKey("");
      onPublicKeyChange?.("");
      return;
    }
    const found = availableKeys.find((k) => k.id === keyId);
    if (found) {
      setPublicKey(found.publicKey);
      onPublicKeyChange?.(found.publicKey);
    } else {
      setPublicKey("");
      onPublicKeyChange?.("");
    }
  };

  // Load saved playground state for this specId from DB on mount / spec change
  useEffect(() => {
    if (!specId) return;
    setCredentialDeletedWarning(false);

    fetchPlaygroundState(specId).then((state) => {
      if (state) {
        if (state.checkedStates) {
          setCheckedState(state.checkedStates);
        }
        if (state.prompt !== undefined && state.prompt !== null) {
          setPrompt(state.prompt);
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
        aiModelName: aiModelName,
        aiApiKey: aiApiKey,
      });
      setSaveSuccessMsg("Playground state berhasil disimpan di Database!");
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("[Playground] Save state error", err);
      alert(`Gagal menyimpan state: ${err.message}`);
    } finally {
      setSavingState(false);
    }
  };

  // Truncate base64 image strings for preview display
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

  // Notify parent whenever checkedState changes
  useEffect(() => {
    onCheckedStateChange?.(checkedState);
  }, [checkedState]);

  const isChecked = (key: string) => {
    if (key === "X-AI-MODEL-NAME" || key === "X-AI-API-KEY") {
      return checkedState[key] ?? false;
    }
    return checkedState[key] ?? true;
  };

  const toggleCheck = (key: string) => {
    setCheckedState((prev) => ({ ...prev, [key]: !isChecked(key) }));
  };

  const activeUserId = userId || getActiveUserId();
  const endpointUrl = `${PYTHON_API_URL}/v1/call/${activeUserId}`;

  const requestFields: SchemaField[] = requestSchema && typeof requestSchema === "object"
    ? jsonSchemaToSchemaFields(requestSchema)
    : [];

  const handleFieldChange = (fieldName: string, value: any) => {
    setExtraInputs((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  // Compute dynamic cURL command string
  const maskedPublicKey = publicKey ? publicKey : "";
  const maskedBearerToken = apiKey ? apiKey : "";

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
    if (isChecked("X-AI-API-KEY") && aiApiKey) {
      curlHeaderLines.push(`  -H "X-AI-API-KEY: ${aiApiKey}"`);
    }
  }

  const bodyJsonPayload = {
    ...(prompt && isChecked("prompt") ? { prompt } : {}),
    ...(Object.keys(extraInputs).reduce((acc, k) => {
      if (isChecked(k)) acc[k] = extraInputs[k];
      return acc;
    }, {} as Record<string, any>)),
  };

  const displayJsonPayload = {
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
                API Key yang tersimpan untuk Call Spec ini sebelumnya telah dihapus. Sistem mengalihkan ke Kredensial aktif utama Anda.
              </p>
            </div>
          </div>
        )}

        {/* Postman Endpoint URL Bar */}
        <EndpointBar endpointUrl={endpointUrl} />

        {/* Postman Navigation Tabs: Body | Headers | Auth */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveRequestTab("body")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeRequestTab === "body"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-[#e1b329]" />
              <span>Body ({Object.keys(bodyJsonPayload).length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveRequestTab("headers")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeRequestTab === "headers"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Key className="w-3.5 h-3.5 text-indigo-500" />
              <span>Headers (3 mandatory)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveRequestTab("auth")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeRequestTab === "auth"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Key className="w-3.5 h-3.5 text-emerald-500" />
              <span>Auth (Bearer)</span>
            </button>
          </div>
        </div>

        {/* POSTMAN TAB 1: BODY */}
        {activeRequestTab === "body" && (
          <RequestBodyTab
            bodyMode={bodyMode}
            setBodyMode={setBodyMode}
            isChecked={isChecked}
            toggleCheck={toggleCheck}
            allowAdditionalPrompt={allowAdditionalPrompt}
            prompt={prompt}
            setPrompt={setPrompt}
            additionalPrompt={additionalPrompt}
            requestFields={requestFields}
            extraInputs={extraInputs}
            handleFieldChange={handleFieldChange}
            displayPayloadString={displayPayloadString}
          />
        )}

        {/* POSTMAN TAB 2: HEADERS */}
        {activeRequestTab === "headers" && (
          <RequestHeadersTab
            specId={specId}
            specSlug={specSlug}
            publicKey={publicKey}
            selectedKeyId={selectedKeyId}
            availableKeys={availableKeys}
            handleSelectCredential={handleSelectCredential}
            useExternalApiKey={useExternalApiKey}
            isChecked={isChecked}
            toggleCheck={toggleCheck}
            aiModelName={aiModelName}
            setAiModelName={setAiModelName}
            aiApiKey={aiApiKey}
            setAiApiKey={setAiApiKey}
          />
        )}

        {/* POSTMAN TAB 3: AUTH */}
        {activeRequestTab === "auth" && (
          <RequestAuthTab apiKey={apiKey} setApiKey={setApiKey} />
        )}
      </div>

      {/* Execute Test & Save Playground State CTAs */}
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

      {/* CARD: DYNAMIC cURL COMMAND SNIPPET */}
      <CurlSnippetCard
        maskedCurlCommand={maskedCurlCommand}
        displayCurlCommand={displayCurlCommand}
      />
    </div>
  );
}
