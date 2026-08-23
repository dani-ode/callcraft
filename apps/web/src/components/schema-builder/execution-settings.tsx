"use client";

import Link from "next/link";
import { Sliders, Bot, ShieldCheck, AlertTriangle, ExternalLink, Key } from "lucide-react";

interface ExecutionSettingsProps {
  specName: string;
  setSpecName: (val: string) => void;
  specSlug: string;
  setSpecSlug: (val: string) => void;
  selectedModel: string;
  setSelectedModel: (val: string) => void;
  systemPrompt: string;
  setSystemPrompt: (val: string) => void;
  extractionPrompt: string;
  setExtractionPrompt: (val: string) => void;
  useExternalApiKey?: boolean;
  setUseExternalApiKey?: (val: boolean) => void;
  currentProviderStatus: { active: boolean; label: string };
}

export function ExecutionSettings({
  specName,
  setSpecName,
  specSlug,
  setSpecSlug,
  selectedModel,
  setSelectedModel,
  systemPrompt,
  setSystemPrompt,
  extractionPrompt,
  setExtractionPrompt,
  useExternalApiKey = true,
  setUseExternalApiKey,
  currentProviderStatus,
}: ExecutionSettingsProps) {
  return (
    <div className="space-y-5">
      <h3 className="text-sm font-bold flex items-center gap-2">
        <Sliders className="w-4 h-4 text-[#e1b329]" />
        <span>API & Model Configurations</span>
      </h3>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold opacity-90">Spec Name</label>
            <input
              type="text"
              value={specName}
              onChange={(e) => setSpecName(e.target.value)}
              className="w-full mt-1 glass-panel border border-[#edd6bb]/25 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#e1b329]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold opacity-90">API Slug</label>
            <input
              type="text"
              value={specSlug}
              onChange={(e) => setSpecSlug(e.target.value)}
              className="w-full mt-1 glass-panel border border-[#edd6bb]/25 rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#e1b329] focus:outline-none focus:border-[#e1b329]"
            />
          </div>
        </div>

        {/* External AI API Key Toggle Option */}
        <div className="p-4 rounded-xl glass-panel border border-[#edd6bb]/20 space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <label className="text-xs font-bold text-[#2c1d11] dark:text-[#edd6bb] flex items-center gap-1.5 cursor-pointer">
                <Key className="w-4 h-4 text-[#e1b329]" />
                <span>Izinkan External AI API Key</span>
              </label>
              <p className="text-[11px] opacity-75 leading-relaxed">
                Izinkan pemanggil API mengirimkan header <code className="font-mono text-[#e1b329]">X-AI-API-KEY</code> dan <code className="font-mono text-[#e1b329]">X-AI-MODEL-NAME</code> secara kustom saat memanggil request. Jika header tidak dikirimkan, API akan otomatis menggunakan model yang terhubung dengan Spec ini.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={useExternalApiKey}
              onClick={() => setUseExternalApiKey?.(!useExternalApiKey)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                useExternalApiKey ? "bg-[#e1b329]" : "bg-slate-700 dark:bg-slate-800"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow-lg ring-0 transition duration-200 ease-in-out ${
                  useExternalApiKey ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* AI Model Selector */}
        <div className="space-y-3 p-4 rounded-xl glass-panel border border-[#edd6bb]/20">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-[#e1b329]" />
              <span>Preferred Execution AI Model</span>
            </label>

            {/* Provider Key Status Badge */}
            {currentProviderStatus.active ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-500/25 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Key Configured</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Key Setup Required</span>
              </span>
            )}
          </div>

          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full glass-panel border border-[#edd6bb]/25 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#e1b329] bg-transparent"
          >
            <optgroup label="Google Gemini (Key Configured)">
              <option value="gemini-3.6-flash" className="bg-slate-900">Gemini 3.6 Flash (Default - Fast Vision & Tools)</option>
              <option value="gemini-3.5-flash" className="bg-slate-900">Gemini 3.5 Flash</option>
              <option value="gemini-3.5-flash-lite" className="bg-slate-900">Gemini 3.5 Flash Lite</option>
            </optgroup>
            <optgroup label="OpenAI (Key Configured)">
              <option value="gpt-5.6-luna" className="bg-slate-900">GPT-5.6 Luna (High Accuracy Reasoning)</option>
              <option value="gpt-5.6-terra" className="bg-slate-900">GPT-5.6 Terra</option>
              <option value="gpt-5.6-sol" className="bg-slate-900">GPT-5.6 Sol</option>
            </optgroup>
            <optgroup label="Anthropic Claude (Setup Required in API Keys menu)">
              <option value="claude-sonnet-5" className="bg-slate-900">Claude Sonnet 5</option>
              <option value="claude-opus-5" className="bg-slate-900">Claude Opus 5</option>
              <option value="claude-haiku-4.5" className="bg-slate-900">Claude Haiku 4.5</option>
            </optgroup>
            <optgroup label="Mistral AI (Setup Required in API Keys menu)">
              <option value="mistral-medium-3.5" className="bg-slate-900">Mistral Medium 3.5</option>
              <option value="mistral-small-4" className="bg-slate-900">Mistral Small 4</option>
            </optgroup>
            <optgroup label="DeepSeek & OCR (Setup Required in API Keys menu)">
              <option value="deepseek-vl2" className="bg-slate-900">DeepSeek VL2 (Multimodal Vision)</option>
              <option value="deepseek-v4-pro" className="bg-slate-900">DeepSeek V4 Pro</option>
            </optgroup>
          </select>

          <div className="pt-2 border-t border-[#edd6bb]/15 flex items-center justify-between text-[11px]">
            <span className="opacity-75">Manage, test, or update AI Provider API keys:</span>
            <Link
              href="/keys"
              className="text-[#e1b329] hover:underline font-bold flex items-center gap-1 transition-colors"
            >
              <span>API Credentials Menu</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold opacity-90">System Extraction Prompt (System Role)</label>
          <textarea
            rows={3}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full mt-1.5 glass-panel border border-[#edd6bb]/25 rounded-xl p-3 text-xs focus:outline-none focus:border-[#e1b329] leading-relaxed font-sans"
            placeholder="Base system prompt given to the AI model..."
          />
        </div>

        <div>
          <label className="text-xs font-semibold opacity-90 flex items-center justify-between">
            <span>Preset Extraction Directives (Additional Spec Prompt)</span>
            <span className="text-[10px] text-[#e1b329] font-bold">Appended to extraction instructions</span>
          </label>
          <textarea
            rows={3}
            value={extractionPrompt}
            onChange={(e) => setExtractionPrompt(e.target.value)}
            className="w-full mt-1.5 glass-panel border border-[#edd6bb]/25 rounded-xl p-3 text-xs focus:outline-none focus:border-[#e1b329] leading-relaxed font-sans"
            placeholder="Specific directives for this API spec..."
          />
        </div>
      </div>
    </div>
  );
}
