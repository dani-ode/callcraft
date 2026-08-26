"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Globe,
  Lock,
  Heart,
  GitFork,
  Star,
  MessageSquare,
  Upload,
  RefreshCw,
  Trash2,
  CheckCircle2,
  FileText,
  Eye,
  Edit3,
  Loader2,
  Sparkles,
  Shield,
  Layers,
  X,
} from "lucide-react";
import {
  fetchSpecPublicationSettings,
  updateSpecPublicationSettings,
  deleteTemplateComment,
} from "@/lib/api-client";
import { CallSpec, Template, TemplateComment } from "@/lib/types";
import { MarkdownEditorWithPreview } from "@/components/markdown-editor";

export default function SpecPublicationPage() {
  const params = useParams();
  const router = useRouter();
  const specId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [spec, setSpec] = useState<CallSpec | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [comments, setComments] = useState<TemplateComment[]>([]);

  // Publication Form State
  const [isPublished, setIsPublished] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("finance");
  const [description, setDescription] = useState("");
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");

  // Notification Banner
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadPublicationData();
  }, [specId]);

  async function loadPublicationData() {
    setLoading(true);
    try {
      const data = await fetchSpecPublicationSettings(specId);
      setSpec(data.spec);
      setTemplate(data.template);
      setComments(data.comments || []);

      setIsPublished(data.spec.isPublished || false);
      setTitle(data.template?.name || data.spec.name);
      setCategory(data.template?.category || "finance");
      setDescription(
        data.template?.description ||
          `# ${data.spec.name}\n\n## Description\n${data.spec.description || 'High-precision Callcraft AI vision extraction specification.'}\n\n## Target Output Schema\nExecute this Call Spec directly using the Callcraft data plane gateway.\n\n## Example Request\n\`\`\`bash\ncurl -X POST http://localhost:8081/v1/call \\\n  -H "Authorization: Bearer call_sk_live_..." \\\n  -H "X-USER-ID: usr_demo" \\\n  -H "X-CALL-SPEC-ID: ${data.spec.slug}"\n\`\`\``
      );
    } catch (err: any) {
      setNotification({ message: err.message || "Failed to load publication settings", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleTogglePublication(targetState?: boolean) {
    const nextState = targetState !== undefined ? targetState : !isPublished;
    setSaving(true);

    try {
      await updateSpecPublicationSettings(specId, {
        isPublished: nextState,
        name: title.trim(),
        category,
        description,
      });

      setIsPublished(nextState);
      setNotification({
        message: nextState
          ? "Call Spec berhasil dipublikasikan ke Pasar Template!"
          : "Call Spec ditarik dari Pasar Template (Draft).",
        type: "success",
      });
      loadPublicationData();
    } catch (err: any) {
      setNotification({ message: err.message || "Gagal memperbarui status publikasi", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePublication(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      await updateSpecPublicationSettings(specId, {
        isPublished,
        name: title.trim(),
        category,
        description,
      });

      setNotification({ message: "Pengaturan publikasi berhasil diperbarui!", type: "success" });
      loadPublicationData();
    } catch (err: any) {
      setNotification({ message: err.message || "Gagal memperbarui publikasi", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm("Apakah Anda yakin ingin menghapus/memoderasi komentar ini?")) return;

    try {
      await deleteTemplateComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setNotification({ message: "Komentar berhasil dihapus!", type: "success" });
    } catch (err: any) {
      setNotification({ message: err.message || "Gagal menghapus komentar", type: "error" });
    }
  }

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 max-w-4xl mx-auto space-y-3">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#e1b329]" />
        <p className="text-xs font-semibold">Memuat Pengaturan Publikasi Spec...</p>
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="py-24 text-center max-w-xl mx-auto space-y-4 glass-panel p-8 rounded-3xl border border-[#edd6bb]/20">
        <Layers className="w-10 h-10 mx-auto text-slate-500" />
        <h3 className="text-base font-bold text-slate-200">Call Spec Tidak Ditemukan</h3>
        <Link href="/specs" className="text-xs font-bold text-[#e1b329] hover:underline">
          Kembali ke Katalog Call Specs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
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

      {/* Header Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link href="/specs" className="text-xs font-bold text-[#8b7e6d] hover:text-[#e1b329] flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Call Specs</span>
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <span>Pengaturan Marketplace & Publikasi:</span>
            <span className="gradient-text">{spec.name}</span>
          </h1>
          <p className="text-xs text-[#8b7e6d]">Kelola status publikasi, dokumentasi Markdown, dan moderasikan komentar komunitas</p>
        </div>

        <Link
          href={`/specs/${specId}/builder`}
          className="px-4 py-2 rounded-xl glass-panel hover:bg-[#edd6bb]/10 text-xs font-bold border border-[#edd6bb]/20 flex items-center gap-1.5"
        >
          <Edit3 className="w-3.5 h-3.5 text-[#e1b329]" />
          <span>Buka Visual Builder</span>
        </Link>
      </div>

      {/* Publication Hero Banner */}
      <div
        className={`p-6 rounded-3xl border glass-panel transition-all space-y-4 ${
          isPublished
            ? "border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-[#1c1713] to-[#120e0b]"
            : "border-[#edd6bb]/20"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-lg ${
                isPublished ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-[#8b7e6d]/20 text-[#8b7e6d]"
              }`}
            >
              {isPublished ? <Globe className="w-6 h-6 animate-pulse" /> : <Lock className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-[#edd6bb]">
                  Status: {isPublished ? "Terpublikasi di Pasar (Public)" : "Privat (Draft)"}
                </h3>
                {isPublished && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                    Live Marketplace
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8b7e6d] dark:text-[#edd6bb]/70 mt-0.5">
                {isPublished
                  ? "Call Spec ini dapat ditemukan, difork, dan diulas oleh developer di Pasar Template."
                  : "Call Spec ini bersifat privat dan hanya dapat diakses oleh akun API milik Anda."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleTogglePublication()}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shadow-md transform active:scale-95 ${
                isPublished
                  ? "bg-rose-600 hover:bg-rose-700 text-white border border-rose-500 shadow-rose-600/20"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 shadow-emerald-600/20"
              }`}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isPublished ? (
                <Lock className="w-4 h-4" />
              ) : (
                <Globe className="w-4 h-4" />
              )}
              <span>{isPublished ? "Tarik dari Pasar (Unpublish)" : "Publikasikan Sekarang"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Marketplace Metrics Grid */}
      {template && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-[#edd6bb]/15 space-y-2">
            <div className="flex items-center justify-between text-[#8b7e6d]">
              <span className="text-xs font-medium">Total Likes</span>
              <Heart className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-2xl font-extrabold text-rose-400">{template.likesCount || 0}</p>
            <p className="text-[11px] text-[#8b7e6d]">Loved by community</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-[#edd6bb]/15 space-y-2">
            <div className="flex items-center justify-between text-[#8b7e6d]">
              <span className="text-xs font-medium">Total Forks</span>
              <GitFork className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-extrabold text-emerald-400">{template.forkCount || 0}</p>
            <p className="text-[11px] text-[#8b7e6d]">Used as specification base</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-[#edd6bb]/15 space-y-2">
            <div className="flex items-center justify-between text-[#8b7e6d]">
              <span className="text-xs font-medium">Average Rating</span>
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
            <p className="text-2xl font-extrabold text-amber-400">{template.ratingAvg?.toFixed(2) || "5.00"}</p>
            <p className="text-[11px] text-[#8b7e6d]">Out of 5.0 stars</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-[#edd6bb]/15 space-y-2">
            <div className="flex items-center justify-between text-[#8b7e6d]">
              <span className="text-xs font-medium">Reviews & Comments</span>
              <MessageSquare className="w-4 h-4 text-[#e1b329]" />
            </div>
            <p className="text-2xl font-extrabold text-[#edd6bb]">{comments.length}</p>
            <p className="text-[11px] text-[#8b7e6d]">Developer feedback</p>
          </div>
        </div>
      )}

      {/* Main Publication Settings Form & Markdown Editor */}
      <form onSubmit={handleSavePublication} className="space-y-6">
        <div className="glass-panel p-6 rounded-3xl border border-[#edd6bb]/20 space-y-5">
          <div className="flex items-center justify-between border-b border-[#edd6bb]/15 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-[#edd6bb]">Pengaturan Metadata & Dokumentasi Markdown</h3>
              <p className="text-xs text-[#8b7e6d]">Sesuaikan judul publik, kategori, dan isi file panduan Markdown</p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] disabled:opacity-50 text-slate-950 font-extrabold text-xs shadow-md shadow-[#e1b329]/20 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>Simpan & Push Perubahan</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#edd6bb] block mb-1">Judul Tampilan Pasar</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 rounded-xl bg-[#120e0b]/70 border border-[#edd6bb]/20 text-xs text-[#edd6bb] focus:outline-none focus:border-[#e1b329]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#edd6bb] block mb-1">Kategori Pasar</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-3 rounded-xl bg-[#120e0b]/70 border border-[#edd6bb]/20 text-xs font-bold text-[#edd6bb] focus:outline-none focus:border-[#e1b329]"
              >
                <option value="finance">Finance & Invoices</option>
                <option value="identity">Identity & OCR</option>
                <option value="retail">Retail & Receipts</option>
                <option value="medical">Medical & Health</option>
                <option value="custom">Custom Community</option>
              </select>
            </div>
          </div>

          {/* Markdown Content Editor */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-[#edd6bb] flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#e1b329]" />
              <span>Isi Dokumentasi README & Spesifikasi (File Markdown)</span>
            </label>

            <MarkdownEditorWithPreview
              value={description}
              onChange={(val) => setDescription(val)}
              minRows={14}
            />
          </div>
        </div>
      </form>

      {/* Community Comments Moderation Section */}
      <div className="glass-panel p-6 rounded-3xl border border-[#edd6bb]/20 space-y-5">
        <div className="flex items-center justify-between border-b border-[#edd6bb]/15 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-[#edd6bb]">Kelola & Moderasikan Komentar Ulasan Komunitas</h3>
            <p className="text-xs text-[#8b7e6d]">Hapus komentar atau ulasan yang tidak pantas dari template ini</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#e1b329]/15 text-[#e1b329] text-xs font-bold">
            {comments.length} Komentar Total
          </span>
        </div>

        {comments.length === 0 ? (
          <p className="text-xs text-[#8b7e6d] italic text-center py-6">Belum ada komentar atau ulasan untuk spec terpublikasi ini.</p>
        ) : (
          <div className="divide-y divide-[#edd6bb]/15">
            {comments.map((cmt) => (
              <div key={cmt.id} className="py-4 flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[#edd6bb]">{cmt.authorName}</span>
                    <div className="flex items-center gap-1 text-amber-400 font-bold text-xs">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{cmt.rating} / 5</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#8b7e6d]">
                      {cmt.createdAt ? new Date(cmt.createdAt).toLocaleString() : "Just now"}
                    </span>
                  </div>
                  <p className="text-xs text-[#8b7e6d] dark:text-[#edd6bb]/80">{cmt.comment}</p>
                </div>

                <button
                  onClick={() => handleDeleteComment(cmt.id)}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/20 flex items-center gap-1 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus / Moderasi</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
