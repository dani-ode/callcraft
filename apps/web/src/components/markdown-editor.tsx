"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Bold,
  Italic,
  Code,
  List,
  Quote,
  Heading1,
  Heading2,
  Link as LinkIcon,
  Eye,
  Edit3,
  Columns,
  Copy,
  Check,
  Sparkles,
  FileText,
  Maximize2,
  Minimize2,
} from "lucide-react";

/**
 * Utility function to strip markdown syntax and extract clean plain text for template cards
 */
export function extractPlainTextFromMarkdown(markdown?: string | null): string {
  if (!markdown) return "";

  let text = markdown;

  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, " ");

  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, " ");

  // Remove images and links [text](url) -> text
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove headers (# Header)
  text = text.replace(/^#{1,6}\s+/gm, " ");

  // Remove blockquotes (> quote)
  text = text.replace(/^\s*>\s+/gm, " ");

  // Remove lists (* list, - list, 1. list)
  text = text.replace(/^\s*[-*+]\s+/gm, " ");
  text = text.replace(/^\s*\d+\.\s+/gm, " ");

  // Remove bold and italic formatting (**text**, *text*, __text__, _text_)
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/\*([^*]+)\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/_([^_]+)_/g, "$1");

  // Remove inline code (`code`)
  text = text.replace(/`([^`]+)`/g, "$1");

  // Clean up duplicate spaces and newlines
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * Custom Styled Light & Dark Mode Markdown Renderer Component
 */
export function MarkdownRenderer({ content }: { content?: string | null }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!content || !content.trim()) {
    return (
      <div className="py-8 text-center text-[#8b7e6d] dark:text-slate-500 italic text-xs">
        Belum ada konten Markdown yang ditulis.
      </div>
    );
  }

  const lines = content.split("\n");
  const renderedElements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];
  let codeBlockLang = "";
  let blockKey = 0;

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block fence
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        const codeText = codeBlockBuffer.join("\n");
        const currentIdx = blockKey++;
        renderedElements.push(
          <div key={`code-${currentIdx}`} className="relative my-3 rounded-2xl overflow-hidden border border-[#edd6bb]/30 dark:border-[#edd6bb]/20 bg-[#f4efe8] dark:bg-[#0d0907] shadow-lg group">
            <div className="flex items-center justify-between px-4 py-2 bg-[#e8decb] dark:bg-[#17120e] border-b border-[#edd6bb]/30 dark:border-[#edd6bb]/15 text-[10px] font-mono text-[#8b7e6d]">
              <span className="uppercase font-bold text-[#b8860b] dark:text-[#e1b329]">{codeBlockLang || "code"}</span>
              <button
                type="button"
                onClick={() => handleCopyCode(codeText, currentIdx)}
                className="flex items-center gap-1 hover:text-[#e1b329] transition-colors"
              >
                {copiedIndex === currentIdx ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-xs font-mono text-slate-800 dark:text-amber-200/90 leading-relaxed">
              <code>{codeText}</code>
            </pre>
          </div>
        );
        codeBlockBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeBlockLang = line.trim().replace(/^```/, "").trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      continue;
    }

    // Headers
    if (line.startsWith("# ")) {
      renderedElements.push(
        <h1 key={`h1-${i}`} className="text-xl font-extrabold text-slate-900 dark:text-[#edd6bb] border-b border-[#edd6bb]/30 dark:border-[#edd6bb]/20 pb-2 mt-4 mb-2 flex items-center gap-2">
          <span className="w-1.5 h-5 bg-[#e1b329] rounded-full inline-block shrink-0"></span>
          <span>{line.replace("# ", "")}</span>
        </h1>
      );
    } else if (line.startsWith("## ")) {
      renderedElements.push(
        <h2 key={`h2-${i}`} className="text-base font-extrabold text-[#b8860b] dark:text-[#ffb443] mt-4 mb-2 flex items-center gap-2">
          <span>{line.replace("## ", "")}</span>
        </h2>
      );
    } else if (line.startsWith("### ")) {
      renderedElements.push(
        <h3 key={`h3-${i}`} className="text-sm font-bold text-slate-800 dark:text-amber-200 mt-3 mb-1">
          {line.replace("### ", "")}
        </h3>
      );
    } else if (line.startsWith("> ")) {
      renderedElements.push(
        <blockquote key={`quote-${i}`} className="border-l-4 border-[#e1b329] pl-3 py-1.5 my-2 text-xs italic text-slate-700 dark:text-[#edd6bb]/80 bg-[#e1b329]/10 dark:bg-[#e1b329]/5 rounded-r-xl">
          {line.replace("> ", "")}
        </blockquote>
      );
    } else if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      renderedElements.push(
        <li key={`li-${i}`} className="text-xs text-slate-700 dark:text-[#edd6bb]/90 ml-4 list-disc marker:text-[#e1b329] py-0.5">
          {formatInlineMarkdown(line.trim().replace(/^[-*]\s+/, ""))}
        </li>
      );
    } else if (line.trim() === "") {
      renderedElements.push(<div key={`space-${i}`} className="h-2" />);
    } else {
      renderedElements.push(
        <p key={`p-${i}`} className="text-xs text-slate-700 dark:text-[#edd6bb]/90 leading-relaxed my-1">
          {formatInlineMarkdown(line)}
        </p>
      );
    }
  }

  return <div className="space-y-1 font-sans text-xs">{renderedElements}</div>;
}

