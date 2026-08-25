"use client";

import Editor from "@monaco-editor/react";
import { FileText, Sliders, Code, Upload } from "lucide-react";
import { SchemaField } from "@/components/schema-builder/types";

interface RequestBodyTabProps {
  bodyMode: "form" | "json";
  setBodyMode: (mode: "form" | "json") => void;
  isChecked: (key: string) => boolean;
  toggleCheck: (key: string) => void;
  allowAdditionalPrompt?: boolean;
  prompt: string;
  setPrompt: (p: string) => void;
  additionalPrompt?: string;
  requestFields: SchemaField[];
  extraInputs: Record<string, any>;
  handleFieldChange: (fieldName: string, value: any) => void;
  displayPayloadString: string;
}

export function RequestBodyTab({
  bodyMode,
  setBodyMode,
  isChecked,
  toggleCheck,
  allowAdditionalPrompt,
  prompt,
  setPrompt,
  additionalPrompt,
  requestFields,
  extraInputs,
  handleFieldChange,
  displayPayloadString,
}: RequestBodyTabProps) {
  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* Sub-tabs: Form (Key-Value) vs Raw JSON Preview */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setBodyMode("form")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              bodyMode === "form"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Form Data (Key-Value)</span>
          </button>

          <button
            type="button"
            onClick={() => setBodyMode("json")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              bodyMode === "json"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Raw JSON Payload</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {bodyMode === "form" ? "Centang parameter yang ingin disertakan" : "Preview JSON payload yang akan dikirim"}
        </span>
      </div>

      {/* BODY MODE 1: Key-Value Form Table */}
      {bodyMode === "form" ? (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-[#fdf9f3] dark:bg-slate-950">
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800/60">
            {/* ROW 1: Prompt Input (if allowed by spec) */}
            {allowAdditionalPrompt !== false && (
              <div className={`flex items-start gap-2.5 py-2.5 px-3 text-xs transition-opacity ${isChecked("prompt") ? "opacity-100" : "opacity-45"}`}>
                <div className="pt-1.5 shrink-0">
                  <input
                    type="checkbox"
                    checked={isChecked("prompt")}
                    onChange={() => toggleCheck("prompt")}
                    className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#e1b329] focus:ring-0 cursor-pointer"
                  />
                </div>

                <div className="w-4/12 shrink-0">
                  <span className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs block truncate">
                    prompt
                  </span>
                </div>

                <div className="flex-1">
                  <textarea
                    rows={2}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={!isChecked("prompt")}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#e1b329] disabled:opacity-50"
                    placeholder={additionalPrompt}
                  />
                </div>
              </div>
            )}

            {/* Dynamic Request Schema Parameters */}
            {requestFields
              .filter((field) => field.name !== "prompt")
              .map((field) => {
                const active = isChecked(field.name);
                const isRequired = Boolean(field.required);

                if (field.type === "file") {
                  const val = extraInputs[field.name] || "";
                  return (
                    <div key={field.id} className={`flex items-start gap-2.5 py-2.5 px-3 text-xs transition-opacity ${active ? "opacity-100" : "opacity-45"}`}>
                      <div className="pt-1.5 shrink-0">
                        <input
                          type="checkbox"
                          checked={isRequired ? true : active}
                          disabled={isRequired}
                          onChange={() => !isRequired && toggleCheck(field.name)}
                          className={`rounded border-slate-300 dark:border-slate-700 text-[#e1b329] focus:ring-0 ${isRequired ? "bg-slate-200 dark:bg-slate-800 cursor-not-allowed opacity-80" : "bg-white dark:bg-slate-900 cursor-pointer"}`}
                        />
                      </div>

                      <div className="w-4/12 shrink-0">
                        <span className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs block truncate">
                          {field.name}
                        </span>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono block mt-0.5">
                          file ({field.allowedExtensions})
                        </span>
                      </div>

                      <div className="flex-1 space-y-1.5">
                        {typeof val === "string" && val.startsWith("data:") ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                              <div className="flex items-center gap-2 truncate">
                                <FileText className="w-4 h-4 shrink-0" />
                                <span className="text-xs font-mono font-medium truncate">
                                  {val.split(";")[0]} (Base64 Attached)
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleFieldChange(field.name, "")}
                                className="text-xs text-rose-500 hover:text-rose-600 font-bold ml-2 shrink-0 underline"
                              >
                                Remove
                              </button>
                            </div>
                            {val.startsWith("data:image/") && (
                              <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 max-h-28 bg-white dark:bg-slate-900 relative p-1">
                                <img
                                  src={val}
                                  alt="File preview"
                                  className="w-full h-28 object-contain rounded"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={val || ""}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 font-mono focus:outline-none focus:border-[#e1b329]"
                              placeholder={`URL or Upload for ${field.name}`}
                            />
                            <label className="px-2.5 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-[10px] font-bold cursor-pointer flex items-center gap-1 shrink-0">
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload</span>
                              <input
                                type="file"
                                accept={field.allowedExtensions ? field.allowedExtensions.split(",").map(e => `.${e.trim().replace(/^\./, "")}`).join(",") : "image/*,.pdf"}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                      if (typeof reader.result === "string") {
                                        handleFieldChange(field.name, reader.result);
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={field.id} className={`flex items-start gap-2.5 py-2.5 px-3 text-xs transition-opacity ${active ? "opacity-100" : "opacity-45"}`}>
                    <div className="pt-1.5 shrink-0">
                      <input
                        type="checkbox"
                        checked={isRequired ? true : active}
                        disabled={isRequired}
                        onChange={() => !isRequired && toggleCheck(field.name)}
                        className={`rounded border-slate-300 dark:border-slate-700 text-[#e1b329] focus:ring-0 ${isRequired ? "bg-slate-200 dark:bg-slate-800 cursor-not-allowed opacity-80" : "bg-white dark:bg-slate-900 cursor-pointer"}`}
                      />
                    </div>

                    <div className="w-4/12 shrink-0">
                      <span className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs block truncate">
                        {field.name}
                      </span>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono block mt-0.5">{field.type}</span>
                    </div>

                    <div className="flex-1">
                      {field.type === "boolean" ? (
                        <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={Boolean(extraInputs[field.name])}
                            disabled={!active}
                            onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                            className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#e1b329] focus:ring-0"
                          />
                          <span>{extraInputs[field.name] ? "True" : "False"}</span>
                        </label>
                      ) : field.type === "enum" && field.enumValues ? (
                        <select
                          value={extraInputs[field.name] || ""}
                          disabled={!active}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:border-[#e1b329] disabled:opacity-50"
                        >
                          <option value="">-- Select {field.name} --</option>
                          {field.enumValues.split(",").map((opt, i) => {
                            const trimmed = opt.trim();
                            return (
                              <option key={i} value={trimmed}>
                                {trimmed}
                              </option>
                            );
                          })}
                        </select>
                      ) : field.type === "number" || field.type === "integer" ? (
                        <input
                          type="number"
                          value={extraInputs[field.name] ?? ""}
                          disabled={!active}
                          onChange={(e) => handleFieldChange(field.name, e.target.valueAsNumber || e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:border-[#e1b329] disabled:opacity-50"
                          placeholder={`Value for ${field.name}`}
                        />
                      ) : (
                        <input
                          type="text"
                          value={extraInputs[field.name] || ""}
                          disabled={!active}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:border-[#e1b329] disabled:opacity-50"
                          placeholder={`Value for ${field.name}`}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ) : (
        /* BODY MODE 2: Raw JSON Preview Monaco Editor */
        <div className="h-64 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner bg-[#120e0b] dark:bg-slate-950">
          <Editor
            height="100%"
            language="json"
            value={displayPayloadString}
            theme="vs-dark"
            options={{
              readOnly: true,
              domReadOnly: true,
              minimap: { enabled: false },
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 10, bottom: 10 },
              contextmenu: false,
            }}
          />
        </div>
      )}
    </div>
  );
}
