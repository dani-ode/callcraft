"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Edit3,
  Plus,
  Copy,
  Check,
  FileText,
  Key,
  Shield,
  Layers,
  Loader2,
  Globe,
  Lock,
  Heart,
  GitFork,
  Star,
  Settings,
  Search,
  X,
  Filter,
  ArrowUpDown,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { fetchCallSpecs, duplicateCallSpec } from "@/lib/api-client";
import { CallSpec } from "@/lib/types";
import { ConfirmModal } from "@/components/confirm-modal";
import { extractPlainTextFromMarkdown } from "@/components/markdown-editor";

const PAGE_SIZE = 6;

function SlugBadge({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(slug);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        type="button"
        onClick={handleCopy}
        className="max-w-[130px] sm:max-w-[150px] truncate text-[10px] font-mono font-semibold text-[#8a715e] dark:text-[#edd6bb]/80 hover:text-[#e1b329] bg-[#8b7e6d]/10 dark:bg-[#edd6bb]/10 px-2 py-0.5 rounded-md border border-[#edd6bb]/20 flex items-center gap-1.5 transition-all cursor-pointer"
        title="Klik untuk menyalin slug lengkap"
      >
        <span className="truncate">{slug}</span>
        {copied ? (
          <Check className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
        ) : (
          <Copy className="w-2.5 h-2.5 opacity-50 shrink-0" />
        )}
      </button>

      {/* Interactive Tooltip on hover */}
      {showTooltip && (
        <div className="absolute right-0 bottom-full mb-1.5 z-30 px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-slate-950 text-white text-[10px] font-mono shadow-xl border border-slate-700 whitespace-nowrap flex items-center gap-1.5 animate-in fade-in zoom-in-95 pointer-events-none">
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="font-extrabold text-emerald-400">Slug tersalin ke clipboard!</span>
            </>
          ) : (
            <span>Klik untuk menyalin: <strong className="text-[#e1b329]">{slug}</strong></span>
          )}
        </div>
      )}
    </div>
  );
}

