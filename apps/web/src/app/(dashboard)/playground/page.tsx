"use client";

import { useState } from "react";
import { Play, Sparkles, Upload, Zap, CheckCircle2 } from "lucide-react";
import { executeCallcraftApi } from "@/lib/api-client";

export default function PlaygroundPage() {
  const [specId, setSpecId] = useState("ktp-parser");
  const [provider, setProvider] = useState("gemini");
  const [apiKey, setApiKey] = useState("call_sk_live_dev_secret_key_12345");
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("https://raw.githubusercontent.com/tesseract-ocr/test/main/testing/eurotext.png");
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await executeCallcraftApi({
        userId: "usr_default_dev_01",
        specId,
        provider,
        apiKey,
        image: imageUrl,
        prompt: prompt || undefined,
      });
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Failed to execute callcraft API");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Interactive API Playground</h1>
        <p className="text-xs text-slate-400">Test live document parsing and structured coercion in real-time</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Configuration Panel */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300">Select Call Spec</label>
              <select
                value={specId}
                onChange={(e) => setSpecId(e.target.value)}
                className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200"
              >
                <option value="ktp-parser">Indonesian KTP Parser (ktp-parser)</option>
                <option value="invoice-extractor">Invoice Data Extractor (invoice-extractor)</option>
                <option value="receipt-parser">Retail Receipt Parser (receipt-parser)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">AI Provider</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200"
                >
                  <option value="gemini">Google Gemini 1.5 Flash</option>
                  <option value="openai">OpenAI GPT-4o</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Bearer Secret API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-indigo-300 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Document Image URL or Base64</label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-mono"
                placeholder="https://... or data:image/png;base64,..."
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Custom Extraction Prompt Override (Optional)</label>
              <textarea
                rows={2}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200"
                placeholder="e.g. Please format names in uppercase..."
              />
            </div>

            <button
              onClick={handleRunTest}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Play className="w-4 h-4 fill-white" />
              )}
              <span>{loading ? "Executing API Stream..." : "Run Test Execution"}</span>
            </button>
          </div>
        </div>

        {/* Live Output Response Panel */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              <span>Execution Output</span>
            </h3>
            {result && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>{result.execution?.processing_time_ms} ms</span>
              </span>
            )}
          </div>

          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 overflow-x-auto min-h-[300px]">
            {error && <div className="text-rose-400 font-semibold">{error}</div>}
            {result && <pre className="text-emerald-400">{JSON.stringify(result, null, 2)}</pre>}
            {!loading && !result && !error && (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2 py-12">
                <Sparkles className="w-8 h-8 opacity-40" />
                <p>Click "Run Test Execution" to send live API request.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
