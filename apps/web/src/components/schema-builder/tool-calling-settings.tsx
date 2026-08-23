"use client";

import React, { useState } from "react";
import { Wrench, Plus, Trash2, Sliders, FileText, Image as ImageIcon, Bot, Check, Shield } from "lucide-react";
import { ToolCallingConfig, ToolDefinition } from "@/lib/types";

interface ToolCallingSettingsProps {
  toolsConfig: ToolCallingConfig;
  setToolsConfig: React.Dispatch<React.SetStateAction<ToolCallingConfig>>;
}

export function ToolCallingSettings({ toolsConfig, setToolsConfig }: ToolCallingSettingsProps) {
  const toggleEnabled = () => {
    setToolsConfig((prev) => ({
      ...prev,
      enabled: !prev.enabled,
    }));
  };

  const setToolChoice = (choice: "auto" | "required" | "none") => {
    setToolsConfig((prev) => ({
      ...prev,
      toolChoice: choice,
    }));
  };

  const addTool = () => {
    const newTool: ToolDefinition = {
      name: `tool_action_${(toolsConfig.tools?.length || 0) + 1}`,
      description: "Perform structured tool execution or data retrieval action",
      agentRole: "data_retriever",
      toolChoice: "auto",
      context: {
        textContext: "Input text context or instructions for this tool action",
        includeImageContext: true,
      },
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query or input parameter" },
        },
        required: ["query"],
      },
    };

    setToolsConfig((prev) => ({
      ...prev,
      tools: [...(prev.tools || []), newTool],
    }));
  };

  const removeTool = (index: number) => {
    setToolsConfig((prev) => ({
      ...prev,
      tools: (prev.tools || []).filter((_, idx) => idx !== index),
    }));
  };

  const updateTool = (index: number, updated: Partial<ToolDefinition>) => {
    setToolsConfig((prev) => {
      const updatedTools = [...(prev.tools || [])];
      updatedTools[index] = { ...updatedTools[index], ...updated };
      return { ...prev, tools: updatedTools };
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl glass-panel border border-[#edd6bb]/25 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-[#e1b329]" />
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              Tool Calling & Multi-Agent Execution Configuration
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            Definisikan daftar alat (*tools*), peran *agent*, serta konteks masukan (teks dan gambar) yang dapat dipanggil oleh AI Agent saat mengeksekusi request ini.
          </p>
        </div>

        {/* Global Toggle switch */}
        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Tool Calling Status</span>
          <button
            type="button"
            role="switch"
            aria-checked={toolsConfig.enabled}
            onClick={toggleEnabled}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
              toolsConfig.enabled ? "bg-[#e1b329]" : "bg-slate-700 dark:bg-slate-800"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow-lg ring-0 transition duration-200 ease-in-out ${
                toolsConfig.enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {toolsConfig.enabled && (
        <div className="space-y-6">
          {/* Tool Choice Settings */}
          <div className="p-4 rounded-xl glass-panel border border-[#edd6bb]/20 space-y-3">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#e1b329]" />
              <span>Tool Choice Strategy</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {(["auto", "required", "none"] as const).map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setToolChoice(choice)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    toolsConfig.toolChoice === choice
                      ? "bg-[#e1b329] text-slate-950 border-[#e1b329] shadow-sm"
                      : "glass-panel text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  {choice === "auto" && "Auto (AI Decides)"}
                  {choice === "required" && "Required (Must Call Tool)"}
                  {choice === "none" && "None (Disable Tool Invocation)"}
                </button>
              ))}
            </div>
          </div>

          {/* Tools List Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Registered Tools ({toolsConfig.tools?.length || 0})
              </h4>
              <button
                type="button"
                onClick={addTool}
                className="px-3 py-1.5 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 font-bold text-xs shadow-md inline-flex items-center gap-1.5 transition-all transform active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Tool Baru</span>
              </button>
            </div>

            {(!toolsConfig.tools || toolsConfig.tools.length === 0) && (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 space-y-2">
                <Wrench className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Belum Ada Tool Terdaftar</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Klik &quot;Tambah Tool Baru&quot; untuk mendaftarkan fungsi otomatisasi (misal: vector search, OCR parser, webhook call).
                </p>
              </div>
            )}

            {toolsConfig.tools?.map((tool, idx) => (
              <div key={idx} className="p-4 rounded-xl glass-panel border border-[#edd6bb]/25 space-y-4 shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#e1b329]/15 text-[#e1b329] flex items-center justify-center text-xs font-mono font-bold">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={tool.name}
                      onChange={(e) => updateTool(idx, { name: e.target.value })}
                      className="font-mono text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-amber-500 focus:outline-none focus:border-[#e1b329]"
                      placeholder="tool_name..."
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeTool(idx)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-all"
                    title="Hapus Tool ini"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tool Description */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Deskripsi Tool & Tujuan
                    </label>
                    <input
                      type="text"
                      value={tool.description}
                      onChange={(e) => updateTool(idx, { description: e.target.value })}
                      className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#e1b329]"
                      placeholder="Jelaskan fungsi tool untuk AI Agent..."
                    />
                  </div>

                  {/* Agent Role */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5 text-[#e1b329]" />
                      <span>Agent Role</span>
                    </label>
                    <input
                      type="text"
                      value={tool.agentRole || "data_retriever"}
                      onChange={(e) => updateTool(idx, { agentRole: e.target.value })}
                      className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#e1b329]"
                      placeholder="e.g. vision_parser, data_retriever, system_integrator"
                    />
                  </div>
                </div>

                {/* Context Settings (Text Context & Image Context) */}
                <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#e1b329]" />
                    <span>Context Inputs (Text & Image Context)</span>
                  </span>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block mb-1">
                        Text Context / System Instruction Override
                      </label>
                      <textarea
                        rows={2}
                        value={tool.context?.textContext || ""}
                        onChange={(e) =>
                          updateTool(idx, {
                            context: { ...(tool.context || {}), textContext: e.target.value },
                          })
                        }
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#e1b329]"
                        placeholder="Contextual instructions for this tool..."
                      />
                    </div>

                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tool.context?.includeImageContext ?? true}
                        onChange={(e) =>
                          updateTool(idx, {
                            context: { ...(tool.context || {}), includeImageContext: e.target.checked },
                          })
                        }
                        className="rounded border-slate-300 text-[#e1b329] focus:ring-[#e1b329]"
                      />
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Sertakan Gambar/Dokumen Multimodal sebagai Konteks Tool</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