/**
 * Format inline markdown like **bold**, *italic*, `code`, and [link](url)
 */
function formatInlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-extrabold text-[#b8860b] dark:text-[#ffb443]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={index} className="italic text-amber-800 dark:text-amber-200">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-black/50 border border-[#edd6bb]/30 dark:border-[#edd6bb]/20 font-mono text-[11px] text-[#b8860b] dark:text-[#e1b329]">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("[") && part.includes("](")) {
      const match = part.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        return (
          <a
            key={index}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#b8860b] dark:text-[#e1b329] hover:underline font-semibold"
          >
            {match[1]}
          </a>
        );
      }
    }
    return part;
  });
}

interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  minRows?: number;
}

export function MarkdownEditorWithPreview({ value, onChange }: MarkdownEditorProps) {
  const [mode, setMode] = useState<"edit" | "preview" | "split">("split");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when Fullscreen is active
  useEffect(() => {
    if (isFullScreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullScreen]);

  // Listen for Escape key to exit full screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullScreen]);

  const insertFormatting = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || "teks";
    const replacement = `${prefix}${selectedText}${suffix}`;

    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 50);
  };

  const plainTextCardSnippet = extractPlainTextFromMarkdown(value);

  const editorCoreContent = (
    <div
      className={`rounded-3xl border transition-all ${
        isFullScreen
          ? "fixed inset-0 z-[100] w-screen h-screen p-4 sm:p-6 bg-[#f7f3ec] dark:bg-[#0e0b08] backdrop-blur-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          : "border-[#edd6bb]/30 dark:border-[#edd6bb]/20 bg-[#fcfaf7] dark:bg-[#14100c] shadow-2xl space-y-0 overflow-hidden"
      }`}
    >
      {/* Toolbar Header */}
      <div className="px-4 py-3 bg-[#f4efe8] dark:bg-[#1c1713] border-b border-[#edd6bb]/30 dark:border-[#edd6bb]/15 flex flex-wrap items-center justify-between gap-3 shrink-0 rounded-t-2xl">
        {/* Quick Formatting Tools */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => insertFormatting("# ")}
            className="p-1.5 rounded-lg text-[#8b7e6d] hover:text-[#e1b329] hover:bg-[#e1b329]/10 border border-transparent hover:border-[#e1b329]/20 transition-all"
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting("## ")}
            className="p-1.5 rounded-lg text-[#8b7e6d] hover:text-[#e1b329] hover:bg-[#e1b329]/10 border border-transparent hover:border-[#e1b329]/20 transition-all"
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <span className="w-px h-4 bg-[#edd6bb]/30 dark:bg-[#edd6bb]/15 mx-1" />
          <button
            type="button"
            onClick={() => insertFormatting("**", "**")}
            className="p-1.5 rounded-lg text-[#8b7e6d] hover:text-[#e1b329] hover:bg-[#e1b329]/10 border border-transparent hover:border-[#e1b329]/20 transition-all"
            title="Bold (**teks**)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting("*", "*")}
            className="p-1.5 rounded-lg text-[#8b7e6d] hover:text-[#e1b329] hover:bg-[#e1b329]/10 border border-transparent hover:border-[#e1b329]/20 transition-all"
            title="Italic (*teks*)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <span className="w-px h-4 bg-[#edd6bb]/30 dark:bg-[#edd6bb]/15 mx-1" />
          <button
            type="button"
            onClick={() => insertFormatting("`", "`")}
            className="p-1.5 rounded-lg text-[#8b7e6d] hover:text-[#e1b329] hover:bg-[#e1b329]/10 border border-transparent hover:border-[#e1b329]/20 transition-all"
            title="Inline Code (`code`)"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting("```json\n", "\n```")}
            className="p-1.5 rounded-lg text-[#8b7e6d] hover:text-[#e1b329] hover:bg-[#e1b329]/10 border border-transparent hover:border-[#e1b329]/20 transition-all font-mono text-[10px] font-bold"
            title="Code Block (```json)"
          >
            {`{ }`}
          </button>
          <button
            type="button"
            onClick={() => insertFormatting("- ")}
            className="p-1.5 rounded-lg text-[#8b7e6d] hover:text-[#e1b329] hover:bg-[#e1b329]/10 border border-transparent hover:border-[#e1b329]/20 transition-all"
            title="Bulleted List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting("> ")}
            className="p-1.5 rounded-lg text-[#8b7e6d] hover:text-[#e1b329] hover:bg-[#e1b329]/10 border border-transparent hover:border-[#e1b329]/20 transition-all"
            title="Blockquote"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting("[Judul](", ")")}
            className="p-1.5 rounded-lg text-[#8b7e6d] hover:text-[#e1b329] hover:bg-[#e1b329]/10 border border-transparent hover:border-[#e1b329]/20 transition-all"
            title="Link ([Judul](url))"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Controls: Mode Switches & Full Screen Button */}
        <div className="flex items-center gap-2">
          {/* View Mode Switches */}
          <div className="flex items-center gap-1 bg-[#e8decb] dark:bg-[#120e0b] p-1 rounded-xl border border-[#edd6bb]/30 dark:border-[#edd6bb]/15">
            <button
              type="button"
              onClick={() => setMode("edit")}
              className={`px-3 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1.5 transition-all ${
                mode === "edit" ? "bg-[#e1b329] text-slate-950 shadow-md" : "text-[#8b7e6d] hover:text-slate-900 dark:hover:text-[#edd6bb]"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editor</span>
            </button>

            <button
              type="button"
              onClick={() => setMode("preview")}
              className={`px-3 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1.5 transition-all ${
                mode === "preview" ? "bg-[#e1b329] text-slate-950 shadow-md" : "text-[#8b7e6d] hover:text-slate-900 dark:hover:text-[#edd6bb]"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>

            <button
              type="button"
              onClick={() => setMode("split")}
              className={`hidden sm:flex px-3 py-1 rounded-lg text-[11px] font-extrabold items-center gap-1.5 transition-all ${
                mode === "split" ? "bg-[#e1b329] text-slate-950 shadow-md" : "text-[#8b7e6d] hover:text-slate-900 dark:hover:text-[#edd6bb]"
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Split View</span>
            </button>
          </div>

          {/* Full Screen Toggle Button */}
          <button
            type="button"
            onClick={() => setIsFullScreen((prev) => !prev)}
            className={`p-2 rounded-xl font-bold flex items-center justify-center transition-all border ${
              isFullScreen
                ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40 hover:bg-rose-500/30"
                : "bg-[#e8decb] dark:bg-[#1c1713] text-[#8b7e6d] hover:text-[#e1b329] border-[#edd6bb]/30 dark:border-[#edd6bb]/20"
            }`}
            title={isFullScreen ? "Keluar Layar Penuh (Esc)" : "Perluas ke Layar Penuh"}
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Editor Body Area */}
      <div className={`p-4 ${isFullScreen ? "flex-1 min-h-0 flex flex-col overflow-hidden" : ""}`}>
        {mode === "edit" && (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full p-4 rounded-2xl bg-white dark:bg-[#0d0907] border border-[#edd6bb]/30 dark:border-[#edd6bb]/20 font-mono text-xs text-slate-800 dark:text-[#edd6bb] placeholder-[#8b7e6d] focus:outline-none focus:border-[#e1b329] leading-relaxed overflow-y-auto ${
              isFullScreen ? "h-full flex-1 min-h-0 resize-none" : "h-[420px] resize-y"
            }`}
            placeholder="# Judul Call Spec Dokumentasi..."
          />
        )}

        {mode === "preview" && (
          <div
            className={`w-full p-5 rounded-2xl bg-white dark:bg-[#0d0907] border border-[#edd6bb]/30 dark:border-[#edd6bb]/20 overflow-y-auto ${
              isFullScreen ? "h-full flex-1 min-h-0" : "h-[420px]"
            }`}
          >
            <MarkdownRenderer content={value} />
          </div>
        )}

        {mode === "split" && (
          <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 w-full ${isFullScreen ? "h-full flex-1 min-h-0" : "h-[420px]"}`}>
            {/* Column 1: Markdown Source */}
            <div className="flex flex-col h-full min-h-0 space-y-1">
              <span className="text-[10px] font-mono font-bold text-[#8b7e6d] uppercase tracking-wider block px-1 shrink-0">Markdown Source</span>
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full flex-1 min-h-0 p-4 rounded-2xl bg-white dark:bg-[#0d0907] border border-[#edd6bb]/30 dark:border-[#edd6bb]/20 font-mono text-xs text-slate-800 dark:text-[#edd6bb] placeholder-[#8b7e6d] focus:outline-none focus:border-[#e1b329] leading-relaxed overflow-y-auto resize-none"
                placeholder="# Judul Call Spec Dokumentasi..."
              />
            </div>

            {/* Column 2: Live Rendered Preview */}
            <div className="flex flex-col h-full min-h-0 space-y-1">
              <span className="text-[10px] font-mono font-bold text-[#b8860b] dark:text-[#e1b329] uppercase tracking-wider block px-1 flex items-center gap-1 shrink-0">
                <Sparkles className="w-3 h-3 text-[#e1b329]" />
                <span>Live Rendered Preview</span>
              </span>
              <div className="w-full flex-1 min-h-0 p-4 rounded-2xl bg-white dark:bg-[#0d0907] border border-[#edd6bb]/30 dark:border-[#edd6bb]/20 overflow-y-auto">
                <MarkdownRenderer content={value} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* If Full Screen, render via Portal to document.body */}
      {isFullScreen && mounted ? createPortal(editorCoreContent, document.body) : editorCoreContent}

      {/* Extracted Card Plain Text Preview Widget */}
      <div className="glass-panel p-4 rounded-2xl border border-[#edd6bb]/30 dark:border-[#edd6bb]/20 space-y-2 bg-[#f4efe8]/60 dark:bg-[#120e0b]/60">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#8b7e6d] flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#e1b329]" />
            <span>Tampilan Deskripsi Kartu di Marketplace (Extracted Plain Text Only):</span>
          </span>
          <span className="text-[10px] font-mono text-[#8b7e6d] dark:text-slate-400">
            {plainTextCardSnippet.length} karakter
          </span>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-[#0a0705] border border-[#edd6bb]/30 dark:border-[#edd6bb]/15 text-xs text-slate-800 dark:text-[#edd6bb]/90 line-clamp-2 leading-relaxed font-sans italic">
          "{plainTextCardSnippet || "Deskripsi ringkas akan diekstrak secara otomatis dari teks Markdown tanpa simbol formatting."}"
        </div>
      </div>
    </div>
  );
}
