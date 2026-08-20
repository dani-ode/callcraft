"use client";

import { useState } from "react";
import { Copy, Key, Plus, Shield, Check, Eye, EyeOff } from "lucide-react";

export default function ApiKeysPage() {
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const [providerKeys, setProviderKeys] = useState({
    gemini: "AIzaSyDevKey_Gemini_Sample_998877",
    openai: "sk-proj-DevKey_OpenAI_Sample_112233",
    anthropic: "",
  });

  const handleGenerateKey = () => {
    const secret = `call_sk_live_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`;
    setCreatedSecret(secret);
  };

  const handleCopy = () => {
    if (createdSecret) {
      navigator.clipboard.writeText(createdSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">API Credentials & Keys</h1>
          <p className="text-xs text-slate-400">Manage customer secret keys and encrypted AI provider keys</p>
        </div>
        <button
          onClick={handleGenerateKey}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Generate Secret API Key</span>
        </button>
      </div>

      {/* Secret Key Modal Banner if Generated */}
      {createdSecret && (
        <div className="glass-panel p-6 rounded-2xl border border-indigo-500/40 bg-indigo-950/30 space-y-3">
          <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>New API Secret Key Generated</span>
          </div>
          <p className="text-xs text-slate-300">
            Please copy this key now. For security reasons, it will not be shown again. (Hashed with Argon2id on server)
          </p>
          <div className="flex items-center gap-2">
            <input
              type={showKey ? "text" : "password"}
              readOnly
              value={createdSecret}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 font-mono text-xs text-indigo-300 focus:outline-none"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="p-2 rounded-xl glass-panel text-slate-400 hover:text-slate-200"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Copied!" : "Copy Key"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Customer API Secret Keys */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Key className="w-4 h-4 text-indigo-400" />
          <span>Customer App Secret Keys</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 border-b border-slate-800 bg-slate-900/40">
              <tr>
                <th className="py-2.5 px-3">Key Name</th>
                <th className="py-2.5 px-3">Public Key (`pk_live_...`)</th>
                <th className="py-2.5 px-3">Secret Key Hash</th>
                <th className="py-2.5 px-3">Environment</th>
                <th className="py-2.5 px-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300">
              <tr>
                <td className="py-3 px-3 font-semibold text-slate-200">Default Dev Key</td>
                <td className="py-3 px-3 font-mono text-[11px] text-indigo-300">pk_live_default_key_01</td>
                <td className="py-3 px-3 font-mono text-[11px] text-slate-500">$argon2id$v=19$m=65536...</td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 text-[10px] font-medium border border-indigo-500/20">
                    Production
                  </span>
                </td>
                <td className="py-3 px-3 text-slate-400">Aug 20, 2026</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Encrypted AI Provider API Keys */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>AI Provider API Keys (AES-256-GCM Encrypted)</span>
          </h2>
          <p className="text-xs text-slate-400">Supply your own AI Studio / OpenAI API keys for direct execution</p>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl glass-panel border border-slate-800 space-y-2">
            <label className="text-xs font-semibold text-slate-200">Google Gemini API Key</label>
            <input
              type="password"
              value={providerKeys.gemini}
              onChange={(e) => setProviderKeys({ ...providerKeys, gemini: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          <div className="p-4 rounded-xl glass-panel border border-slate-800 space-y-2">
            <label className="text-xs font-semibold text-slate-200">OpenAI API Key</label>
            <input
              type="password"
              value={providerKeys.openai}
              onChange={(e) => setProviderKeys({ ...providerKeys, openai: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
            />
          </div>
        </div>

        <button className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all">
          Save Encrypted Provider Keys
        </button>
      </div>
    </div>
  );
}
