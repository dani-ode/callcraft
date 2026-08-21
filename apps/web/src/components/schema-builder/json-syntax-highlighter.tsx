"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, Hash, Layers } from "lucide-react";
import { SchemaField } from "./types";

interface InteractiveJsonViewerProps {
  data: Record<string, any>;
  fields: SchemaField[];
  selectedFieldId?: string | null;
  onSelectFieldId?: (id: string | null) => void;
}

interface LineInfo {
  lineNumber: number;
  text: string;
  indentDepth: number;
  fieldName: string | null;
  isFoldable: boolean;
  blockEndLine?: number;
}

export function JsonSyntaxHighlighter({
  data,
  fields,
  selectedFieldId = null,
  onSelectFieldId,
}: InteractiveJsonViewerProps) {
  const jsonString = JSON.stringify(data, null, 2);
  const rawLines = jsonString.split("\n");

  const [collapsedLineRange, setCollapsedLineRange] = useState<Record<number, boolean>>({});
  const [globalCollapsed, setGlobalCollapsed] = useState(false);
  const lineRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Helper to recursive search field name by ID
  const findFieldById = (list: SchemaField[], id: string): SchemaField | null => {
    for (const item of list) {
      if (item.id === id) return item;
      if (item.properties) {
        const found = findFieldById(item.properties, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Helper to recursive search field by Name
  const findFieldByName = (list: SchemaField[], name: string): SchemaField | null => {
    for (const item of list) {
      if (item.name === name) return item;
      if (item.properties) {
        const found = findFieldByName(item.properties, name);
        if (found) return found;
      }
    }
    return null;
  };

  const activeField = selectedFieldId ? findFieldById(fields, selectedFieldId) : null;
  const activeFieldName = activeField?.name || null;

  // Build structure of line ranges and field names
  const lineInfos: LineInfo[] = [];
  const bracketStack: { lineIdx: number; indent: number }[] = [];

  rawLines.forEach((text, idx) => {
    const lineNum = idx + 1;
    const matchIndent = text.match(/^(\s*)/);
    const leadingSpaces = matchIndent ? matchIndent[1].length : 0;
    const indentDepth = Math.floor(leadingSpaces / 2);

    // Extract property key name if present e.g. "nik": {
    const keyMatch = text.match(/"([^"]+)":/);
    const fieldName = keyMatch ? keyMatch[1] : null;

    const trimmed = text.trim();
    const isFoldable = trimmed.endsWith("{") || trimmed.endsWith("[");

    lineInfos.push({
      lineNumber: lineNum,
      text,
      indentDepth,
      fieldName,
      isFoldable,
    });
  });

  // Calculate matching blockEndLine for foldable lines
  for (let i = 0; i < lineInfos.length; i++) {
    const current = lineInfos[i];
    if (current.isFoldable) {
      // Find matching closing bracket at same or lower indent depth
      for (let j = i + 1; j < lineInfos.length; j++) {
        const candidate = lineInfos[j];
        if (candidate.indentDepth === current.indentDepth) {
          const candTrim = candidate.text.trim();
          if (candTrim.startsWith("}") || candTrim.startsWith("]")) {
            current.blockEndLine = candidate.lineNumber;
            break;
          }
        }
      }
    }
  }

  // Find range of line numbers corresponding to activeFieldName
  let activeLineStart: number | null = null;
  let activeLineEnd: number | null = null;

  if (activeFieldName) {
    for (let i = 0; i < lineInfos.length; i++) {
      if (lineInfos[i].fieldName === activeFieldName) {
        activeLineStart = lineInfos[i].lineNumber;
        activeLineEnd = lineInfos[i].blockEndLine || lineInfos[i].lineNumber;
        break;
      }
    }
  }

  // Auto-scroll preview line into view inside container when selectedFieldId changes
  useEffect(() => {
    if (activeLineStart && lineRefs.current[activeLineStart]) {
      lineRefs.current[activeLineStart]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeLineStart]);

  const toggleFoldLine = (lineNum: number) => {
    setCollapsedLineRange((prev) => ({
      ...prev,
      [lineNum]: !prev[lineNum],
    }));
  };

  const toggleGlobalFold = () => {
    const nextState = !globalCollapsed;
    setGlobalCollapsed(nextState);
    if (nextState) {
      const allFoldables: Record<number, boolean> = {};
      lineInfos.forEach((l) => {
        if (l.isFoldable) allFoldables[l.lineNumber] = true;
      });
      setCollapsedLineRange(allFoldables);
    } else {
      setCollapsedLineRange({});
    }
  };

  // Check if line `lineNum` is hidden inside a collapsed parent block
  const isLineHiddenByCollapse = (lineNum: number): boolean => {
    for (const l of lineInfos) {
      if (l.isFoldable && collapsedLineRange[l.lineNumber]) {
        if (l.blockEndLine && lineNum > l.lineNumber && lineNum <= l.blockEndLine) {
          return true;
        }
      }
    }
    return false;
  };

  // Syntax Tokenizer for individual line text
  const renderSyntaxHighlightedText = (text: string) => {
    const jsonRegex =
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g;

    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = jsonRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`} className="text-slate-400 font-mono">
            {text.substring(lastIndex, match.index)}
          </span>
        );
      }

      const val = match[0];

      if (val.startsWith('"')) {
        if (val.endsWith(":")) {
          const keyName = val.slice(0, -1);
          parts.push(
            <React.Fragment key={`key-${match.index}`}>
              <span className="text-[#38bdf8] dark:text-[#7dd3fc] font-extrabold">{keyName}</span>
              <span className="text-slate-400">:</span>
            </React.Fragment>
          );
        } else {
          const cleanVal = val.slice(1, -1);
          const isTypeVal =
            cleanVal === "object" ||
            cleanVal === "array" ||
            cleanVal === "string" ||
            cleanVal === "number" ||
            cleanVal === "integer" ||
            cleanVal === "boolean" ||
            cleanVal === "date" ||
            cleanVal === "enum";

          parts.push(
            <span
              key={`str-${match.index}`}
              className={
                isTypeVal
                  ? "text-[#e1b329] dark:text-[#ffb443] font-black bg-[#e1b329]/15 px-1 py-0.5 rounded border border-[#e1b329]/40"
                  : "text-emerald-400 dark:text-emerald-300 font-semibold"
              }
            >
              {val}
            </span>
          );
        }
      } else if (val === "true" || val === "false") {
        parts.push(
          <span key={`bool-${match.index}`} className="text-amber-400 font-extrabold">
            {val}
          </span>
        );
      } else if (val === "null") {
        parts.push(
          <span key={`null-${match.index}`} className="text-rose-400 font-bold italic">
            {val}
          </span>
        );
      } else {
        parts.push(
          <span key={`num-${match.index}`} className="text-purple-400 font-extrabold">
            {val}
          </span>
        );
      }

      lastIndex = jsonRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(
        <span key={`text-end`} className="text-slate-400 font-mono">
          {text.substring(lastIndex)}
        </span>
      );
    }

    return parts;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden space-y-2">
      {/* Code Viewer Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/90 dark:bg-black/80 border border-[#edd6bb]/25 text-[11px] font-mono shrink-0 shadow-sm">
        <div className="flex items-center gap-3 text-slate-300">
          <span className="flex items-center gap-1 font-extrabold text-[#e1b329]" title="Total output code lines">
            <Hash className="w-3.5 h-3.5 text-[#e1b329]" />
            <span>{lineInfos.length} Lines</span>
          </span>

          {activeFieldName && (
            <span
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#e1b329]/20 text-[#ffb443] border border-[#e1b329]/40 font-extrabold shadow-sm animate-in fade-in duration-150"
              title="Currently selected field"
            >
              <span>Selected: &quot;{activeFieldName}&quot;</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={toggleGlobalFold}
          title="Toggle collapse or expand for all JSON objects and arrays"
          className="px-2.5 py-1 rounded-lg bg-[#edd6bb]/15 hover:bg-[#e1b329]/25 text-[#edd6bb] dark:text-[#ffb443] font-bold transition-all flex items-center gap-1.5 border border-[#edd6bb]/20 shadow-sm"
        >
          <Layers className="w-3.5 h-3.5 text-[#e1b329]" />
          <span>{globalCollapsed ? "Expand All Blocks" : "Collapse All Blocks"}</span>
        </button>
      </div>

      {/* Code View Body with Independent Custom Scrollbar */}
      <div className="flex-1 bg-[#0d0907] dark:bg-slate-950 border border-[#edd6bb]/25 rounded-2xl p-3 overflow-x-auto overflow-y-auto shadow-2xl font-mono text-xs custom-scrollbar min-h-0">
        <div className="min-w-full">
          {lineInfos.map((info) => {
            const isHidden = isLineHiddenByCollapse(info.lineNumber);
            if (isHidden) return null;

            const isHighlighted =
              activeLineStart !== null &&
              activeLineEnd !== null &&
              info.lineNumber >= activeLineStart &&
              info.lineNumber <= activeLineEnd;

            const isFolded = collapsedLineRange[info.lineNumber] === true;

            return (
              <div
                key={`line_${info.lineNumber}`}
                ref={(el) => { lineRefs.current[info.lineNumber] = el; }}
                onClick={() => {
                  if (info.fieldName && onSelectFieldId) {
                    const matchedField = findFieldByName(fields, info.fieldName);
                    if (matchedField) {
                      onSelectFieldId(matchedField.id);
                    }
                  }
                }}
                className={`flex items-stretch py-1 rounded-lg transition-all group cursor-pointer ${
                  isHighlighted
                    ? "bg-[#e1b329]/25 border-l-4 border-l-[#e1b329] text-[#ffb443] shadow-md shadow-[#e1b329]/20 ring-1 ring-[#e1b329]/40"
                    : "hover:bg-white/5"
                }`}
                title={info.fieldName ? `Click to highlight "${info.fieldName}" in editor` : undefined}
              >
                {/* Line Number Column & Fold Button */}
                <div className="w-12 shrink-0 flex items-center justify-end pr-2 text-[11px] text-slate-400 select-none border-r border-[#edd6bb]/30 mr-3 font-mono">
                  {info.isFoldable ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFoldLine(info.lineNumber);
                      }}
                      className="p-0.5 hover:text-[#e1b329] transition-colors mr-1"
                      title={isFolded ? "Expand this JSON block" : "Collapse this JSON block"}
                    >
                      {isFolded ? (
                        <ChevronRight className="w-3.5 h-3.5 text-[#e1b329]" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
                      )}
                    </button>
                  ) : null}
                  <span>{info.lineNumber}</span>
                </div>

                {/* Tab Indentation Vertical Guide Lines ("Garis Grid Preview") */}
                <div className="flex items-center">
                  {Array.from({ length: info.indentDepth }).map((_, gIdx) => (
                    <span
                      key={`guide_${gIdx}`}
                      className="inline-block w-4 h-full border-r border-[#edd6bb]/30 dark:border-[#edd6bb]/20 mr-1 select-none"
                    />
                  ))}
                </div>

                {/* Syntax Highlighted Line Content */}
                <div className="flex-1 font-mono leading-relaxed whitespace-pre pl-1">
                  {renderSyntaxHighlightedText(info.text)}
                  {isFolded && (
                    <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded bg-[#e1b329]/20 text-[#ffb443] border border-[#e1b329]/40">
                      {info.text.trim().endsWith("{") ? "{ ... }" : "[ ... ]"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

