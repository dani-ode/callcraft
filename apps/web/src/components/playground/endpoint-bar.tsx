"use client";

import { useState } from "react";
import { Check } from "lucide-react";

interface EndpointBarProps {
  endpointUrl: string;
}

export function EndpointBar({ endpointUrl }: EndpointBarProps) {
  const [urlCopied, setUrlCopied] = useState(false);

  const handleCopyEndpointUrl = () => {
    if (!endpointUrl) return;
    navigator.clipboard.writeText(endpointUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  return (
    <div className="bg-[#fdf9f3] dark:bg-slate-950 p-3 rounded-xl border border-[#edd6bb]/30 dark:border-slate-800">
      <div className="flex items-center gap-2">
        {/* Postman HTTP Method Badge */}
        <div className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-mono font-black text-xs shrink-0 flex items-center gap-1.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>POST</span>
        </div>

        {/* URL Display */}
        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 font-mono flex items-center justify-between gap-2 overflow-hidden">
          <span className="truncate select-all text-slate-800 dark:text-slate-200 font-semibold">
            {endpointUrl}
          </span>
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
            <span>Copy URL</span>
          )}
        </button>
      </div>
    </div>
  );
}
