"use client";

import { useEffect, useState } from "react";
import { Bot, CheckCircle2, ShieldCheck, Sparkles, Sliders, Loader2 } from "lucide-react";
import { fetchAiModels, AiModelItem } from "@/lib/api-client";

export default function AdminModelsPage() {
  const [aiModels, setAiModels] = useState<AiModelItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAiModels()
      .then((data) => {
        setAiModels(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch admin models:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Bot className="w-6 h-6 text-purple-400" />
            <span>AI Models System Taxonomy Registry ({aiModels.length} Models)</span>
          </h1>
          <p className="text-xs text-slate-400">Master registry of multimodal vision, OCR engines, and tool-calling agent models</p>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 className="text-sm font-bold text-slate-100">Registered AI Models Taxonomy</h2>
          <span className="text-xs text-purple-300 font-mono">{aiModels.length} Models Active</span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
              <span>Memuat AI Models dari database...</span>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 border-b border-slate-800 bg-slate-900/40">
                <tr>
                  <th className="py-2.5 px-3">Model Code Identifier</th>
                  <th className="py-2.5 px-3">Display Name</th>
                  <th className="py-2.5 px-3">AI Provider</th>
                  <th className="py-2.5 px-3">Capability</th>
                  <th className="py-2.5 px-3">Vision Input</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                {aiModels.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-indigo-300">
                      {m.modelIdentifier} {m.isDefault ? "★" : ""}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-200">{m.name}</td>
                    <td className="py-3 px-3 text-slate-300">{m.providerName}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-semibold">
                        {m.supportsToolCalling ? "Tool Calling & Structured JSON" : "Structured Output"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {m.supportsImage ? (
                        <span className="text-emerald-400 font-semibold text-[11px]">Vision Supported</span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Text Only</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                        {m.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
