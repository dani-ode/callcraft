"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Play,
  Sparkles,
  Copy,
  Check,
  FileText,
  CheckCircle2,
  Zap,
  Edit3,
  Code2,
  Layers,
  ArrowRight,
  RefreshCw,
  Sliders,
  AlertCircle,
  FileCode2,
  Plus,
} from "lucide-react";
import { executeCallcraftApi, fetchCallSpecs, fetchCallSpecById, getActiveUserId } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { CallSpec } from "@/lib/types";
import { DynamicSpecForm } from "@/components/playground/dynamic-spec-form";
import { SchemaPreview } from "@/components/schema-builder/schema-preview";
import { jsonSchemaToSchemaFields } from "@/components/schema-builder/schema-helpers";

function PlaygroundContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [userSpecs, setUserSpecs] = useState<CallSpec[]>([]);
  const [specId, setSpecId] = useState<string>("");
  const [activeSpec, setActiveSpec] = useState<CallSpec | null>(null);
  const [specsLoading, setSpecsLoading] = useState(true);

  // Form State
  const [provider, setProvider] = useState("gemini");
  const [aiModelName, setAiModelName] = useState("gemini-1.5-flash");
  const [apiKey, setApiKey] = useState("call_sk_live_dev_secret_key_12345");
  const [aiApiKey, setAiApiKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("https://raw.githubusercontent.com/tesseract-ocr/test/main/testing/eurotext.png");
  const [extraInputs, setExtraInputs] = useState<Record<string, any>>({});

  // Tracks which optional headers are enabled via checkboxes in DynamicSpecForm.
  // Keys that matter: "X-AI-MODEL-NAME" and "X-AI-API-KEY".
  // Default false (unchecked) — API falls back to spec / saved DB key when not sent.
  const [checkedHeaders, setCheckedHeaders] = useState<Record<string, boolean>>({});

  // Execution Output State
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Right Panel Tab State ("body" vs "header")
  const [rightPanelTab, setRightPanelTab] = useState<"body" | "header">("body");

  // Load user specs on mount
  useEffect(() => {
    let isMounted = true;
    fetchCallSpecs()
      .then((data) => {
        if (!isMounted) return;
        setUserSpecs(data);
      })
      .catch((err) => {
        console.warn("[Playground] Specs load error:", err);
      })
      .finally(() => {
        if (isMounted) setSpecsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync selected spec from URL query param or localStorage or default to first user spec
  useEffect(() => {
    if (specsLoading) return;

    const paramSpecId = searchParams.get("specId");
    const localSpecId = typeof window !== "undefined" ? localStorage.getItem("callcraft_playground_selected_spec") : null;

    let targetId = paramSpecId || localSpecId || "";

    if (userSpecs.length > 0) {
      const exists = userSpecs.some((s) => s.id === targetId || s.slug === targetId);
      if (!exists && targetId) {
        // Target ID no longer exists (e.g. deleted sample preset like ktp-parser)
        if (typeof window !== "undefined") {
          localStorage.removeItem("callcraft_playground_selected_spec");
        }
        targetId = userSpecs[0].id;
      } else if (!targetId) {
        targetId = userSpecs[0].id;
      }
    }

    if (targetId) {
      setSpecId(targetId);
      resolveAndSetSpec(targetId);
    }
  }, [searchParams, userSpecs, specsLoading]);

  const resolveAndSetSpec = async (targetId: string) => {
    if (!targetId) return;

    const applySpecToForm = (spec: CallSpec) => {
      setActiveSpec(spec);
      setPrompt(spec.extractionPrompt || "");
      setProvider(spec.provider || "gemini");
      setAiModelName(spec.externalModelName || "gemini-3.6-flash");
      setAiApiKey(spec.externalApiKey || "");
    };

    // 1. Look in loaded user specs
    const userSpec = userSpecs.find((s) => s.id === targetId || s.slug === targetId);
    if (userSpec) {
      applySpecToForm(userSpec);
      return;
    }

    // 2. Fetch single spec directly from backend API
    const singleSpec = await fetchCallSpecById(targetId);
    if (singleSpec) {
      applySpecToForm(singleSpec);
    } else {
      // 404 Not Found: Clean invalid key and fallback to first spec
      if (typeof window !== "undefined") {
        localStorage.removeItem("callcraft_playground_selected_spec");
      }
      if (userSpecs.length > 0) {
        setSpecId(userSpecs[0].id);
        applySpecToForm(userSpecs[0]);
      }
    }
  };

  const handleSelectSpec = (newId: string) => {
    setSpecId(newId);
    resolveAndSetSpec(newId);

    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("callcraft_playground_selected_spec", newId);
    }

    // Replace URL parameter without full page refresh
    const newUrl = `${window.location.pathname}?specId=${encodeURIComponent(newId)}`;
    window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, "", newUrl);
  };

  const handleRunTest = async () => {
    if (!activeSpec) return;

    setLoading(true);
    setError(null);
    setResult(null);

    // Only include optional AI headers if their checkboxes are explicitly enabled.
    // When unchecked, the API uses the spec's configured model / user's saved DB key.
    const useExternalKey = activeSpec?.useExternalApiKey ?? (activeSpec as any)?.use_external_api_key ?? true;
    const sendModelHeader = !useExternalKey || (checkedHeaders["X-AI-MODEL-NAME"] === true);
    const sendKeyHeader   = !useExternalKey || (checkedHeaders["X-AI-API-KEY"] === true);

    try {
      const data = await executeCallcraftApi({
        userId: user?.id || getActiveUserId(),
        specId: activeSpec.id || specId,
        provider,
        apiKey,
        image: imageUrl,
        prompt: prompt || undefined,
        aiApiKey: sendKeyHeader ? (aiApiKey || undefined) : undefined,
        aiModelName: sendModelHeader ? (aiModelName || undefined) : undefined,
      });
      setResult(data);
      setRightPanelTab("body");
    } catch (e: any) {
      setError(e.message || "Gagal menjalankan eksekusi Callcraft API");
      setRightPanelTab("body");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyJson = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Convert current active spec schemas into SchemaField[] for live Monaco JSON Schema preview
  const responseSchemaObj = activeSpec
    ? activeSpec.responseSchema || (activeSpec as any).response_schema || { type: "object", properties: {} }
    : { type: "object", properties: {} };

  const requestSchemaObj = activeSpec
    ? activeSpec.requestSchema || (activeSpec as any).request_schema || { type: "object", properties: {} }
    : { type: "object", properties: {} };

  const activeResponseFields = useMemo(() => jsonSchemaToSchemaFields(responseSchemaObj), [responseSchemaObj]);
  const activeRequestFields = useMemo(() => jsonSchemaToSchemaFields(requestSchemaObj), [requestSchemaObj]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Zap className="w-6 h-6 text-[#e1b329]" />
          <span>Interactive Callcraft API Playground</span>
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
          Uji coba langsung ekstraksi dokumen, validasi parameter request, dan pratinjau JSON Schema dari Call Spec yang Anda buat
        </p>
      </div>

      {/* Main Spec Selector & Builder Button Bar (Side-by-Side) */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#e1b329]" />
          <span>Pilih Call Spec Yang Akan Diuji:</span>
        </label>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-0.5">
          <div className="flex-1">
            {specsLoading ? (
              <div className="h-10 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse flex items-center px-4 text-xs text-slate-500 font-medium">
                Memuat daftar Call Spec...
              </div>
            ) : userSpecs.length > 0 ? (
              <select
                value={specId}
                onChange={(e) => handleSelectSpec(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-[#e1b329]"
              >
                {userSpecs.map((spec) => (
                  <option key={spec.id} value={spec.id}>
                    {spec.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 font-semibold">
                <span>Belum ada Call Spec yang dibuat. Buat spec pertama Anda untuk mulai uji coba di Playground.</span>
              </div>
            )}
          </div>

          {/* Button "Buka di Visual Builder" placed side-by-side with dropdown */}
          <Link
            href={activeSpec ? `/specs/${activeSpec.id}/builder` : "/specs/new/builder"}
            className="px-4 py-2.5 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-500/30 shadow-lg flex items-center justify-center gap-2 transition-all shrink-0 whitespace-nowrap"
            title="Buka spec ini di Visual Schema Builder"
          >
            <Edit3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>{activeSpec ? "Buka di Visual Builder" : "Buat Call Spec Baru"}</span>
            <ArrowRight className="w-3.5 h-3.5 opacity-70" />
          </Link>
        </div>
      </div>

      {/* Empty State when no specs exist */}
      {!specsLoading && userSpecs.length === 0 && (
        <div className="glass-panel p-12 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center space-y-4 max-w-xl mx-auto my-8">
          <div className="w-14 h-14 rounded-3xl bg-[#e1b329]/15 text-[#e1b329] flex items-center justify-center mx-auto border border-[#e1b329]/30">
            <Code2 className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Playground Siap Digunakan</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Playground adalah ruang uji coba interaktif untuk mengeksekusi Call Spec yang Anda rancang. Buat Call Spec pertama Anda di Visual Builder untuk langsung mencobanya di sini.
            </p>
          </div>
          <Link
            href="/specs/new/builder"
            className="px-5 py-3 rounded-2xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 font-extrabold text-xs shadow-lg shadow-[#e1b329]/20 inline-flex items-center gap-2 transition-all transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Rancang Call Spec Pertama Anda</span>
          </Link>
        </div>
      )}

      {/* Main Split Grid: Dynamic Form vs JSON Schema Preview & Output Panel */}
      {activeSpec && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[580px]">
          {/* Left Column: Dynamic Spec Form Generator */}
          <DynamicSpecForm
            specName={activeSpec.name || "Custom Spec"}
            specSlug={activeSpec.slug || specId}
            specId={activeSpec.id || specId}
            userId={user?.id || getActiveUserId()}
            useExternalApiKey={activeSpec?.useExternalApiKey ?? (activeSpec as any)?.use_external_api_key ?? true}
            requestSchema={requestSchemaObj}
            responseSchema={responseSchemaObj}
            systemPrompt={activeSpec.systemPrompt || (activeSpec as any).system_prompt}
            extractionPrompt={activeSpec.extractionPrompt || (activeSpec as any).extraction_prompt}
            provider={provider}
            setProvider={setProvider}
            aiModelName={aiModelName}
            setAiModelName={setAiModelName}
            apiKey={apiKey}
            setApiKey={setApiKey}
            aiApiKey={aiApiKey}
            setAiApiKey={setAiApiKey}
            imageUrl={imageUrl}
            setImageUrl={setImageUrl}
            prompt={prompt}
            setPrompt={setPrompt}
            extraInputs={extraInputs}
            setExtraInputs={setExtraInputs}
            onRunTest={handleRunTest}
            loading={loading}
            onCheckedStateChange={setCheckedHeaders}
          />

          {/* Right Column: Tabbed Panel (Response Body & Response Header via SchemaPreview) */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col h-full overflow-hidden space-y-4">
            {/* Right Panel Navigation Tabs */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setRightPanelTab("body")}
                  className={`py-1.5 px-3 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                    rightPanelTab === "body"
                      ? "bg-[#e1b329] text-slate-950 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Response Body</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRightPanelTab("header")}
                  className={`py-1.5 px-3 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                    rightPanelTab === "header"
                      ? "bg-[#e1b329] text-slate-950 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Response Header</span>
                </button>
              </div>

              {result && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="px-2.5 py-1 rounded-lg glass-panel hover:bg-slate-200 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied" : "Copy JSON"}</span>
                  </button>
                  {result.execution?.processingTimeMs !== undefined && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{result.execution.processingTimeMs} ms</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Error or Loading State Banners */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-semibold space-y-1 shrink-0">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                  <AlertCircle className="w-4 h-4" />
                  <span>API Execution Error</span>
                </div>
                <p className="text-xs font-mono">{error}</p>
              </div>
            )}

            {loading && (
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center gap-3 shrink-0">
                <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-bold">Memproses ekstraksi multimodal melalui AI Gateway...</p>
              </div>
            )}

            {/* TAB CONTENT 1: Response Body */}
            {rightPanelTab === "body" && (
              <div className="flex-1 overflow-hidden min-h-[360px]">
                <SchemaPreview
                  schema={result || {}}
                  activeTabName="Response Body"
                  noWrapper={true}
                />
              </div>
            )}

            {/* TAB CONTENT 2: Response Header */}
            {rightPanelTab === "header" && (
              <div className="flex-1 overflow-hidden min-h-[360px]">
                <SchemaPreview
                  schema={
                    result
                      ? {
                          status: 200,
                          statusText: "OK",
                          meta: result.meta,
                          execution: result.execution,
                          metrics: result.metrics,
                          spec: result.spec,
                        }
                      : {}
                  }
                  activeTabName="Response Header"
                  noWrapper={true}
                />
              </div>
            )}

            {/* Spec Overview Footer Banner (Bottom of Right Card) */}
            {activeSpec && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 dark:bg-slate-900/90 border border-amber-500/20 dark:border-slate-800 flex items-center justify-between gap-3 mt-4 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#e1b329]" />
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">{activeSpec.name}</h3>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono mt-0.5">
                    slug: {activeSpec.slug} • ID: {activeSpec.id}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-bold">
                    {responseSchemaObj?.properties ? Object.keys(responseSchemaObj.properties).length : 0} Output Fields
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlaygroundPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-slate-400 space-y-2">
          <div className="w-6 h-6 border-2 border-[#e1b329] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold">Memuat Interactive API Playground...</p>
        </div>
      }
    >
      <PlaygroundContent />
    </Suspense>
  );
}
