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
        includeImageContext: false,
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

        {/* Mandatory Status Badge */}
        <div className="flex items-center gap-2 bg-amber-500/10 px-3.5 py-2 rounded-xl border border-amber-500/30 text-amber-500 text-xs font-bold shrink-0">
          <Shield className="w-4 h-4 text-[#e1b329]" />
          <span>Wajib (Mandatory Engine)</span>
        </div>
      </div>

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

                {/* Context Settings (Text Context & Multimodal Context Images Upload) */}
                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
                  <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <FileText className="w-4 h-4 text-[#e1b329]" />
                    <span>Multimodal Context & Instructions (Text & Reference Images)</span>
                  </span>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                        Text Context / System Instruction Override
                      </label>
                      <textarea
                        rows={2}
                        value={tool.context?.textContext || tool.textContext || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateTool(idx, {
                            textContext: val,
                            context: { ...(tool.context || {}), textContext: val },
                          });
                        }}
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#e1b329]"
                        placeholder="Contextual instructions or reference rules for this tool..."
                      />
                    </div>

                    {/* Multimodal Image Context Toggle Checkbox (Default: Unchecked / false) */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tool.context?.includeImageContext ?? tool.includeImageContext ?? false}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            updateTool(idx, {
                              includeImageContext: isChecked,
                              context: {
                                ...(tool.context || {}),
                                includeImageContext: isChecked,
                              },
                            });
                          }}
                          className="rounded border-slate-300 text-[#e1b329] focus:ring-[#e1b329]"
                        />
                        <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Sertakan Gambar/Dokumen Multimodal sebagai Konteks Tool ke AI (Default: Unchecked)</span>
                      </label>
                    </div>

                    {/* Multimodal Reference Images Manager */}
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <ImageIcon className="w-4 h-4 text-indigo-500" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Konteks Gambar / Dokumen Reference (Multimodal Context)
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold font-mono">
                            {((tool.context?.imagesContext || tool.imagesContext) || []).length} Gambar
                          </span>
                        </div>

                        {/* File Upload Input Button */}
                        <label className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] cursor-pointer flex items-center gap-1.5 transition-all shadow-sm active:scale-95">
                          <Plus className="w-3.5 h-3.5" />
                          <span>Upload File Gambar</span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            multiple
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              if (files.length === 0) return;

                              const readFiles = files.map(
                                (file) =>
                                  new Promise<string>((resolve) => {
                                    const reader = new FileReader();
                                    reader.onload = (evt) => resolve(evt.target?.result as string);
                                    reader.readAsDataURL(file);
                                  })
                              );

                              Promise.all(readFiles).then((base64List) => {
                                const current = tool.context?.imagesContext || tool.imagesContext || [];
                                const updatedList = [...current, ...base64List];
                                updateTool(idx, {
                                  imagesContext: updatedList,
                                  includeImageContext: true,
                                  context: {
                                    ...(tool.context || {}),
                                    includeImageContext: true,
                                    imagesContext: updatedList,
                                  },
                                });
                              });
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Unggah beberapa gambar atau contoh acuan dokumen referensi yang dijadikan konteks acuan spesifik saat tool ini dipanggil oleh AI.
                      </p>

                      {/* Image URL Direct Input */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          id={`url-input-${idx}`}
                          placeholder="Atau masukkan URL Gambar acuan (https://example.com/sample.png)..."
                          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#e1b329]"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const inputEl = e.currentTarget;
                              const val = inputEl.value.trim();
                              if (val) {
                                const current = tool.context?.imagesContext || tool.imagesContext || [];
                                const updatedList = [...current, val];
                                updateTool(idx, {
                                  imagesContext: updatedList,
                                  includeImageContext: true,
                                  context: {
                                    ...(tool.context || {}),
                                    includeImageContext: true,
                                    imagesContext: updatedList,
                                  },
                                });
                                inputEl.value = "";
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            const inputEl = (e.currentTarget.previousElementSibling as HTMLInputElement);
                            if (inputEl && inputEl.value.trim()) {
                              const val = inputEl.value.trim();
                              const current = tool.context?.imagesContext || tool.imagesContext || [];
                              const updatedList = [...current, val];
                              updateTool(idx, {
                                imagesContext: updatedList,
                                includeImageContext: true,
                                context: {
                                  ...(tool.context || {}),
                                  includeImageContext: true,
                                  imagesContext: updatedList,
                                },
                              });
                              inputEl.value = "";
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 shrink-0 border border-slate-300 dark:border-slate-700"
                        >
                          + Tambah URL
                        </button>
                      </div>

                      {/* Attached Context Images Gallery Grid */}
                      {((tool.context?.imagesContext || tool.imagesContext) || []).length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-2">
                          {((tool.context?.imagesContext || tool.imagesContext) || []).map((imgUrl, imgIdx) => (
                            <div
                              key={imgIdx}
                              className="relative group/img rounded-xl overflow-hidden border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm aspect-video flex items-center justify-center"
                            >
                              <img
                                src={imgUrl}
                                alt={`Reference Context #${imgIdx + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover/img:opacity-100 transition-all flex items-center justify-center p-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const current = tool.context?.imagesContext || tool.imagesContext || [];
                                    const updatedList = current.filter((_, i) => i !== imgIdx);
                                    updateTool(idx, {
                                      imagesContext: updatedList,
                                      context: {
                                        ...(tool.context || {}),
                                        imagesContext: updatedList,
                                      },
                                    });
                                  }}
                                  className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-all font-bold text-xs flex items-center gap-1 shadow-lg"
                                  title="Hapus gambar konteks ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Hapus</span>
                                </button>
                              </div>
                              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-slate-950/80 text-[9px] font-mono text-amber-400 font-bold">
                                #{imgIdx + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-800/80 text-center bg-white/40 dark:bg-slate-900/40">
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Belum ada gambar referensi konteks yang diunggah untuk Tool ini. Klik &quot;Upload File Gambar&quot; atau masukkan URL gambar acuan di atas.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
    </div>
  );
}
