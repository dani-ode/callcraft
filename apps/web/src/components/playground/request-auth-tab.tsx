"use client";

import { ShieldCheck } from "lucide-react";

interface RequestAuthTabProps {
  apiKey: string;
  setApiKey: (key: string) => void;
}

export function RequestAuthTab({ apiKey, setApiKey }: RequestAuthTabProps) {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="p-3 rounded-xl bg-[#fdf9f3] dark:bg-slate-950 border border-[#edd6bb]/30 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Authentication Type</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
            Bearer Token
          </span>
        </div>

        {/* Auth Credentials KV Table */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5 py-2.5 px-3 text-xs">
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
                Bearer Token
              </span>
            </div>
            <div className="flex-1">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-indigo-700 dark:text-indigo-300 font-mono font-bold focus:outline-none focus:border-[#e1b329]"
                placeholder="Masukkan Bearer Secret Key (call_sk_...)"
              />
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-600 dark:text-slate-400">
          Token <code className="text-indigo-700 dark:text-indigo-400 font-mono">Authorization: Bearer call_sk_...</code> diverifikasi oleh Callcraft Gateway pada setiap HTTP POST request.
        </p>
      </div>
    </div>
  );
}
