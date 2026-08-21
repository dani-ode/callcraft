"use client";

import React, { useRef, useEffect, useState } from "react";
import Editor, { OnMount, BeforeMount, useMonaco } from "@monaco-editor/react";
import { SchemaField } from "./types";
import { Layers, Hash, Sparkles, Search, ChevronUp, ChevronDown, X } from "lucide-react";

interface MonacoJsonPreviewProps {
  data: Record<string, any>;
  fields: SchemaField[];
  selectedFieldId?: string | null;
  onSelectFieldId?: (id: string | null) => void;
}

export function MonacoJsonPreview({
  data,
  fields,
  selectedFieldId = null,
  onSelectFieldId,
}: MonacoJsonPreviewProps) {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  const searchDecorationsRef = useRef<string[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResultsCount, setSearchResultsCount] = useState<number | null>(null);
  const [currentMatchIdx, setCurrentMatchIdx] = useState<number>(0);
  const [themeMode, setThemeMode] = useState<"craft-darkwood" | "craft-light">("craft-darkwood");

  const jsonString = JSON.stringify(data, null, 2);
  const lines = jsonString.split("\n");

  // Suppress internal Monaco Promise cancelation & event cancellation errors ("operation is manually canceled" / "ERR Canceled")
  useEffect(() => {
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const msg = args.map((a) => (typeof a === "object" ? String(a?.message || a?.name || JSON.stringify(a)) : String(a))).join(" ");
      if (
        msg.includes("ERR Canceled") ||
        msg.includes("operation is manually canceled") ||
        msg.includes("Canceled") ||
        msg.includes("of.cancel")
      ) {
        return; // Suppress Monaco internal cancelation console log
      }
      originalConsoleError.apply(console, args);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (
        reason &&
        (reason.type === "cancelation" ||
          reason.msg === "operation is manually canceled" ||
          reason.name === "Canceled" ||
          reason.message === "Canceled" ||
          (typeof reason === "string" && reason.includes("Canceled")) ||
          (typeof reason?.stack === "string" && reason.stack.includes("editor.api")))
      ) {
        event.preventDefault();
      }
    };

    const handleError = (event: ErrorEvent) => {
      if (
        event.message &&
        (event.message.includes("Canceled") ||
          event.message.includes("operation is manually canceled") ||
          event.message.includes("ERR Canceled"))
      ) {
        event.preventDefault();
        return true;
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);
    return () => {
      console.error = originalConsoleError;
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  // Helper to recursive search field by ID
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

  const monaco = useMonaco();

  const defineCraftThemes = (monacoInstance: any) => {
    if (!monacoInstance) return;

    // 1. Dark Theme (Craft Studio Darkwood)
    monacoInstance.editor.defineTheme("craft-darkwood", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "string.key.json", foreground: "38bdf8", fontStyle: "bold" },
        { token: "string.key", foreground: "38bdf8", fontStyle: "bold" },
        { token: "string.value.json", foreground: "34d399" },
        { token: "string.value", foreground: "34d399" },
        { token: "string", foreground: "34d399" },
        { token: "number", foreground: "c084fc", fontStyle: "bold" },
        { token: "keyword.json", foreground: "ffb443", fontStyle: "bold" },
        { token: "keyword", foreground: "ffb443", fontStyle: "bold" },
        { token: "delimiter", foreground: "8b7e6d" },
        { token: "delimiter.bracket", foreground: "8b7e6d" },
      ],
      colors: {
        "editor.background": "#0d0907",
        "editor.foreground": "#edd6bb",
        "editor.lineHighlightBackground": "#1f1712",
        "editorLineNumber.foreground": "#635246",
        "editorLineNumber.activeForeground": "#e1b329",
        "editorIndentGuide.background": "#2a211a",
        "editorIndentGuide.activeBackground": "#e1b32950",
        "editor.selectionBackground": "#e1b32940",
        "editor.inactiveSelectionBackground": "#e1b32920",
      },
    });

    // 2. Light Theme (Craft Studio Light Parchment)
    monacoInstance.editor.defineTheme("craft-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "string.key.json", foreground: "0284c7", fontStyle: "bold" },
        { token: "string.key", foreground: "0284c7", fontStyle: "bold" },
        { token: "string.value.json", foreground: "047857", fontStyle: "bold" },
        { token: "string.value", foreground: "047857", fontStyle: "bold" },
        { token: "string", foreground: "047857" },
        { token: "number", foreground: "6d28d9", fontStyle: "bold" },
        { token: "keyword.json", foreground: "b45309", fontStyle: "bold" },
        { token: "keyword", foreground: "b45309", fontStyle: "bold" },
        { token: "delimiter", foreground: "78350f" },
        { token: "delimiter.bracket", foreground: "78350f", fontStyle: "bold" },
        { token: "delimiter.colon", foreground: "78350f" },
      ],
      colors: {
        "editor.background": "#fdfaf5",
        "editor.foreground": "#2c1d11",
        "editor.lineHighlightBackground": "#f5ebe0",
        "editorLineNumber.foreground": "#8a715e",
        "editorLineNumber.activeForeground": "#b45309",
        "editorIndentGuide.background": "#e5d4c3",
        "editorIndentGuide.activeBackground": "#b4530990",
        "editor.selectionBackground": "#e1b32945",
        "editor.inactiveSelectionBackground": "#e1b32920",
      },
    });
  };

  const handleBeforeMount: BeforeMount = (monacoInstance) => {
    defineCraftThemes(monacoInstance);
  };

  // Configure custom themes if monaco instance becomes available asynchronously
  useEffect(() => {
    if (monaco) {
      defineCraftThemes(monaco);
      const isLight = document.documentElement.classList.contains("light");
      const initialTheme = isLight ? "craft-light" : "craft-darkwood";
      setThemeMode(initialTheme);
      monaco.editor.setTheme(initialTheme);
    }
  }, [monaco]);

  // Observer to switch theme when document element class changes (light vs dark mode)
  useEffect(() => {
    const updateTheme = () => {
      const isLight = document.documentElement.classList.contains("light");
      const targetTheme = isLight ? "craft-light" : "craft-darkwood";
      setThemeMode(targetTheme);
      if (monacoRef.current) {
        monacoRef.current.editor.setTheme(targetTheme);
      }
    };

    updateTheme();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.type === "attributes" && m.attributeName === "class") {
          updateTheme();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;

    defineCraftThemes(monacoInstance);

    // Set initial theme explicitly
    const isLight = document.documentElement.classList.contains("light");
    const targetTheme = isLight ? "craft-light" : "craft-darkwood";
    setThemeMode(targetTheme);
    monacoInstance.editor.setTheme(targetTheme);

    // Listen for click/cursor movement to trigger field selection
    editor.onMouseDown((e: any) => {
      if (e.target && e.target.position) {
        const lineNum = e.target.position.lineNumber;
        const lineContent = lines[lineNum - 1] || "";
        const match = lineContent.match(/"([^"]+)":/);
        if (match && match[1] && onSelectFieldId) {
          const keyName = match[1];
          const matchedField = findFieldByName(fields, keyName);
          if (matchedField) {
            onSelectFieldId(matchedField.id);
          }
        }
      }
    });
  };

  // Synchronize active field line highlight decoration and auto-scroll
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const editor = editorRef.current;
    const monacoInstance = monacoRef.current;

    if (!activeFieldName) {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
      return;
    }

    // Find line number matching activeFieldName e.g. "nik":
    let targetLine = -1;
    let endLine = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(`"${activeFieldName}":`)) {
        targetLine = i + 1;
        break;
      }
    }

    if (targetLine !== -1) {
      let depth = 0;
      for (let j = targetLine - 1; j < lines.length; j++) {
        const line = lines[j];
        if (line.includes("{") || line.includes("[")) depth++;
        if (line.includes("}") || line.includes("]")) depth--;

        if (j > targetLine - 1 && depth <= 0) {
          endLine = j + 1;
          break;
        }
      }

      if (endLine === -1) endLine = targetLine;

      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
        {
          range: new monacoInstance.Range(targetLine, 1, endLine, lines[endLine - 1].length + 1),
          options: {
            isWholeLine: true,
            className: "monaco-highlight-block",
            linesDecorationsClassName: "monaco-highlight-gutter",
          },
        },
      ]);

      editor.revealLineInCenter(targetLine);
    } else {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
    }
  }, [activeFieldName, jsonString, lines]);

  // Live Quick Search Logic
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (!editorRef.current || !monacoRef.current) return;
    const editor = editorRef.current;

    if (!query.trim()) {
      searchDecorationsRef.current = editor.deltaDecorations(searchDecorationsRef.current, []);
      setSearchResultsCount(null);
      return;
    }

    const matches = editor.getModel().findMatches(query, false, false, false, null, true);
    setSearchResultsCount(matches.length);

    if (matches.length > 0) {
      setCurrentMatchIdx(1);
      const newDecorations = matches.map((m: any) => ({
        range: m.range,
        options: {
          className: "monaco-search-match",
          inlineClassName: "monaco-search-match-inline",
        },
      }));
      searchDecorationsRef.current = editor.deltaDecorations(searchDecorationsRef.current, newDecorations);
      editor.revealRangeInCenter(matches[0].range);
    } else {
      searchDecorationsRef.current = editor.deltaDecorations(searchDecorationsRef.current, []);
      setCurrentMatchIdx(0);
    }
  };

  const handleNextMatch = () => {
    if (!editorRef.current || !searchQuery) return;
    const editor = editorRef.current;
    const matches = editor.getModel().findMatches(searchQuery, false, false, false, null, true);
    if (matches.length > 0) {
      const nextIdx = (currentMatchIdx % matches.length) + 1;
      setCurrentMatchIdx(nextIdx);
      editor.revealRangeInCenter(matches[nextIdx - 1].range);
    }
  };

  const handlePrevMatch = () => {
    if (!editorRef.current || !searchQuery) return;
    const editor = editorRef.current;
    const matches = editor.getModel().findMatches(searchQuery, false, false, false, null, true);
    if (matches.length > 0) {
      const prevIdx = currentMatchIdx - 1 <= 0 ? matches.length : currentMatchIdx - 1;
      setCurrentMatchIdx(prevIdx);
      editor.revealRangeInCenter(matches[prevIdx - 1].range);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResultsCount(null);
    if (editorRef.current) {
      searchDecorationsRef.current = editorRef.current.deltaDecorations(searchDecorationsRef.current, []);
    }
  };

  const toggleFoldAll = () => {
    if (!editorRef.current) return;
    editorRef.current.trigger("fold", "editor.foldAll");
  };

  const toggleUnfoldAll = () => {
    if (!editorRef.current) return;
    editorRef.current.trigger("unfold", "editor.unfoldAll");
  };

  return (
    <div className="flex flex-col h-full overflow-hidden space-y-2">
      {/* Custom Highlight Styles injected for Monaco (Dark and Light variants) */}
      <style jsx global>{`
        .monaco-highlight-block {
          background-color: rgba(225, 179, 41, 0.22) !important;
          border-left: 4px solid #e1b329 !important;
        }
        html.light .monaco-highlight-block {
          background-color: rgba(225, 179, 41, 0.28) !important;
          border-left: 4px solid #b45309 !important;
        }
        .monaco-highlight-gutter {
          background-color: #e1b329 !important;
          width: 4px !important;
        }
        html.light .monaco-highlight-gutter {
          background-color: #b45309 !important;
          width: 4px !important;
        }
        .monaco-search-match {
          background-color: rgba(225, 179, 41, 0.45) !important;
          border-radius: 3px;
        }
        .monaco-search-match-inline {
          background-color: rgba(225, 179, 41, 0.65) !important;
          color: #000000 !important;
          font-weight: bold;
        }
      `}</style>

      {/* Code Viewer Toolbar with Live Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-[#f5ebe0] dark:bg-black/80 border border-[#d8be9f] dark:border-[#edd6bb]/25 text-[#2c1d11] dark:text-slate-300 text-[11px] font-mono shrink-0 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1 font-extrabold text-[#b45309] dark:text-[#e1b329]" title="Total formatted JSON lines">
            <Hash className="w-3.5 h-3.5 text-[#b45309] dark:text-[#e1b329]" />
            <span>{lines.length} Lines</span>
          </span>

          {/* Quick Search Bar */}
          <div className="flex items-center gap-1 bg-[#ede0d0] dark:bg-black/60 border border-[#d8be9f] dark:border-[#edd6bb]/30 rounded-lg px-2 py-0.5 shadow-inner">
            <Search className="w-3.5 h-3.5 text-[#b45309] dark:text-[#e1b329] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search keyword..."
              className="bg-transparent border-none text-[11px] text-[#2c1d11] dark:text-[#edd6bb] focus:outline-none w-28 sm:w-36 font-mono placeholder:opacity-60"
            />
            {searchResultsCount !== null && (
              <span className="text-[10px] text-[#b45309] dark:text-[#ffb443] font-bold px-1 select-none whitespace-nowrap">
                {searchResultsCount > 0 ? `${currentMatchIdx}/${searchResultsCount}` : "0 matches"}
              </span>
            )}
            {searchQuery && (
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={handlePrevMatch}
                  title="Previous match"
                  className="p-0.5 hover:text-[#b45309] dark:hover:text-[#e1b329] transition-colors"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMatch}
                  title="Next match"
                  className="p-0.5 hover:text-[#b45309] dark:hover:text-[#e1b329] transition-colors"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  title="Clear search"
                  className="p-0.5 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {activeFieldName && (
            <span
              className="hidden sm:flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#e1b329]/25 text-[#b45309] dark:text-[#ffb443] border border-[#e1b329]/40 font-extrabold shadow-sm animate-in fade-in duration-150"
              title="Currently selected field"
            >
              <Sparkles className="w-3 h-3 text-[#b45309] dark:text-[#e1b329]" />
              <span>Selected: &quot;{activeFieldName}&quot;</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleFoldAll}
            title="Fold all nested JSON blocks (Monaco VS-Code Engine)"
            className="px-2.5 py-1 rounded-lg bg-[#edd6bb]/30 dark:bg-[#edd6bb]/15 hover:bg-[#e1b329]/25 text-[#5c4b3c] dark:text-[#ffb443] font-bold transition-all text-[10px] border border-[#d8be9f] dark:border-[#edd6bb]/20 flex items-center gap-1"
          >
            <Layers className="w-3 h-3 text-[#b45309] dark:text-[#e1b329]" />
            <span>Fold All</span>
          </button>
          <button
            type="button"
            onClick={toggleUnfoldAll}
            title="Unfold all nested JSON blocks"
            className="px-2.5 py-1 rounded-lg bg-[#edd6bb]/30 dark:bg-[#edd6bb]/15 hover:bg-[#e1b329]/25 text-[#5c4b3c] dark:text-[#ffb443] font-bold transition-all text-[10px] border border-[#d8be9f] dark:border-[#edd6bb]/20 flex items-center gap-1"
          >
            <Layers className="w-3 h-3 text-[#b45309] dark:text-[#e1b329]" />
            <span>Unfold All</span>
          </button>
        </div>
      </div>

      {/* VS Code Monaco Editor Body Container */}
      <div className="flex-1 bg-[#fdfaf5] dark:bg-[#0d0907] border border-[#d8be9f] dark:border-[#edd6bb]/25 rounded-2xl overflow-hidden shadow-2xl min-h-0 relative">
        <Editor
          height="100%"
          language="json"
          value={jsonString}
          theme={themeMode}
          beforeMount={handleBeforeMount}
          onMount={handleEditorDidMount}
          options={{
            readOnly: true,
            domReadOnly: true,
            folding: true,
            foldingStrategy: "indentation",
            showFoldingControls: "always",
            minimap: { enabled: false },
            fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace",
            lineNumbers: "on",
            lineNumbersMinChars: 3,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 10, bottom: 10 },
            renderLineHighlight: "all",
            contextmenu: false,
            cursorBlinking: "smooth",
          }}
        />
      </div>
    </div>
  );
}
