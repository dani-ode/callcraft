"use client";

import { useState } from "react";
import { Bot, CheckCircle2, ShieldCheck, Sparkles, Sliders } from "lucide-react";

export default function AdminModelsPage() {
  const [aiModels] = useState([
    // Tool Calling / Agent
    { code: "gpt-5.6-luna", name: "GPT-5.6 Luna", provider: "OpenAI", category: "Tool Calling / Agent", vision: true, status: "Active" },
    { code: "gpt-5.6-terra", name: "GPT-5.6 Terra", provider: "OpenAI", category: "Tool Calling / Agent", vision: true, status: "Active" },
    { code: "gpt-5.6-sol", name: "GPT-5.6 Sol", provider: "OpenAI", category: "Tool Calling / Agent", vision: true, status: "Active" },
    { code: "gemini-3.6-flash", name: "Gemini 3.6 Flash", provider: "Google Gemini", category: "Tool Calling / Agent", vision: true, status: "Active" },
    { code: "gemini-3.5-flash", name: "Gemini 3.5 Flash", provider: "Google Gemini", category: "Tool Calling / Agent", vision: true, status: "Active" },
    { code: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite", provider: "Google Gemini", category: "Tool Calling / Agent", vision: true, status: "Active" },
    { code: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite", provider: "Google Gemini", category: "Tool Calling / Agent", vision: true, status: "Active" },
    { code: "claude-opus-5", name: "Claude Opus 5", provider: "Anthropic", category: "Tool Calling / Agent", vision: true, status: "Active" },
    { code: "claude-sonnet-5", name: "Claude Sonnet 5", provider: "Anthropic", category: "Tool Calling / Agent", vision: true, status: "Active" },
    { code: "claude-haiku-4.5", name: "Claude Haiku 4.5", provider: "Anthropic", category: "Tool Calling / Agent", vision: true, status: "Active" },
    { code: "mistral-medium-3.5", name: "Mistral Medium 3.5", provider: "Mistral AI", category: "Tool Calling / Agent", vision: true, status: "Active" },
    { code: "mistral-small-4", name: "Mistral Small 4", provider: "Mistral AI", category: "Tool Calling / Agent", vision: true, status: "Active" },
    { code: "deepseek-v4-pro", name: "DeepSeek V4 Pro", provider: "DeepSeek", category: "Tool Calling / Agent", vision: false, status: "Active" },
    { code: "deepseek-v4-flash", name: "DeepSeek V4 Flash", provider: "DeepSeek", category: "Tool Calling / Agent", vision: false, status: "Active" },
    
    // OCR
    { code: "ocr-4.1", name: "OCR 4.1 Precision", provider: "Callcraft OCR Engine", category: "OCR Text Extraction", vision: true, status: "Active" },
    { code: "deepseek-ocr", name: "DeepSeek OCR", provider: "DeepSeek", category: "OCR Text Extraction", vision: true, status: "Active" },
    
    // Vision + Tool Calling
    { code: "deepseek-vl2", name: "DeepSeek VL2", provider: "DeepSeek", category: "Vision + Tool Calling", vision: true, status: "Active" },
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Bot className="w-6 h-6 text-purple-400" />
            <span>AI Models System Taxonomy Registry (17 Models)</span>
          </h1>
          <p className="text-xs text-slate-400">Master registry of multimodal vision, OCR engines, and tool-calling agent models</p>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 className="text-sm font-bold text-slate-100">Registered AI Models Taxonomy</h2>
          <span className="text-xs text-purple-300 font-mono">17 Models Active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 border-b border-slate-800 bg-slate-900/40">
              <tr>
                <th className="py-2.5 px-3">Model Code Identifier</th>
                <th className="py-2.5 px-3">Display Name</th>
                <th className="py-2.5 px-3">AI Provider</th>
                <th className="py-2.5 px-3">Capability Category</th>
                <th className="py-2.5 px-3">Vision Input</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300">
              {aiModels.map((m, idx) => (
                <tr key={idx} className="hover:bg-slate-900/30 transition-colors">
                  <td className="py-3 px-3 font-mono font-semibold text-indigo-300">{m.code}</td>
                  <td className="py-3 px-3 font-semibold text-slate-200">{m.name}</td>
                  <td className="py-3 px-3 text-slate-300">{m.provider}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-semibold">
                      {m.category}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {m.vision ? (
                      <span className="text-emerald-400 font-semibold text-[11px]">Supported</span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Text Only</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
