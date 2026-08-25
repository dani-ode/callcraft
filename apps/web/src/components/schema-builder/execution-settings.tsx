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
  positivePrompt?: string;
  extractionPrompt: string;
  setExtractionPrompt: (val: string) => void;
  negativePrompt?: string;
  setNegativePrompt?: (val: string) => void;
  additionalPrompt?: string;
  setAdditionalPrompt?: (val: string) => void;
  allowAdditionalPrompt?: boolean;
  setAllowAdditionalPrompt?: (val: boolean) => void;
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
  positivePrompt,
  extractionPrompt,
  setExtractionPrompt,
  negativePrompt = "",
  setNegativePrompt,
  additionalPrompt = "",
  setAdditionalPrompt,
  allowAdditionalPrompt = true,
  setAllowAdditionalPrompt,
  useExternalApiKey = true,
  setUseExternalApiKey,
  currentProviderStatus,
}: ExecutionSettingsProps) {
  return (
    <div className="space-y-5">
      <h3 className="text-sm font-bold flex items-center gap-2">
        <Sliders className="w-4 h-4 text-[#e1b329]" />
        <span>Call Spec Config & AI Model</span>
      </h3>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold opacity-90">Spec Name</label>
          <input
            type="text"
            value={specName}
            onChange={(e) => setSpecName(e.target.value)}
            className="w-full mt-1 glass-panel border border-[#edd6bb]/25 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#e1b329]"
            placeholder="e.g. Identity Document Parser"
          />
        </div>

        <div>
          <label className="text-xs font-semibold opacity-90">API Endpoint Slug</label>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-mono opacity-60 shrink-0">/v1/call/</span>
            <input
              type="text"
              value={specSlug}
              onChange={(e) => setSpecSlug(e.target.value)}
              className="w-full glass-panel border border-[#edd6bb]/25 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#e1b329]"
              placeholder="ktp-parser"
            />
          </div>
        </div>

        {/* API Key Credentials Option Toggle */}
        <div className="p-3.5 rounded-xl glass-panel border border-[#edd6bb]/20 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 cursor-pointer">
              <Key className="w-3.5 h-3.5 text-[#e1b329]" />
              <span>Allow Caller API Key & Model Override</span>
            </label>
            <input
              type="checkbox"
              checked={useExternalApiKey}
              onChange={(e) => setUseExternalApiKey?.(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 text-[#e1b329] focus:ring-[#e1b329] bg-slate-900 cursor-pointer"
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            {useExternalApiKey ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                ✓ Callers can pass their own <code className="font-mono">X-AI-API-KEY</code> & <code className="font-mono">X-AI-MODEL-NAME</code> headers dynamically.
              </span>
            ) : (
              <span className="text-amber-800 dark:text-amber-300 font-medium">
                🔒 Execution will strictly use user&apos;s saved API Credentials in Callcraft.
              </span>
            )}
          </p>
        </div>

        {/* Request Additional Prompt Toggle */}
        <div className="p-3.5 rounded-xl glass-panel border border-[#edd6bb]/20 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 cursor-pointer">
              <Bot className="w-3.5 h-3.5 text-[#e1b329]" />
              <span>Request Additional Prompt (User Instruction)</span>
            </label>
            <input
              type="checkbox"
              checked={allowAdditionalPrompt}
              onChange={(e) => setAllowAdditionalPrompt?.(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 text-[#e1b329] focus:ring-[#e1b329] bg-slate-900 cursor-pointer"
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            {allowAdditionalPrompt ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                ✓ Aktif: Pemanggil API dapat menyertakan bidang <code className="font-mono">&quot;prompt&quot;</code> sebagai instruksi tambahan per request.
              </span>
            ) : (
              <span className="text-rose-600 dark:text-rose-400 font-medium">
                🚫 Nonaktif: Bidang instruksi pengguna tidak diaktifkan pada spesifikasi ini.
              </span>
            )}
          </p>
        </div>

        {/* Provider Credential Status Indicator */}
        <div className="p-3 rounded-xl bg-[#fdfaf5] dark:bg-slate-900/60 border border-[#edd6bb]/30 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#e1b329]" />
            <div>
              <span className="text-xs font-semibold block text-slate-800 dark:text-slate-200">
                Primary Provider: Gemini AI
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                {currentProviderStatus.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="w-3 h-3" />
            <span>Ready</span>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold opacity-90">Preferred External Model</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full mt-1 glass-panel border border-[#edd6bb]/25 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#e1b329]"
          >
            <optgroup label="Google Gemini (Recommended)">
              <option value="gemini-3.6-flash" className="bg-slate-900">Gemini 3.6 Flash (Fastest Structured OCR)</option>
              <option value="gemini-1.5-flash" className="bg-slate-900">Gemini 1.5 Flash (Default)</option>
              <option value="gemini-1.5-pro" className="bg-slate-900">Gemini 1.5 Pro (Complex Reasoning)</option>
              <option value="gemini-2.0-flash-exp" className="bg-slate-900">Gemini 2.0 Flash Experimental</option>
            </optgroup>
            <optgroup label="OpenAI (Setup Required in API Keys menu)">
              <option value="gpt-4o-mini" className="bg-slate-900">GPT-4o Mini (Cost efficient)</option>
              <option value="gpt-4o" className="bg-slate-900">GPT-4o (Vision Multimodal)</option>
            </optgroup>
            <optgroup label="Anthropic Claude (Setup Required in API Keys menu)">
              <option value="claude-3-5-sonnet-20241022" className="bg-slate-900">Claude 3.5 Sonnet</option>
              <option value="claude-3-haiku-20240307" className="bg-slate-900">Claude 3 Haiku</option>
            </optgroup>
            <optgroup label="Mistral AI (Setup Required in API Keys menu)">
              <option value="pixtral-12b" className="bg-slate-900">Pixtral 12B (Vision OCR)</option>
              <option value="mistral-small-4" className="bg-slate-900">Mistral Small 4</option>
            </optgroup>
            <optgroup label="DeepSeek & OCR (Setup Required in API Keys menu)">
              <option value="deepseek-vl2" className="bg-slate-900">DeepSeek VL2 (Multimodal Vision)</option>
              <option value="deepseek-v4-pro" className="bg-slate-900">DeepSeek V4 Pro</option>
            </optgroup>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold opacity-90 flex items-center justify-between">
            <span>Positive Extraction Prompt</span>
            <span className="text-[10px] text-[#e1b329] font-bold">What AI SHOULD extract</span>
          </label>
          <textarea
            rows={3}
            value={positivePrompt || extractionPrompt}
            onChange={(e) => setExtractionPrompt(e.target.value)}
            className="w-full mt-1.5 glass-panel border border-[#edd6bb]/25 rounded-xl p-3 text-xs focus:outline-none focus:border-[#e1b329] leading-relaxed font-sans"
            placeholder="Specific extraction instructions for this API spec..."
          />
        </div>

        {allowAdditionalPrompt && (
          <div>
            <label className="text-xs font-semibold opacity-90 flex items-center justify-between text-sky-600 dark:text-sky-400">
              <span>Default Additional Prompt (User Instruction)</span>
              <span className="text-[10px] font-bold">User Override Instructions</span>
            </label>
            <textarea
              rows={2}
              value={additionalPrompt}
              onChange={(e) => setAdditionalPrompt?.(e.target.value)}
              className="w-full mt-1.5 glass-panel border border-sky-500/25 rounded-xl p-3 text-xs focus:outline-none focus:border-sky-500 leading-relaxed font-sans"
              placeholder="Opsional: Instruksi tambahan dari user..."
            />
          </div>
        )}

        <div>
          <label className="text-xs font-semibold opacity-90 flex items-center justify-between text-red-600 dark:text-red-400">
            <span>Negative Prompt (Constraints & Prohibitions)</span>
            <span className="text-[10px] font-bold">What AI MUST AVOID</span>
          </label>
          <textarea
            rows={3}
            value={negativePrompt}
            onChange={(e) => setNegativePrompt?.(e.target.value)}
            className="w-full mt-1.5 glass-panel border border-red-500/25 rounded-xl p-3 text-xs focus:outline-none focus:border-red-500 leading-relaxed font-sans"
            placeholder="Prohibitions, fallback constraints, invalid document rules..."
          />
        </div>
      </div>
    </div>
  );
}
