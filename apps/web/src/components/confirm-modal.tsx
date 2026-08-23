"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Copy, Loader2, X, HelpCircle, CheckCircle2 } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  icon?: "copy" | "alert" | "info";
  variant?: "primary" | "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Ya, Duplikasi",
  cancelText = "Batal",
  isLoading = false,
  icon = "copy",
  variant = "primary",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const variantStyles = {
    primary: "bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 font-extrabold shadow-lg shadow-[#e1b329]/25",
    danger: "bg-rose-600 hover:bg-rose-700 text-white font-extrabold shadow-lg shadow-rose-600/25",
    warning: "bg-amber-600 hover:bg-amber-700 text-white font-extrabold shadow-lg shadow-amber-600/25",
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-[#edd6bb]/30 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 bg-[#16120e] dark:bg-[#16120e]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e1b329]/15 border border-[#e1b329]/30 flex items-center justify-center shrink-0">
              {icon === "copy" ? (
                <Copy className="w-5 h-5 text-[#e1b329]" />
              ) : icon === "alert" ? (
                <AlertCircle className="w-5 h-5 text-rose-400" />
              ) : (
                <HelpCircle className="w-5 h-5 text-[#e1b329]" />
              )}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-100">{title}</h3>
              <p className="text-[11px] text-[#8b7e6d] dark:text-[#edd6bb]/70 mt-0.5">Konfirmasi Tindakan</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message */}
        <div className="p-4 rounded-2xl bg-[#8b7e6d]/10 border border-[#edd6bb]/15">
          <p className="text-xs text-slate-200 leading-relaxed font-medium">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 transition-all"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all transform active:scale-95 ${variantStyles[variant]}`}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
