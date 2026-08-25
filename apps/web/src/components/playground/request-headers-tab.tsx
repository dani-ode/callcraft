"use client";

import { ApiCredential } from "@/lib/types";

interface RequestHeadersTabProps {
  specId: string;
  specSlug: string;
  publicKey: string;
  selectedKeyId: string;
  availableKeys: ApiCredential[];
  handleSelectCredential: (keyId: string) => void;
  useExternalApiKey?: boolean;
  isChecked: (key: string) => boolean;
  toggleCheck: (key: string) => void;
  aiModelName: string;
  setAiModelName: (m: string) => void;
  aiApiKey: string;
  setAiApiKey: (k: string) => void;
}

export function RequestHeadersTab({
  specId,
  specSlug,
  publicKey,
  selectedKeyId,
  availableKeys,
  handleSelectCredential,
  useExternalApiKey = true,
  isChecked,
  toggleCheck,
  aiModelName,
  setAiModelName,
  aiApiKey,
  setAiApiKey,
}: RequestHeadersTabProps) {
  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-[#fdf9f3] dark:bg-slate-950">
        {/* HEADER 1: Content-Type (Mandatory) */}
        <div className="flex items-center gap-2.5 py-2.5 px-3 border-b border-slate-200 dark:border-slate-800/60 text-xs">
          <div className="shrink-0">
            <input
              type="checkbox"
              checked={true}
              disabled={true}
              readOnly={true}
              className="rounded border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 text-[#e1b329] cursor-not-allowed opacity-80"
            />
          </div>
          <div className="w-4/12 shrink-0">
            <span className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs block truncate">
              Content-Type
            </span>
          </div>
          <div className="flex-1">
            <span className="px-2.5 py-1.5 rounded-lg bg-slate-200/60 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono text-xs block w-full truncate">
              application/json
            </span>
          </div>
        </div>

        {/* HEADER 2: X-CALL-SPEC-ID (Mandatory) */}
        <div className="flex items-center gap-2.5 py-2.5 px-3 border-b border-slate-200 dark:border-slate-800/60 text-xs">
          <div className="shrink-0">
            <input
              type="checkbox"
              checked={true}
              disabled={true}
              readOnly={true}
              className="rounded border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 text-[#e1b329] cursor-not-allowed opacity-80"
            />
          </div>
          <div className="w-4/12 shrink-0">
            <span className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs block truncate">
              X-CALL-SPEC-ID
            </span>
          </div>
          <div className="flex-1">
            <span className="px-2.5 py-1.5 rounded-lg bg-slate-200/60 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 text-indigo-700 dark:text-indigo-300 font-mono text-xs block w-full truncate">
              {specId || specSlug}
            </span>
          </div>
        </div>

        {/* HEADER 3: X-CALL-PUBLIC-KEY (Mandatory, split input display + dropdown selector) */}
        <div className="flex items-center gap-2.5 py-2.5 px-3 border-b border-slate-200 dark:border-slate-800/60 text-xs">
          <div className="shrink-0">
            <input
              type="checkbox"
              checked={true}
              disabled={true}
              readOnly={true}
              className="rounded border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 text-[#e1b329] cursor-not-allowed opacity-80"
              title="Header X-CALL-PUBLIC-KEY wajib"
            />
          </div>
          <div className="w-4/12 shrink-0">
            <span className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs block truncate">
              X-CALL-PUBLIC-KEY
            </span>
          </div>
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={publicKey}
              className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-indigo-700 dark:text-indigo-300 font-mono font-bold cursor-not-allowed select-all"
              placeholder="Pilih API Key..."
            />
            <select
              value={selectedKeyId}
              onChange={(e) => handleSelectCredential(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 font-semibold focus:outline-none focus:border-[#e1b329] shrink-0"
            >
              <option value="">-- Pilih API Key --</option>
              {availableKeys.map((keyObj) => (
                <option key={keyObj.id} value={keyObj.id}>
                  {keyObj.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* HEADER 4: X-AI-MODEL-NAME */}
        <div className={`flex items-center gap-2.5 py-2.5 px-3 border-b border-slate-200 dark:border-slate-800/60 text-xs transition-opacity ${!useExternalApiKey || isChecked("X-AI-MODEL-NAME") ? "opacity-100" : "opacity-45"}`}>
          <div className="shrink-0">
            <input
              type="checkbox"
              checked={!useExternalApiKey ? true : isChecked("X-AI-MODEL-NAME")}
              disabled={!useExternalApiKey}
              readOnly={!useExternalApiKey}
              onChange={() => useExternalApiKey && toggleCheck("X-AI-MODEL-NAME")}
              className={`rounded border-slate-300 dark:border-slate-700 text-[#e1b329] focus:ring-0 ${!useExternalApiKey ? "bg-slate-200 dark:bg-slate-800 cursor-not-allowed opacity-80" : "bg-white dark:bg-slate-900 cursor-pointer"}`}
            />
          </div>
          <div className="w-4/12 shrink-0">
            <span className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs block truncate">
              X-AI-MODEL-NAME
            </span>
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={aiModelName}
              readOnly={!useExternalApiKey}
              disabled={!useExternalApiKey || !isChecked("X-AI-MODEL-NAME")}
              onChange={(e) => useExternalApiKey && setAiModelName(e.target.value)}
              className={`w-full border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-indigo-700 dark:text-indigo-300 font-mono focus:outline-none focus:border-[#e1b329] ${!useExternalApiKey
                ? "bg-slate-100 dark:bg-slate-900/60 cursor-not-allowed opacity-80 select-all"
                : isChecked("X-AI-MODEL-NAME")
                  ? "bg-white dark:bg-slate-900"
                  : "bg-slate-100/60 dark:bg-slate-900/40 opacity-50 cursor-not-allowed"
                }`}
              placeholder="e.g. gemini-1.5-flash"
            />
          </div>
        </div>

        {/* HEADER 5: X-AI-API-KEY */}
        <div className={`flex items-center gap-2.5 py-2.5 px-3 text-xs transition-opacity ${!useExternalApiKey || isChecked("X-AI-API-KEY") ? "opacity-100" : "opacity-45"}`}>
          <div className="shrink-0">
            <input
              type="checkbox"
              checked={!useExternalApiKey ? true : isChecked("X-AI-API-KEY")}
              disabled={!useExternalApiKey}
              readOnly={!useExternalApiKey}
              onChange={() => useExternalApiKey && toggleCheck("X-AI-API-KEY")}
              className={`rounded border-slate-300 dark:border-slate-700 text-[#e1b329] focus:ring-0 ${!useExternalApiKey ? "bg-slate-200 dark:bg-slate-800 cursor-not-allowed opacity-80" : "bg-white dark:bg-slate-900 cursor-pointer"}`}
            />
          </div>
          <div className="w-4/12 shrink-0">
            <span className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs block truncate">
              X-AI-API-KEY
            </span>
          </div>
          <div className="flex-1">
            <input
              type="password"
              value={aiApiKey}
              readOnly={!useExternalApiKey}
              disabled={!useExternalApiKey || !isChecked("X-AI-API-KEY")}
              onChange={(e) => useExternalApiKey && setAiApiKey(e.target.value)}
              className={`w-full border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-300 font-mono focus:outline-none focus:border-[#e1b329] ${!useExternalApiKey
                ? "bg-slate-100 dark:bg-slate-900/60 cursor-not-allowed opacity-80"
                : isChecked("X-AI-API-KEY")
                  ? "bg-white dark:bg-slate-900"
                  : "bg-slate-100/60 dark:bg-slate-900/40 opacity-50 cursor-not-allowed"
                }`}
              placeholder="AI Provider Key..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