export default function CallSpecsPage() {
  const [specs, setSpecs] = useState<CallSpec[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "public" | "private">("all");
  const [modelFilter, setModelFilter] = useState<"all" | "system" | "byok">("all");
  const [sortBy, setSortBy] = useState<"newest" | "name_asc" | "name_desc" | "popular">("newest");

  // Lazyload / Pagination State
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);

  // Confirm Modal state for Spec duplication
  const [duplicateTarget, setDuplicateTarget] = useState<CallSpec | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const loadSpecs = () => {
    fetchCallSpecs().then((data) => {
      setSpecs(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadSpecs();
  }, []);

  // Summary Metrics Calculation
  const totalCount = specs.length;
  const publicCount = useMemo(() => specs.filter((s) => s.isPublished).length, [specs]);
  const privateCount = useMemo(() => specs.filter((s) => !s.isPublished).length, [specs]);
  const byokCount = useMemo(() => specs.filter((s) => s.useExternalApiKey).length, [specs]);

  // Filtering & Sorting Logic
  const filteredAndSortedSpecs = useMemo(() => {
    let result = [...specs];

    // Search query filter (name, slug, description)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.slug.toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (statusFilter === "public") {
      result = result.filter((s) => s.isPublished);
    } else if (statusFilter === "private") {
      result = result.filter((s) => !s.isPublished);
    }

    // Model type filter
    if (modelFilter === "byok") {
      result = result.filter((s) => s.useExternalApiKey);
    } else if (modelFilter === "system") {
      result = result.filter((s) => !s.useExternalApiKey);
    }

    // Sorting
    if (sortBy === "newest") {
      result.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    } else if (sortBy === "name_asc") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "name_desc") {
      result.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortBy === "popular") {
      result.sort((a, b) => ((b.likesCount || 0) + (b.forkCount || 0)) - ((a.likesCount || 0) + (a.forkCount || 0)));
    }

    return result;
  }, [specs, searchQuery, statusFilter, modelFilter, sortBy]);

  // Lazyloaded Visible Specs
  const visibleSpecs = useMemo(() => {
    return filteredAndSortedSpecs.slice(0, displayLimit);
  }, [filteredAndSortedSpecs, displayLimit]);

  const hasMore = displayLimit < filteredAndSortedSpecs.length;

  const handleLoadMore = () => {
    setDisplayLimit((prev) => prev + PAGE_SIZE);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setModelFilter("all");
    setSortBy("newest");
    setDisplayLimit(PAGE_SIZE);
  };

  const handleConfirmDuplicate = async () => {
    if (!duplicateTarget) return;
    setDuplicating(true);

    try {
      await duplicateCallSpec(duplicateTarget.id);
      setNotification({ message: `Call Spec '${duplicateTarget.name}' berhasil diduplikasi!`, type: "success" });
      setDuplicateTarget(null);
      loadSpecs();
    } catch (err: any) {
      setNotification({ message: err.message || "Gagal menduplikasi Call Spec", type: "error" });
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border text-xs font-extrabold flex items-center justify-between shadow-lg transition-all animate-in fade-in ${
            notification.type === "success"
              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              : "bg-rose-500/15 text-rose-300 border-rose-500/30"
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-xs underline opacity-80 hover:opacity-100">
            Tutup
          </button>
        </div>
      )}

      {/* Header & New Spec CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-[#e1b329]" />
            <span>Callcraft API Specifications</span>
          </h1>
          <p className="text-xs text-[#8b7e6d] dark:text-[#edd6bb]/70 mt-1">
            Desain skema respons dinamis, prompt ekstraksi, input PDF, dan aturan publikasi Pasar Template
          </p>
        </div>
        <Link
          href="/specs/new/builder"
          className="px-4 py-2.5 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 font-bold text-xs shadow-lg shadow-[#e1b329]/20 flex items-center justify-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Call Spec</span>
        </Link>
      </div>

      {/* Total & Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel p-4 rounded-2xl border border-[#edd6bb]/20 space-y-1">
          <span className="text-[10px] font-bold text-[#8b7e6d] uppercase tracking-wider">Total Specs</span>
          <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{totalCount}</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-1">
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <Globe className="w-3 h-3" />
            <span>Public</span>
          </span>
          <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{publicCount}</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-[#edd6bb]/20 space-y-1">
          <span className="text-[10px] font-bold text-[#8b7e6d] uppercase tracking-wider flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>Private</span>
          </span>
          <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{privateCount}</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-1">
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <Key className="w-3 h-3" />
            <span>BYOK Models</span>
          </span>
          <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400">{byokCount}</div>
        </div>
      </div>

      {/* Search, Filters & Sorting Bar */}
      <div className="glass-panel p-4 rounded-3xl border border-[#edd6bb]/20 shadow-xl space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#e1b329] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDisplayLimit(PAGE_SIZE);
              }}
              placeholder="Cari nama spec, slug, atau deskripsi..."
              className="w-full glass-panel border border-[#edd6bb]/25 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-slate-900 dark:text-[#edd6bb] placeholder:text-[#8b7e6d] font-medium focus:outline-none focus:border-[#e1b329]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Options */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Status Filter */}
            <div className="relative flex-1 sm:flex-initial">
              <select
                value={statusFilter}
                onChange={(e: any) => {
                  setStatusFilter(e.target.value);
                  setDisplayLimit(PAGE_SIZE);
                }}
                className="w-full appearance-none glass-panel border border-[#edd6bb]/25 rounded-2xl px-3.5 py-2.5 pr-8 text-xs text-slate-800 dark:text-[#edd6bb] font-bold focus:outline-none focus:border-[#e1b329] cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-white">Semua Status</option>
                <option value="public" className="bg-slate-900 text-white">Public Only</option>
                <option value="private" className="bg-slate-900 text-white">Private Only</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#e1b329] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Model Type Filter */}
            <div className="relative flex-1 sm:flex-initial">
              <select
                value={modelFilter}
                onChange={(e: any) => {
                  setModelFilter(e.target.value);
                  setDisplayLimit(PAGE_SIZE);
                }}
                className="w-full appearance-none glass-panel border border-[#edd6bb]/25 rounded-2xl px-3.5 py-2.5 pr-8 text-xs text-slate-800 dark:text-[#edd6bb] font-bold focus:outline-none focus:border-[#e1b329] cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-white">Semua Model</option>
                <option value="system" className="bg-slate-900 text-white">System Model</option>
                <option value="byok" className="bg-slate-900 text-white">Bring-Your-Own Key</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#e1b329] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Sort By */}
            <div className="relative flex-1 sm:flex-initial">
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="w-full appearance-none glass-panel border border-[#edd6bb]/25 rounded-2xl px-3.5 py-2.5 pr-8 text-xs text-slate-800 dark:text-[#edd6bb] font-bold focus:outline-none focus:border-[#e1b329] cursor-pointer"
              >
                <option value="newest" className="bg-slate-900 text-white">Urutkan: Terbaru</option>
                <option value="name_asc" className="bg-slate-900 text-white">Urutkan: Nama (A-Z)</option>
                <option value="name_desc" className="bg-slate-900 text-white">Urutkan: Nama (Z-A)</option>
                <option value="popular" className="bg-slate-900 text-white">Urutkan: Terpopuler</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-[#e1b329] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Active Filter Badges & Counter */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-semibold text-[#8b7e6d]">
          <span>
            Menampilkan <strong className="text-slate-900 dark:text-slate-100">{visibleSpecs.length}</strong> dari{" "}
            <strong className="text-[#e1b329]">{filteredAndSortedSpecs.length}</strong> Call Spec
          </span>

          {(searchQuery || statusFilter !== "all" || modelFilter !== "all" || sortBy !== "newest") && (
            <button
              onClick={resetFilters}
              className="text-[#e1b329] hover:underline font-bold flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Specs List Content */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#e1b329]" />
          <p className="text-xs mt-2 font-bold">Memuat Spesifikasi Callcraft...</p>
        </div>
      ) : filteredAndSortedSpecs.length === 0 ? (
        <div className="py-16 text-center text-slate-400 space-y-3 glass-panel p-8 rounded-3xl border border-[#edd6bb]/20">
          <Layers className="w-10 h-10 mx-auto text-[#e1b329]/50" />
          <p className="text-sm font-extrabold text-slate-200">Tidak ada Call Specification yang cocok.</p>
          <p className="text-xs text-[#8b7e6d]">Coba sesuaikan kata kunci pencarian atau reset filter yang terpasang.</p>
          <button
            onClick={resetFilters}
            className="px-4 py-2 rounded-xl bg-[#e1b329]/15 hover:bg-[#e1b329]/25 text-[#e1b329] border border-[#e1b329]/30 text-xs font-bold transition-all"
          >
            Reset Semua Filter
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleSpecs.map((spec) => (
              <div
                key={spec.id}
                className={`glass-panel glass-panel-hover p-6 rounded-3xl space-y-4 flex flex-col justify-between transition-all ${
                  spec.isPublished
                    ? "border border-emerald-500/40 bg-gradient-to-b from-emerald-500/5 to-transparent"
                    : "border border-[#edd6bb]/20"
                }`}
              >
                <div className="space-y-3">
                  {/* Status Badges Header */}
                  <div className="flex items-center justify-between gap-2">
                    {spec.isPublished ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold border border-emerald-500/40 flex items-center gap-1.5 shrink-0 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Public</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#8b7e6d]/15 text-[#8b7e6d] dark:text-[#edd6bb]/70 text-[10px] font-bold border border-[#edd6bb]/20 flex items-center gap-1 shrink-0">
                        <Lock className="w-3 h-3" />
                        <span>Private</span>
                      </span>
                    )}
                    <SlugBadge slug={spec.slug} />
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{spec.name}</h3>
                  <p className="text-xs text-[#8b7e6d] dark:text-[#edd6bb]/70 line-clamp-2 min-h-[2rem]">
                    {extractPlainTextFromMarkdown(spec.description) || "Tidak ada deskripsi yang disediakan."}
                  </p>

                  {/* Capability Badges */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-bold flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      <span>PDF & Vision</span>
                    </span>

                    {spec.useExternalApiKey ? (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20 text-[10px] font-bold flex items-center gap-1">
                        <Key className="w-3 h-3" />
                        <span>Bring-Your-Own Key</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        <span>System Model</span>
                      </span>
                    )}
                  </div>

                  {/* Marketplace Metrics if Published */}
                  {spec.isPublished && (
                    <div className="flex items-center gap-3 pt-2 text-xs font-bold text-[#8b7e6d] border-t border-[#edd6bb]/10">
                      <span className="flex items-center gap-1 text-rose-400">
                        <Heart className="w-3.5 h-3.5 fill-rose-400" />
                        <span>{spec.likesCount || 0}</span>
                      </span>
                      <span className="flex items-center gap-1 text-emerald-400">
                        <GitFork className="w-3.5 h-3.5" />
                        <span>{spec.forkCount || 0}</span>
                      </span>
                      <span className="flex items-center gap-1 text-amber-400">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{spec.ratingAvg?.toFixed(1) || "5.0"}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons Bar */}
                <div className="pt-4 border-t border-[#edd6bb]/15 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/specs/${spec.id}/builder`}
                      className="text-xs font-bold text-[#e1b329] hover:underline flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Open Visual Builder</span>
                    </Link>

                    {/* Duplicate / Clone Spec Button */}
                    <button
                      type="button"
                      onClick={() => setDuplicateTarget(spec)}
                      className="p-1.5 rounded-lg text-[#8a715e] dark:text-[#edd6bb] hover:text-[#e1b329] hover:bg-[#e1b329]/15 border border-transparent hover:border-[#e1b329]/30 transition-all flex items-center gap-1 text-xs font-semibold"
                      title="Duplikasi Call Spec ini"
                    >
                      <Copy className="w-4 h-4 text-[#e1b329]" />
                    </button>
                  </div>

                  {/* Single Publication Page Link */}
                  <Link
                    href={`/specs/${spec.id}/publish`}
                    className={`w-full py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                      spec.isPublished
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30"
                        : "bg-[#e1b329]/15 text-[#614600] dark:text-[#e1b329] hover:bg-[#e1b329]/25 border border-[#e1b329]/30"
                    }`}
                  >
                    {spec.isPublished ? (
                      <>
                        <Settings className="w-3.5 h-3.5" />
                        <span>Kelola Marketplace & Komentar</span>
                      </>
                    ) : (
                      <>
                        <Globe className="w-3.5 h-3.5" />
                        <span>Publikasikan ke Marketplace</span>
                      </>
                    )}
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Lazyload / Load More Button */}
          {hasMore && (
            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={handleLoadMore}
                className="px-6 py-3 rounded-2xl glass-panel hover:bg-[#e1b329]/15 text-[#8a715e] dark:text-[#edd6bb] hover:text-[#e1b329] text-xs font-extrabold border border-[#edd6bb]/25 shadow-lg flex items-center gap-2 mx-auto transition-all transform active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-[#e1b329]" />
                <span>Muat Lebih Banyak Call Spec ({filteredAndSortedSpecs.length - visibleSpecs.length} tersisa)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Global Professional Confirm Alert Modal */}
      <ConfirmModal
        isOpen={!!duplicateTarget}
        title="Duplikasi Call Spec"
        message={`Apakah Anda yakin ingin menduplikasi Call Spec '${duplicateTarget?.name}'? Call Spec baru akan dibuat secara otomatis sebagai salinan terpisah.`}
        confirmText="Ya, Duplikasi"
        cancelText="Batal"
        isLoading={duplicating}
        icon="copy"
        variant="primary"
        onConfirm={handleConfirmDuplicate}
        onCancel={() => setDuplicateTarget(null)}
      />
    </div>
  );
}
