"use client";

import { Search, Filter } from "lucide-react";

export const CATEGORIES = [
  { id: "all", label: "All Templates" },
  { id: "finance", label: "Finance & Invoices" },
  { id: "identity", label: "Identity & OCR" },
  { id: "retail", label: "Retail & Receipts" },
  { id: "medical", label: "Medical & Health" },
  { id: "custom", label: "Community Custom" },
];

interface TemplateFiltersProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  sortBy: string;
  setSortBy: (s: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
}

export function TemplateFilters({
  searchQuery,
  setSearchQuery,
  activeCategory,
  setActiveCategory,
  sortBy,
  setSortBy,
  onSearchSubmit,
}: TemplateFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search & Sorting Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center glass-panel p-4 rounded-2xl border border-[#edd6bb]/20">
        <form onSubmit={onSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8b7e6d]" />
          <input
            type="text"
            placeholder="Cari template schema (e.g. invoice, ktp, receipt)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#120e0b]/50 border border-[#edd6bb]/20 text-xs text-[#edd6bb] placeholder-[#8b7e6d] focus:outline-none focus:border-[#e1b329]"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <span className="text-xs text-[#8b7e6d] font-medium flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#e1b329]" />
            <span>Urutkan:</span>
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#120e0b]/60 border border-[#edd6bb]/20 text-xs font-bold text-[#edd6bb] focus:outline-none focus:border-[#e1b329]"
          >
            <option value="popular">⚡ Terpopuler (Forks)</option>
            <option value="rating">⭐ Rating Tertinggi</option>
            <option value="newest">🆕 Terbaru</option>
          </select>
        </div>
      </div>

      {/* Category Pill Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? "bg-[#e1b329] text-slate-950 shadow-md shadow-[#e1b329]/20"
                : "glass-panel hover:bg-[#edd6bb]/10 text-[#8b7e6d] dark:text-[#edd6bb]/80 border border-[#edd6bb]/15"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
