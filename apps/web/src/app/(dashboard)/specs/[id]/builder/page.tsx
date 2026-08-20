"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Sparkles, Plus, Code, Layers } from "lucide-react";

export default function VisualSchemaBuilderPage({ params }: { params: { id: string } }) {
  const [specName, setSpecName] = useState("Indonesian KTP Parser");
  const [specSlug, setSpecSlug] = useState("ktp-parser");
  const [fields, setFields] = useState([
    { name: "nik", type: "string", required: true, description: "16-digit National Identification Number" },
    { name: "full_name", type: "string", required: true, description: "Full legal name as written on ID" },
    { name: "gender", type: "enum", required: true, enumValues: "LAKI-LAKI, PEREMPUAN", description: "Gender classification" },
    { name: "date_of_birth", type: "date", required: false, description: "Date of birth (YYYY-MM-DD)" },
  ]);

  const handleAddField = () => {
    setFields([
      ...fields,
      { name: `field_${fields.length + 1}`, type: "string", required: true, description: "" },
    ]);
  };

  const jsonSchemaPreview = {
    type: "object",
    properties: fields.reduce((acc: any, f) => {
      acc[f.name] = {
        type: f.type,
        required: f.required,
        ...(f.type === "enum" ? { enum_values: f.enumValues?.split(",").map((s) => s.trim()) } : {}),
      };
      return acc;
    }, {}),
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Action Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <Link href="/specs" className="p-2 rounded-xl glass-panel text-slate-400 hover:text-slate-200">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Code className="w-5 h-5 text-indigo-400" />
              <span>Visual API Schema Builder</span>
            </h1>
            <p className="text-xs text-slate-400">Spec ID: {params.id}</p>
          </div>
        </div>

        <button className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all">
          <Save className="w-4 h-4" />
          <span>Save & Publish Version</span>
        </button>
      </div>

      {/* Main Split Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel: Visual Schema Node Editor */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">Spec Name</label>
                <input
                  type="text"
                  value={specName}
                  onChange={(e) => setSpecName(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300">API Slug</label>
                <input
                  type="text"
                  value={specSlug}
                  onChange={(e) => setSpecSlug(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <h3 className="text-sm font-bold text-slate-200">Response Schema Fields</h3>
              <button
                onClick={handleAddField}
                className="px-3 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium flex items-center gap-1.5 hover:bg-indigo-600/30"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Property</span>
              </button>
            </div>

            {/* Field Nodes List */}
            <div className="space-y-3">
              {fields.map((field, idx) => (
                <div key={idx} className="p-4 rounded-xl glass-panel border border-slate-800 space-y-3 bg-slate-900/40">
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) => {
                        const next = [...fields];
                        next[idx].name = e.target.value;
                        setFields(next);
                      }}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-indigo-300 font-mono"
                      placeholder="field_name"
                    />
                    <select
                      value={field.type}
                      onChange={(e) => {
                        const next = [...fields];
                        next[idx].type = e.target.value;
                        setFields(next);
                      }}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    >
                      <option value="string">string</option>
                      <option value="number">number</option>
                      <option value="integer">integer</option>
                      <option value="boolean">boolean</option>
                      <option value="date">date</option>
                      <option value="enum">enum</option>
                    </select>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => {
                          const next = [...fields];
                          next[idx].required = e.target.checked;
                          setFields(next);
                        }}
                        className="rounded border-slate-700 bg-slate-900 text-indigo-600"
                      />
                      <span>Required</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel: Monaco / Live JSON Preview */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Real-Time JSON Schema Preview</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Pydantic v2 Compatible</span>
          </div>

          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-emerald-400 overflow-x-auto">
            <pre>{JSON.stringify(jsonSchemaPreview, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
