"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Code2, Edit3, Layers, Plus, Sparkles, Trash2 } from "lucide-react";
import { fetchCallSpecs } from "@/lib/api-client";
import { CallSpec } from "@/lib/types";

export default function CallSpecsPage() {
  const [specs, setSpecs] = useState<CallSpec[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCallSpecs().then((data) => {
      setSpecs(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Callcraft API Specifications</h1>
          <p className="text-xs text-slate-400">Design dynamic response schemas, extraction prompts, and model rules</p>
        </div>
        <Link
          href="/specs/new/builder"
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Call Spec</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {specs.map((spec) => (
          <div key={spec.id} className="glass-panel glass-panel-hover p-6 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 text-[10px] font-semibold border border-indigo-500/20">
                  v{spec.activeVersionNumber} Active
                </span>
                <span className="text-[10px] text-slate-500 font-mono">{spec.slug}</span>
              </div>
              <h3 className="text-base font-bold text-slate-100">{spec.name}</h3>
              <p className="text-xs text-slate-400 line-clamp-2">{spec.description || "No description provided."}</p>
            </div>

            <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between">
              <Link
                href={`/specs/${spec.id}/builder`}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Open Visual Builder</span>
              </Link>
              <button className="text-slate-500 hover:text-rose-400 transition-colors p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
