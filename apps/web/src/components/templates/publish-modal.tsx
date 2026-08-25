"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Upload, Loader2 } from "lucide-react";
import { CallSpec } from "@/lib/types";

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  userSpecs: CallSpec[];
  selectedSpecId: string;
  setSelectedSpecId: (id: string) => void;
  publishCode: string;
  setPublishCode: (c: string) => void;
  publishName: string;
  setPublishName: (n: string) => void;
  publishDescription: string;
  setPublishDescription: (d: string) => void;
  publishCategory: string;
  setPublishCategory: (cat: string) => void;
  publishing: boolean;
  onPublishSubmit: (e: React.FormEvent) => void;
}

export function PublishModal({
  isOpen,
  onClose,
  userSpecs,
  selectedSpecId,
  setSelectedSpecId,
  publishCode,
  setPublishCode,
  publishName,
  setPublishName,
  publishDescription,
  setPublishDescription,
  publishCategory,
  setPublishCategory,
  publishing,
  onPublishSubmit,
}: PublishModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#191410] border border-[#edd6bb]/25 rounded-3xl p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between border-b border-[#edd6bb]/15 pb-4">
          <div>
            <h3 className="text-lg font-extrabold text-[#edd6bb]">Publikasikan Spec ke Pasar</h3>
            <p className="text-xs text-[#8b7e6d]">Bagikan Call Spec buatan Anda ke seluruh komunitas developer</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg glass-panel text-[#8b7e6d]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onPublishSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[#edd6bb] block mb-1">Pilih Call Spec</label>
            <select
              value={selectedSpecId}
              onChange={(e) => {
                const specId = e.target.value;
                setSelectedSpecId(specId);
                const found = userSpecs.find((s) => s.id === specId);
                if (found) {
                  setPublishName(found.name);
                  setPublishCode(found.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                  setPublishDescription(found.description || "");
                }
              }}
              className="w-full p-3 rounded-xl bg-[#120e0b]/80 border border-[#edd6bb]/20 text-xs font-bold text-[#edd6bb] focus:outline-none focus:border-[#e1b329]"
            >
              {userSpecs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.slug})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-[#edd6bb] block mb-1">Nama Template Publik</label>
            <input
              type="text"
              required
              value={publishName}
              onChange={(e) => setPublishName(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#120e0b]/80 border border-[#edd6bb]/20 text-xs text-[#edd6bb] focus:outline-none focus:border-[#e1b329]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#edd6bb] block mb-1">Kode Slug Identifier Unique</label>
            <input
              type="text"
              required
              value={publishCode}
              onChange={(e) => setPublishCode(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#120e0b]/80 border border-[#edd6bb]/20 text-xs font-mono text-[#e1b329] focus:outline-none focus:border-[#e1b329]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#edd6bb] block mb-1">Kategori Pasar</label>
            <select
              value={publishCategory}
              onChange={(e) => setPublishCategory(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#120e0b]/80 border border-[#edd6bb]/20 text-xs font-bold text-[#edd6bb] focus:outline-none focus:border-[#e1b329]"
            >
              <option value="finance">Finance & Invoices</option>
              <option value="identity">Identity & OCR</option>
              <option value="retail">Retail & Receipts</option>
              <option value="medical">Medical & Health</option>
              <option value="custom">Custom Community</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-[#edd6bb] block mb-1">Deskripsi Template</label>
            <textarea
              rows={3}
              value={publishDescription}
              onChange={(e) => setPublishDescription(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#120e0b]/80 border border-[#edd6bb]/20 text-xs text-[#edd6bb] focus:outline-none focus:border-[#e1b329]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl glass-panel text-xs font-bold text-[#8b7e6d]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={publishing}
              className="px-5 py-2.5 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 font-extrabold text-xs shadow-md shadow-[#e1b329]/20 flex items-center gap-2"
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>Publikasikan Sekarang</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
