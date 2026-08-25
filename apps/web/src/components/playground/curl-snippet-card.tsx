"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";
import { Terminal, Check, Copy } from "lucide-react";

interface CurlSnippetCardProps {
  maskedCurlCommand: string;
  displayCurlCommand: string;
}

export function CurlSnippetCard({ maskedCurlCommand, displayCurlCommand }: CurlSnippetCardProps) {
  const [curlCopied, setCurlCopied] = useState(false);

  const handleCopyCurlCommand = () => {
    if (!maskedCurlCommand) return;
    navigator.clipboard.writeText(maskedCurlCommand);
    setCurlCopied(true);
    setTimeout(() => setCurlCopied(false), 2000);
  };

  return (
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
              Perintah cURL otomatis ter-update secara dinamis.
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
  );
}
