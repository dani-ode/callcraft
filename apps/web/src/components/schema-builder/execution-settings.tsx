"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sliders, Bot, ShieldCheck, AlertTriangle, ExternalLink, Key } from "lucide-react";
import { fetchAiModels, AiModelItem } from "@/lib/api-client";

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
  const [dbModels, setDbModels] = useState<AiModelItem[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);

  useEffect(() => {
    fetchAiModels()
      .then((models) => {
        setDbModels(models);
        if (models.length > 0 && !selectedModel) {
          const defaultModel = models.find((m) => m.isDefault) || models[0];
          setSelectedModel(defaultModel.modelIdentifier);
        }
        setModelsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load dynamic AI models from DB:", err);
        setModelsLoading(false);
      });
  }, []);

  const groupedModels = dbModels.reduce((acc, model) => {
    const pName = model.providerName || "Other Providers";
    if (!acc[pName]) acc[pName] = [];
    acc[pName].push(model);
    return acc;
  }, {} as Record<string, AiModelItem[]>);

  return (
    <div className="p-4 space-y-5 text-slate-900 dark:text-slate-100 font-sans">
      <div className="flex items-center justify-between pb-3 border-b border-[#edd6bb]/20">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#e1b329]" />
          <span>Execution Configuration</span>
        </h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#e1b329]/15 text-[#e1b329] font-mono font-bold">
          LIVE ENGINE
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold opacity-90">Spec Name</label>
          <input
            type="text"
            value={specName}
            onChange={(e) => setSpecName(e.target.value)}
            className="w-full mt-1 glass-panel border border-[#edd6bb]/25 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#e1b329]"
            placeholder="e.g. Identity KTP Extractor"
          />
        </div>

        <div>
          <label className="text-xs font-semibold opacity-90">API Slug Identifier</label>
          <div className="flex items-center mt-1 glass-panel border border-[#edd6bb]/25 rounded-xl px-3 py-2 text-xs">
            <span className="opacity-40 font-mono text-[11px] select-none">X-CALL-SPEC-ID:&nbsp;</span>
            <input
              type="text"
              value={specSlug}
              onChange={(e) => setSpecSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              className="bg-transparent border-none p-0 focus:outline-none w-full font-mono text-xs text-[#e1b329] font-bold"
              placeholder="identity-ktp-extractor"
            />
          </div>
        </div>

        {/* Dynamic External API Key / Platform Credentials Toggle */}
        <div className="p-3.5 rounded-xl glass-panel border border-[#edd6bb]/20 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 cursor-pointer">
              <Key className="w-3.5 h-3.5 text-[#e1b329]" />
              <span>Allow Dynamic Header API Keys</span>
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

        {/* Provider Credential Status Indicator */}
        <div className="p-3 rounded-xl bg-[#fdfaf5] dark:bg-slate-900/60 border border-[#edd6bb]/30 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#e1b329]" />
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">AI Provider Binding</div>
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
            disabled={modelsLoading}
          >
            {modelsLoading ? (
              <option className="bg-slate-900">Memuat AI Models dari database...</option>
            ) : dbModels.length === 0 ? (
              <option className="bg-slate-900">Tidak ada AI model aktif di database</option>
            ) : (
              Object.entries(groupedModels).map(([providerName, modelList]) => (
                <optgroup key={providerName} label={providerName}>
                  {modelList.map((m) => (
                    <option key={m.id} value={m.modelIdentifier} className="bg-slate-900">
                      {m.name} ({m.modelIdentifier}) {m.isDefault ? "★ Default" : ""}
                    </option>
                  ))}
                </optgroup>
              ))
            )}
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
