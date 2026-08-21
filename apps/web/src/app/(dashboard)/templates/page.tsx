"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Sparkles,
  Heart,
  GitFork,
  Star,
  MessageSquare,
  Upload,
  CheckCircle2,
  Share2,
  Code2,
  Feather,
  Loader2,
  Plus,
  Send,
  X,
  Filter,
  Layers,
} from "lucide-react";
import {
  fetchTemplates,
  forkTemplate,
  toggleLikeTemplate,
  fetchTemplateComments,
  addTemplateComment,
  fetchCallSpecs,
  publishTemplate,
} from "@/lib/api-client";
import { Template, TemplateComment, CallSpec } from "@/lib/types";

const CATEGORIES = [
  { id: "all", label: "All Templates" },
  { id: "finance", label: "Finance & Invoices" },
  { id: "identity", label: "Identity & OCR" },
  { id: "retail", label: "Retail & Receipts" },
  { id: "medical", label: "Medical & Health" },
  { id: "custom", label: "Community Custom" },
];

export default function TemplateMarketplacePage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("popular");

  // Selected Template for Comments Drawer
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [comments, setComments] = useState<TemplateComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Publish Spec Modal State
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [userSpecs, setUserSpecs] = useState<CallSpec[]>([]);
  const [selectedSpecId, setSelectedSpecId] = useState("");
  const [publishCode, setPublishCode] = useState("");
  const [publishName, setPublishName] = useState("");
  const [publishDescription, setPublishDescription] = useState("");
  const [publishCategory, setPublishCategory] = useState("finance");
  const [publishing, setPublishing] = useState(false);

  // Notification Banner State
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [activeCategory, sortBy]);

  async function loadTemplates() {
    setLoading(true);
    const data = await fetchTemplates(activeCategory, searchQuery, sortBy);
    setTemplates(data);
    setLoading(false);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadTemplates();
  }

  async function handleLikeToggle(tmpl: Template) {
    try {
      const res = await toggleLikeTemplate(tmpl.id);
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === tmpl.id
            ? { ...t, isLiked: res.is_liked, likesCount: res.likes_count }
            : t
        )
      );
    } catch (err: any) {
      setNotification({ message: err.message || "Failed to toggle like", type: "error" });
    }
  }

  async function handleForkTemplate(tmpl: Template) {
    try {
      const res = await forkTemplate(tmpl.id);
      setNotification({ message: `Successfully forked '${tmpl.name}'! Redirecting to Specs...`, type: "success" });
      setTimeout(() => {
        router.push("/specs");
      }, 1500);
    } catch (err: any) {
      setNotification({ message: err.message || "Failed to fork template", type: "error" });
    }
  }

  async function openCommentsDrawer(tmpl: Template) {
    setSelectedTemplate(tmpl);
    setLoadingComments(true);
    const data = await fetchTemplateComments(tmpl.id);
    setComments(data);
    setLoadingComments(false);
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTemplate || !newCommentText.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await addTemplateComment({
        templateId: selectedTemplate.id,
        rating: newRating,
        comment: newCommentText.trim(),
        authorName: "Active Developer",
      });

      setComments((prev) => [res, ...prev]);
      setNewCommentText("");
      
      // Update template card rating & count
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === selectedTemplate.id
            ? { ...t, ratingAvg: res.ratingAvg, reviewsCount: res.reviewsCount }
            : t
        )
      );

      setNotification({ message: "Review posted successfully!", type: "success" });
    } catch (err: any) {
      setNotification({ message: err.message || "Failed to post comment", type: "error" });
    } finally {
      setSubmittingComment(false);
    }
  }

  async function openPublishModal() {
    setIsPublishModalOpen(true);
    const specs = await fetchCallSpecs();
    setUserSpecs(specs);
    if (specs.length > 0) {
      setSelectedSpecId(specs[0].id);
      setPublishName(specs[0].name);
      setPublishCode(specs[0].slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
      setPublishDescription(specs[0].description || "");
    }
  }

  async function handlePublishSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSpecId || !publishCode.trim() || !publishName.trim()) return;

    setPublishing(true);
    try {
      await publishTemplate({
        callSpecId: selectedSpecId,
        code: publishCode.trim().toLowerCase(),
        name: publishName.trim(),
        description: publishDescription.trim(),
        category: publishCategory,
      });

      setIsPublishModalOpen(false);
      setNotification({ message: "Call Spec published to Marketplace successfully!", type: "success" });
      loadTemplates();
    } catch (err: any) {
      setNotification({ message: err.message || "Failed to publish template", type: "error" });
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-lg ${
            notification.type === "success"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e1b329]/15 border border-[#e1b329]/30 text-[#ffb443] text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#e1b329]" />
            <span>Community Template Marketplace</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#edd6bb]">Pasar Template Callcraft</h1>
          <p className="text-xs text-[#8b7e6d] dark:text-[#edd6bb]/70 mt-1">
            Jelajahi, sukai (love), ulas, dan fork template JSON schema buatan komunitas developer Callcraft
          </p>
        </div>

        <button
          onClick={openPublishModal}
          className="px-5 py-3 rounded-2xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 font-extrabold text-xs shadow-xl shadow-[#e1b329]/20 flex items-center gap-2 transition-all self-start md:self-auto transform hover:-translate-y-0.5"
        >
          <Upload className="w-4 h-4" />
          <span>Publikasikan Spec Saya</span>
        </button>
      </div>

      {/* Search & Sorting Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center glass-panel p-4 rounded-2xl border border-[#edd6bb]/20">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
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

      {/* Templates Marketplace Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#e1b329]" />
          <p className="text-xs mt-3">Loading Template Marketplace...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="py-20 text-center glass-panel rounded-3xl border border-[#edd6bb]/20 space-y-3">
          <Layers className="w-10 h-10 mx-auto text-slate-600" />
          <p className="text-sm font-bold text-slate-300">Belum ada template pada kategori ini.</p>
          <button
            onClick={openPublishModal}
            className="text-xs text-[#e1b329] font-bold hover:underline"
          >
            Jadilah yang pertama mempublikasikan template!
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="glass-panel glass-panel-hover p-6 rounded-3xl border border-[#edd6bb]/20 flex flex-col justify-between space-y-4 relative group"
            >
              <div className="space-y-3">
                {/* Header Badge & Author */}
                <div className="flex items-center justify-between">
                  {tmpl.isOfficial ? (
                    <span className="px-2.5 py-1 rounded-full bg-[#e1b329]/20 text-[#e1b329] text-[10px] font-extrabold border border-[#e1b329]/30 flex items-center gap-1">
                      <Feather className="w-3 h-3 text-[#e1b329]" />
                      <span>Official Callcraft</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
                      Community Spec
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-[#8b7e6d] font-semibold">{tmpl.category.toUpperCase()}</span>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-base font-extrabold text-[#edd6bb] group-hover:text-[#ffb443] transition-colors">
                    {tmpl.name}
                  </h3>
                  <p className="text-xs text-[#8b7e6d] dark:text-[#edd6bb]/70 mt-1 line-clamp-2 leading-relaxed">
                    {tmpl.description || "Indonesian multimodal extraction specification template."}
                  </p>
                </div>

                {/* Stats Bar (Rating, Likes, Forks) */}
                <div className="flex items-center gap-4 py-2 border-y border-[#edd6bb]/15 text-xs text-[#8b7e6d]">
                  <div className="flex items-center gap-1 font-bold text-amber-400">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{tmpl.ratingAvg?.toFixed(1) || "5.0"}</span>
                  </div>

                  <button
                    onClick={() => handleLikeToggle(tmpl)}
                    className={`flex items-center gap-1 font-bold transition-all ${
                      tmpl.isLiked ? "text-rose-500" : "hover:text-rose-400"
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${tmpl.isLiked ? "fill-rose-500" : ""}`} />
                    <span>{tmpl.likesCount || 0}</span>
                  </button>

                  <div className="flex items-center gap-1 font-bold text-emerald-400">
                    <GitFork className="w-3.5 h-3.5" />
                    <span>{tmpl.forkCount || 0} Forks</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  onClick={() => openCommentsDrawer(tmpl)}
                  className="px-3 py-2 rounded-xl glass-panel hover:bg-[#edd6bb]/10 text-xs font-semibold text-[#edd6bb]/80 flex items-center gap-1.5 border border-[#edd6bb]/20"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#e1b329]" />
                  <span>Ulasan ({tmpl.reviewsCount || 0})</span>
                </button>

                <button
                  onClick={() => handleForkTemplate(tmpl)}
                  className="px-4 py-2 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 font-extrabold text-xs shadow-md shadow-[#e1b329]/20 flex items-center gap-1.5 transition-all transform active:scale-95"
                >
                  <GitFork className="w-3.5 h-3.5" />
                  <span>Use / Fork</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comments & Review Drawer Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-lg bg-[#191410] border-l border-[#edd6bb]/20 h-full p-6 flex flex-col justify-between overflow-y-auto space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#edd6bb]/15 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-[#e1b329] uppercase tracking-wider">Pasar Template Ulasan</span>
                  <h3 className="text-lg font-extrabold text-[#edd6bb]">{selectedTemplate.name}</h3>
                </div>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="p-1 rounded-lg glass-panel hover:bg-[#edd6bb]/10 text-[#8b7e6d]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Write Review Form */}
              <form onSubmit={handleAddComment} className="glass-panel p-4 rounded-2xl border border-[#edd6bb]/20 space-y-3">
                <span className="text-xs font-bold text-[#edd6bb]">Tulis Ulasan & Rating</span>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setNewRating(star)}
                      className="p-1 hover:scale-110 transition-all"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= newRating ? "fill-amber-400 text-amber-400" : "text-[#8b7e6d]"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-amber-400 ml-2">{newRating} Bintang</span>
                </div>

                <textarea
                  rows={3}
                  placeholder="Tulis ulasan Anda mengenai kepresisian template schema ini..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[#120e0b]/60 border border-[#edd6bb]/20 text-xs text-[#edd6bb] placeholder-[#8b7e6d] focus:outline-none focus:border-[#e1b329]"
                />

                <button
                  type="submit"
                  disabled={submittingComment || !newCommentText.trim()}
                  className="w-full py-2.5 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] disabled:opacity-50 text-slate-950 font-extrabold text-xs shadow-md shadow-[#e1b329]/20 flex items-center justify-center gap-2"
                >
                  {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Kirim Ulasan</span>
                </button>
              </form>

              {/* Existing Comments List */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-[#8b7e6d] uppercase tracking-wider">
                  Daftar Diskusi Komunitas ({comments.length})
                </h4>

                {loadingComments ? (
                  <div className="py-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#e1b329]" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-xs text-[#8b7e6d] italic py-4 text-center">Belum ada ulasan untuk template ini.</p>
                ) : (
                  comments.map((cmt) => (
                    <div key={cmt.id} className="glass-panel p-4 rounded-2xl border border-[#edd6bb]/15 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#edd6bb]">{cmt.authorName}</span>
                        <div className="flex items-center gap-1 text-amber-400 font-bold text-xs">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{cmt.rating}</span>
                        </div>
                      </div>
                      <p className="text-xs text-[#8b7e6d] dark:text-[#edd6bb]/80 leading-relaxed">{cmt.comment}</p>
                      <p className="text-[10px] text-[#8b7e6d] font-mono">{cmt.createdAt ? new Date(cmt.createdAt).toLocaleDateString() : "Just now"}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Publish Spec Modal */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#191410] border border-[#edd6bb]/25 rounded-3xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#edd6bb]/15 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-[#edd6bb]">Publikasikan Spec ke Pasar</h3>
                <p className="text-xs text-[#8b7e6d]">Bagikan Call Spec buatan Anda ke seluruh komunitas developer</p>
              </div>
              <button onClick={() => setIsPublishModalOpen(false)} className="p-1 rounded-lg glass-panel text-[#8b7e6d]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublishSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#edd6bb] block mb-1">Pilih Call Spec</label>
                <select
                  value={selectedSpecId}
                  onChange={(e) => {
                    setSelectedSpecId(e.target.value);
                    const found = userSpecs.find((s) => s.id === e.target.value);
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
                  onClick={() => setIsPublishModalOpen(false)}
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
        </div>
      )}
    </div>
  );
}
