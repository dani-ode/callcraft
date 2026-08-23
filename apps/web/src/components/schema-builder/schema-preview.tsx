"use client";

import { useState } from "react";
import { Sparkles, Copy, Check, Code2, Layers, Maximize2, Minimize2 } from "lucide-react";
import { SchemaField } from "./types";
import { buildJsonSchema, jsonSchemaToSchemaFields } from "./schema-helpers";
import { MonacoJsonPreview } from "./monaco-json-preview";

interface SchemaPreviewProps {
  fields?: SchemaField[];
  schema?: any;
  activeTabName: string;
  selectedFieldId?: string | null;
  onSelectFieldId?: (id: string | null) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  /** When true, renders without the outer glass-panel card wrapper.
   *  Use this when embedding inside an existing card to avoid card-in-card. */
  noWrapper?: boolean;
}

export function SchemaPreview({
  fields = [],
  schema,
  activeTabName,
  selectedFieldId = null,
  onSelectFieldId,
  isExpanded = false,
  onToggleExpand,
  noWrapper = false,
}: SchemaPreviewProps) {
  const [copied, setCopied] = useState(false);

  const resolvedFields = fields && fields.length > 0
    ? fields
    : schema
    ? jsonSchemaToSchemaFields(schema)
    : [];

  const jsonSchema = schema && typeof schema === "object"
    ? schema
    : buildJsonSchema(resolvedFields);

  const jsonString = JSON.stringify(jsonSchema, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculate nesting stats for visual badges
  const countFieldsRecursive = (list: SchemaField[]): { total: number; maxDepth: number } => {
    let total = 0;
    let maxDepth = 0;

    const traverse = (items: SchemaField[], depth: number) => {
      for (const item of items) {
        total++;
        if (depth > maxDepth) maxDepth = depth;
        if (item.properties) {
          traverse(item.properties, depth + 1);
        }
      }
    };

    traverse(list, 0);
    return { total, maxDepth };
  };

  const { total: totalProps, maxDepth } = countFieldsRecursive(resolvedFields);

  const inner = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edd6bb]/20 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#e1b329]" />
          <h3 className="text-sm font-extrabold">
            Real-Time JSON Schema Preview ({activeTabName.toUpperCase()})
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#e1b329]/15 text-[#8a715e] dark:text-[#ffb443] text-[10px] font-mono font-bold border border-[#e1b329]/30"
            title="Total properties defined in this schema"
          >
            <Code2 className="w-3 h-3 text-[#e1b329]" />
            <span>{totalProps} Fields</span>
          </div>

          <div
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[10px] font-mono font-bold border border-purple-500/30"
            title="Maximum nesting depth level of nested objects/arrays"
          >
            <Layers className="w-3 h-3 text-purple-400" />
            <span>Depth L{maxDepth}</span>
          </div>

          <button
            onClick={handleCopy}
            title="Copy formatted JSON schema to clipboard"
            className="px-3 py-1 rounded-xl glass-panel text-xs font-bold text-[#e1b329] border border-[#e1b329]/30 hover:bg-[#e1b329]/15 flex items-center gap-1.5 transition-all shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied!" : "Copy JSON"}</span>
          </button>

          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              title={isExpanded ? "Restore split screen view" : "Maximize JSON preview panel to full width"}
              className="p-1.5 rounded-xl glass-panel text-[#e1b329] border border-[#e1b329]/30 hover:bg-[#e1b329]/15 flex items-center transition-all shadow-sm"
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* VS-Code Powered Monaco JSON Editor Preview Container */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <MonacoJsonPreview
          data={jsonSchema}
          fields={resolvedFields}
          selectedFieldId={selectedFieldId}
          onSelectFieldId={onSelectFieldId}
        />
      </div>
    </>
  );

  if (noWrapper) {
    return <div className="flex flex-col h-full overflow-hidden space-y-3">{inner}</div>;
  }

  return (
    <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-[#edd6bb]/25 space-y-3 flex flex-col h-full overflow-hidden shadow-xl">
      {inner}
    </div>
  );
}


