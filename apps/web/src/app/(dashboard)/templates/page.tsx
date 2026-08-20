"use client";

import { useEffect, useState } from "react";
import { Download, Layers, ShieldCheck, Sparkles } from "lucide-react";
import { fetchTemplates } from "@/lib/api-client";
import { Template } from "@/lib/types";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    fetchTemplates().then(setTemplates);
  }, []);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Template Marketplace</h1>
        <p className="text-xs text-slate-400">One-click pre-built Callcraft blueprints for instant extraction</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((tmpl) => (
          <div key={tmpl.id} className="glass-panel glass-panel-hover p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 text-[10px] font-semibold border border-purple-500/20">
                  {tmpl.category}
                </span>
                {tmpl.isOfficial && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Official
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-100">{tmpl.name}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{tmpl.description}</p>
            </div>

            <div className="pt-4 border-t border-slate-800/60">
              <button className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all">
                <Download className="w-4 h-4" />
                <span>Install Blueprint</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
