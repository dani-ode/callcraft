"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Star,
  Heart,
  Copy,
  MessageSquare,
  Sparkles,
  Code2,
  Share2,
  Check,
  Loader2,
  FileText,
  User as UserIcon,
  Globe,
  Layers,
  Send,
  Trash2,
  Wrench,
  FileJson,
  Bot,
} from "lucide-react";
import {
  fetchTemplateDetail,
  forkTemplate,
  toggleLikeTemplate,
  fetchTemplateComments,
  addTemplateComment,
  deleteTemplateComment,
  getActiveUserId,
} from "@/lib/api-client";
import { Template, TemplateComment } from "@/lib/types";
import { MarkdownRenderer } from "@/components/markdown-editor";
import { useAuth } from "@/context/auth-context";

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const { user } = useAuth();
  const currentUserId = user?.id || getActiveUserId();

  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<Template | null>(null);
  const [comments, setComments] = useState<TemplateComment[]>([]);

  // Action states
  const [cloning, setCloning] = useState(false);
  const [liking, setLiking] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<
    "readme" | "request_schema" | "schema" | "toolcalling" | "request" | "reviews"
  >("readme");

  // Comment Posting Form State
  const [newRating, setNewRating] = useState(5);
  const [newCommentText, setNewCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Notification Banner
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (templateId) {
      loadData();
    }
  }, [templateId]);

  async function loadData() {
    setLoading(true);
    try {
      const data = await fetchTemplateDetail(templateId);
      if (data) {
        setTemplate(data);
        setIsLiked(data.isLiked || false);
        setLikesCount(data.likesCount || 0);

        const cmtData = await fetchTemplateComments(data.id);
        setComments(cmtData);
      } else {
        setNotification({ message: "Template tidak ditemukan", type: "error" });
      }
    } catch (err: any) {
      setNotification({ message: err.message || "Gagal memuat detail template", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleClone() {
    if (!template) return;
    if (template.userId && template.userId === currentUserId) {
      setNotification({ message: "Anda pemilik template ini.", type: "error" });
      return;
    }

    setCloning(true);
    try {
      const res = await forkTemplate(template.id);
      setNotification({ message: `Template "${template.name}" berhasil di-clone ke katalog Anda!`, type: "success" });
      if (res?.spec?.id) {
        setTimeout(() => {
          router.push(`/specs/${res.spec.id}/builder`);
        }, 800);
      }
    } catch (err: any) {
      setNotification({ message: err.message || "Gagal meng-clone template", type: "error" });
    } finally {
      setCloning(false);
    }
  }

  async function handleToggleLike() {
    if (!template || liking) return;
    setLiking(true);
    try {
      const res = await toggleLikeTemplate(template.id);
      setIsLiked(res.is_liked);
      setLikesCount(res.likes_count);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLiking(false);
    }
  }

  function handleShareLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  async function handlePostComment(e: React.FormEvent) {
    e.preventDefault();
    if (!template || !newCommentText.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      const created = await addTemplateComment({
        templateId: template.id,
        rating: newRating,
        comment: newCommentText.trim(),
        authorName: user?.name || user?.email || "Developer",
      });
      setComments((prev) => [created, ...prev]);
      setNewCommentText("");
      setNewRating(5);
      setNotification({ message: "Ulasan Anda berhasil dikirim!", type: "success" });
    } catch (err: any) {
      setNotification({ message: err.message || "Gagal mengirim ulasan", type: "error" });
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm("Apakah Anda yakin ingin menghapus ulasan ini?")) return;
    try {
      await deleteTemplateComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setNotification({ message: "Ulasan berhasil dihapus", type: "success" });
    } catch (err: any) {
      setNotification({ message: err.message || "Gagal menghapus ulasan", type: "error" });
    }
  }

  function parseSchemaObj(schemaRaw: any) {
    if (!schemaRaw) return { type: "object", properties: {}, required: [] };
    if (typeof schemaRaw === "string") {
      try {
        return JSON.parse(schemaRaw);
      } catch {
        return { type: "object", properties: {}, required: [] };
      }
    }
    return schemaRaw;
  }

  /* TAB 2: INPUT REQUEST SCHEMA */
  const renderRequestSchemaTab = () => {
    const reqSchema = parseSchemaObj(template?.requestSchema);
    const propsMap = reqSchema.properties || {};
    const requiredList = Array.isArray(reqSchema.required) ? reqSchema.required : [];
    const entries = Object.entries(propsMap);

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between border-b border-[#edd6bb]/20 pb-4 gap-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-[#edd6bb]">Input Request Body Schema</h3>
            <p className="text-xs text-[#8b7e6d]">Format dan spesifikasi properti payload JSON yang dapat dikirim saat memanggil API Call Spec ini</p>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(reqSchema, null, 2));
              setNotification({ message: "Input Request Schema berhasil disalin ke clipboard!", type: "success" });
            }}
            className="px-4 py-2 rounded-xl glass-panel border border-[#edd6bb]/30 text-xs font-extrabold text-[#b8860b] dark:text-[#e1b329] flex items-center gap-1.5 hover:bg-[#e1b329]/10 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Request Schema</span>
          </button>
        </div>

        {/* Visual Property Breakdown Cards */}
        <div className="space-y-3">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#8b7e6d] font-mono flex items-center gap-2">
            <FileJson className="w-3.5 h-3.5 text-[#e1b329]" />
            <span>Parameter Payload Terdaftar ({entries.length})</span>
          </h4>

          {entries.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#fcfaf7] dark:bg-[#0d0907] border border-[#edd6bb]/30 text-center">
              <p className="text-xs text-[#8b7e6d] italic">Tidak ada properti kustom terdaftar pada Request Schema ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {entries.map(([key, val]: [string, any]) => {
                const isReq = requiredList.includes(key) || val?.required === true;
                const propType = val?.type || "string";
                const desc = val?.description || (key === "image" ? "Base64 string or URL of input document/image" : "Standard request field");

                return (
                  <div
                    key={key}
                    className="p-4 rounded-2xl glass-panel border border-[#edd6bb]/40 dark:border-[#edd6bb]/20 bg-[#fcfaf7] dark:bg-[#0d0907] space-y-1.5 shadow-sm hover:border-[#e1b329]/40 transition-all"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-xs font-extrabold text-[#b8860b] dark:text-[#ffb443] bg-[#e1b329]/10 px-2.5 py-0.5 rounded-lg border border-[#e1b329]/20">
                          {key}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800">
                          {propType}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md font-mono ${
                          isReq
                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                            : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                        }`}
                      >
                        {isReq ? "Required" : "Optional"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-[#edd6bb]/90">{desc}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Raw JSON Schema Container */}
        <div className="space-y-2 pt-2 border-t border-[#edd6bb]/20">
          <span className="text-xs font-bold text-slate-900 dark:text-[#edd6bb] block font-mono">Raw Request JSON Schema Definition:</span>
          <pre className="p-6 rounded-2xl bg-[#0d0907] border border-[#edd6bb]/20 text-xs font-mono text-emerald-400 leading-relaxed overflow-x-auto">
            {JSON.stringify(reqSchema, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  /* TAB 3: OUTPUT JSON RESPONSE SCHEMA */
  const renderResponseSchemaTab = () => {
    const resSchema = parseSchemaObj(template?.responseSchema);
    const propsMap = resSchema.properties || {};
    const entries = Object.entries(propsMap);

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between border-b border-[#edd6bb]/20 pb-4 gap-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-[#edd6bb]">Output Target JSON Response Schema</h3>
            <p className="text-xs text-[#8b7e6d]">Skema struktur data JSON yang dihasilkan secara deterministik oleh Call Spec ini</p>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(resSchema, null, 2));
              setNotification({ message: "Response Schema berhasil disalin ke clipboard!", type: "success" });
            }}
            className="px-4 py-2 rounded-xl glass-panel border border-[#edd6bb]/30 text-xs font-extrabold text-[#b8860b] dark:text-[#e1b329] flex items-center gap-1.5 hover:bg-[#e1b329]/10 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Response Schema</span>
          </button>
        </div>

        {/* Visual Property Breakdown Cards */}
        <div className="space-y-3">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#8b7e6d] font-mono flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#e1b329]" />
            <span>Struktur Field Output Terdaftar ({entries.length})</span>
          </h4>

          {entries.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#fcfaf7] dark:bg-[#0d0907] border border-[#edd6bb]/30 text-center">
              <p className="text-xs text-[#8b7e6d] italic">Tidak ada properti terdaftar pada Response Schema ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {entries.map(([key, val]: [string, any]) => {
                const isReq = val?.required === true;
                const propType = val?.type || "string";
                const desc = val?.description || (isReq ? "Field wajib diekstraksi" : "Field opsional");

                return (
                  <div
                    key={key}
                    className="p-4 rounded-2xl glass-panel border border-[#edd6bb]/40 dark:border-[#edd6bb]/20 bg-[#fcfaf7] dark:bg-[#0d0907] space-y-1.5 shadow-sm hover:border-[#e1b329]/40 transition-all"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-xs font-extrabold text-[#b8860b] dark:text-[#ffb443] bg-[#e1b329]/10 px-2.5 py-0.5 rounded-lg border border-[#e1b329]/20">
                          {key}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800">
                          {propType}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md font-mono ${
                          isReq
                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                            : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                        }`}
                      >
                        {isReq ? "Required" : "Optional"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-[#edd6bb]/90">{desc}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Raw JSON Schema Container */}
        <div className="space-y-2 pt-2 border-t border-[#edd6bb]/20">
          <span className="text-xs font-bold text-slate-900 dark:text-[#edd6bb] block font-mono">Raw Response JSON Schema Definition:</span>
          <pre className="p-6 rounded-2xl bg-[#0d0907] border border-[#edd6bb]/20 text-xs font-mono text-emerald-400 leading-relaxed overflow-x-auto">
            {JSON.stringify(resSchema, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 max-w-4xl mx-auto space-y-3">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#e1b329]" />
        <p className="text-xs font-semibold">Memuat Detail Template Callcraft...</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="py-20 text-center space-y-4 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
          <Globe className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-[#edd6bb]">Template Tidak Ditemukan</h2>
        <p className="text-xs text-[#8b7e6d]">Template yang Anda cari mungkin telah dihapus atau ditarik oleh pembuatnya.</p>
        <Link
          href="/templates"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e1b329] text-slate-950 font-extrabold text-xs shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Pasar Template</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2 ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-xs opacity-70 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Breadcrumb Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/templates"
          className="text-xs font-extrabold text-[#8b7e6d] hover:text-[#e1b329] flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Pasar Template</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-extrabold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Public Marketplace</span>
          </span>
          {(template.categories && template.categories.length > 0 ? template.categories : [template.category]).slice(0, 3).map((cat, idx) => (
            <span key={idx} className="px-3 py-1 rounded-full bg-[#e1b329]/15 text-[#b8860b] dark:text-[#e1b329] border border-[#e1b329]/30 text-[11px] font-extrabold uppercase tracking-wider font-mono">
              {cat}
            </span>
          ))}
        </div>
      </div>

      {/* Hero Card Container */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#edd6bb]/30 dark:border-[#edd6bb]/20 space-y-6 shadow-2xl bg-[#fcfaf7]/80 dark:bg-[#14100c]/80">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2 font-mono text-xs text-[#8b7e6d]">
              <Code2 className="w-4 h-4 text-[#e1b329]" />
              <span className="font-bold text-[#b8860b] dark:text-[#ffb443]">{template.code}</span>
              {template.authorName && (
                <>
                  <span>•</span>
                  <Link
                    href={`/users/${template.userId}`}
                    className="flex items-center gap-1 hover:text-[#e1b329] transition-colors"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>by {template.authorName}</span>
                  </Link>
                </>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#edd6bb] tracking-tight">
              {template.name}
            </h1>

            {/* Live Stats Bar */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-[#8b7e6d]">
              <div className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400 bg-amber-400/10 px-3 py-1 rounded-xl border border-amber-400/20">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{template.ratingAvg?.toFixed(1) || "5.0"} ({template.reviewsCount || 0} rating)</span>
              </div>

              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
                <Copy className="w-4 h-4" />
                <span>{template.forkCount || 0} Clones</span>
              </div>

              <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 bg-rose-500/10 px-3 py-1 rounded-xl border border-rose-500/20">
                <Heart className="w-4 h-4 fill-rose-500/30" />
                <span>{likesCount} Likes</span>
              </div>

              <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 bg-sky-500/10 px-3 py-1 rounded-xl border border-sky-500/20">
                <MessageSquare className="w-4 h-4" />
                <span>{comments.length} Komentar Komunitas</span>
              </div>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleShareLink}
              className="p-3 rounded-2xl glass-panel border border-[#edd6bb]/30 dark:border-[#edd6bb]/20 text-[#8b7e6d] hover:text-[#e1b329] hover:border-[#e1b329]/40 transition-all shadow-md"
              title="Salin Link Halaman ini"
            >
              {copiedLink ? <Check className="w-5 h-5 text-emerald-500" /> : <Share2 className="w-5 h-5" />}
            </button>

            <button
              onClick={handleToggleLike}
              disabled={liking}
              className={`px-4 py-3 rounded-2xl border text-xs font-extrabold flex items-center gap-2 transition-all shadow-md active:scale-95 ${
                isLiked
                  ? "bg-rose-500 text-white border-rose-600 shadow-rose-500/20"
                  : "glass-panel border-[#edd6bb]/30 dark:border-[#edd6bb]/20 text-rose-500 hover:bg-rose-500/10"
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? "fill-white" : ""}`} />
              <span>{isLiked ? "Menyukai" : "Sukai"}</span>
            </button>

            <button
              onClick={handleClone}
              disabled={cloning || (template.userId !== undefined && template.userId === currentUserId)}
              className="px-6 py-3 rounded-2xl bg-[#e1b329] hover:bg-[#ffb443] disabled:opacity-50 text-slate-950 font-extrabold text-xs shadow-xl shadow-[#e1b329]/25 flex items-center gap-2 transition-all transform active:scale-95"
            >
              {cloning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
              <span>{cloning ? "Meng-clone Spec..." : "Clone Template ke Katalog"}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Header */}
        <div className="border-b border-[#edd6bb]/30 dark:border-[#edd6bb]/20 pt-2">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0">
            <button
              onClick={() => setActiveTab("readme")}
              className={`px-4 py-3 rounded-t-2xl text-xs font-extrabold flex items-center gap-2 border-t border-x transition-all shrink-0 ${
                activeTab === "readme"
                  ? "bg-white dark:bg-[#0d0907] text-[#b8860b] dark:text-[#e1b329] border-[#edd6bb]/40 dark:border-[#edd6bb]/20 border-b-transparent shadow-sm"
                  : "text-[#8b7e6d] hover:text-slate-900 dark:hover:text-[#edd6bb] border-transparent"
              }`}
            >
              <FileText className="w-4 h-4 text-[#e1b329]" />
              <span>Dokumentasi README</span>
            </button>

            <button
              onClick={() => setActiveTab("request_schema")}
              className={`px-4 py-3 rounded-t-2xl text-xs font-extrabold flex items-center gap-2 border-t border-x transition-all shrink-0 ${
                activeTab === "request_schema"
                  ? "bg-white dark:bg-[#0d0907] text-[#b8860b] dark:text-[#e1b329] border-[#edd6bb]/40 dark:border-[#edd6bb]/20 border-b-transparent shadow-sm"
                  : "text-[#8b7e6d] hover:text-slate-900 dark:hover:text-[#edd6bb] border-transparent"
              }`}
            >
              <FileJson className="w-4 h-4 text-[#e1b329]" />
              <span>Input Request Schema</span>
            </button>

            <button
              onClick={() => setActiveTab("schema")}
              className={`px-4 py-3 rounded-t-2xl text-xs font-extrabold flex items-center gap-2 border-t border-x transition-all shrink-0 ${
                activeTab === "schema"
                  ? "bg-white dark:bg-[#0d0907] text-[#b8860b] dark:text-[#e1b329] border-[#edd6bb]/40 dark:border-[#edd6bb]/20 border-b-transparent shadow-sm"
                  : "text-[#8b7e6d] hover:text-slate-900 dark:hover:text-[#edd6bb] border-transparent"
              }`}
            >
              <Layers className="w-4 h-4 text-[#e1b329]" />
              <span>Output Response Schema</span>
            </button>

            <button
              onClick={() => setActiveTab("toolcalling")}
              className={`px-4 py-3 rounded-t-2xl text-xs font-extrabold flex items-center gap-2 border-t border-x transition-all shrink-0 ${
                activeTab === "toolcalling"
                  ? "bg-white dark:bg-[#0d0907] text-[#b8860b] dark:text-[#e1b329] border-[#edd6bb]/40 dark:border-[#edd6bb]/20 border-b-transparent shadow-sm"
                  : "text-[#8b7e6d] hover:text-slate-900 dark:hover:text-[#edd6bb] border-transparent"
              }`}
            >
              <Wrench className="w-4 h-4 text-[#e1b329]" />
              <span>Tool Calling ({template.toolsConfig?.tools?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab("request")}
              className={`px-4 py-3 rounded-t-2xl text-xs font-extrabold flex items-center gap-2 border-t border-x transition-all shrink-0 ${
                activeTab === "request"
                  ? "bg-white dark:bg-[#0d0907] text-[#b8860b] dark:text-[#e1b329] border-[#edd6bb]/40 dark:border-[#edd6bb]/20 border-b-transparent shadow-sm"
                  : "text-[#8b7e6d] hover:text-slate-900 dark:hover:text-[#edd6bb] border-transparent"
              }`}
            >
              <Code2 className="w-4 h-4 text-[#e1b329]" />
              <span>cURL Integration Request</span>
            </button>

            <button
              onClick={() => setActiveTab("reviews")}
              className={`px-4 py-3 rounded-t-2xl text-xs font-extrabold flex items-center gap-2 border-t border-x transition-all shrink-0 ${
                activeTab === "reviews"
                  ? "bg-white dark:bg-[#0d0907] text-[#b8860b] dark:text-[#e1b329] border-[#edd6bb]/40 dark:border-[#edd6bb]/20 border-b-transparent shadow-sm"
                  : "text-[#8b7e6d] hover:text-slate-900 dark:hover:text-[#edd6bb] border-transparent"
              }`}
            >
              <MessageSquare className="w-4 h-4 text-[#e1b329]" />
              <span>Komunitas & Ulasan ({comments.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Content View */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#edd6bb]/30 dark:border-[#edd6bb]/20 bg-white/80 dark:bg-[#14100c]/80 min-h-[400px]">
        {/* TAB 1: README MARKDOWN DOCUMENTATION */}
        {activeTab === "readme" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#edd6bb]/20 pb-4">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-[#edd6bb] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#e1b329]" />
                <span>Dokumentasi Spesifikasi & Panduan Penggunaan</span>
              </h3>
              <span className="text-xs font-mono text-[#8b7e6d]">Markdown Format</span>
            </div>

            <div className="p-6 rounded-2xl bg-[#fcfaf7] dark:bg-[#0d0907] border border-[#edd6bb]/30 dark:border-[#edd6bb]/20">
              <MarkdownRenderer content={template.description || ""} />
            </div>

            {(template.positivePrompt || template.extractionPrompt) && (
              <div className="space-y-3 pt-4 border-t border-[#edd6bb]/20">
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-[#edd6bb] uppercase tracking-wider flex items-center gap-2 font-mono">
                  <Code2 className="w-4 h-4 text-[#e1b329]" />
                  <span>Positive Extraction Prompt</span>
                </h4>
                <pre className="p-5 rounded-2xl bg-[#f4efe8] dark:bg-[#0d0907] border border-[#edd6bb]/30 dark:border-[#edd6bb]/15 text-xs font-mono text-slate-800 dark:text-amber-200/90 whitespace-pre-wrap leading-relaxed">
                  {template.positivePrompt || template.extractionPrompt}
                </pre>
              </div>
            )}

            {template.negativePrompt && (
              <div className="space-y-3 pt-4 border-t border-[#edd6bb]/20">
                <h4 className="text-xs font-extrabold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-2 font-mono">
                  <Code2 className="w-4 h-4 text-red-500" />
                  <span>Negative Prompt (Constraints & Prohibitions)</span>
                </h4>
                <pre className="p-5 rounded-2xl bg-red-500/5 dark:bg-red-950/20 border border-red-500/20 text-xs font-mono text-slate-800 dark:text-red-200 whitespace-pre-wrap leading-relaxed">
                  {template.negativePrompt}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INPUT REQUEST SCHEMA */}
        {activeTab === "request_schema" && renderRequestSchemaTab()}

        {/* TAB 3: OUTPUT JSON RESPONSE SCHEMA */}
        {activeTab === "schema" && renderResponseSchemaTab()}

        {/* TAB 4: TOOL CALLING CONFIGURATION */}
        {activeTab === "toolcalling" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between border-b border-[#edd6bb]/20 pb-4 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-[#edd6bb]">Spesifikasi Multi-Tool Calling</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                    template.toolsConfig?.enabled !== false
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-slate-500/15 text-slate-500 border border-slate-500/30"
                  }`}>
                    {template.toolsConfig?.enabled !== false ? `ToolChoice: ${template.toolsConfig?.toolChoice || "auto"}` : "Disabled"}
                  </span>
                </div>
                <p className="text-xs text-[#8b7e6d] mt-0.5">
                  Daftar agen spesialis & fungsi Tool Calling otomatis yang terdaftar di dalam template ini
                </p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(template.toolsConfig || {}, null, 2));
                  alert("Tools Configuration JSON berhasil disalin!");
                }}
                className="px-4 py-2 rounded-xl glass-panel border border-[#edd6bb]/30 text-xs font-extrabold text-[#b8860b] dark:text-[#e1b329] flex items-center gap-1.5 hover:bg-[#e1b329]/10"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Tools Config JSON</span>
              </button>
            </div>



            {/* Registered Tools Grid / Cards */}
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#8b7e6d] flex items-center gap-2 font-mono">
                <Wrench className="w-3.5 h-3.5 text-[#e1b329]" />
                <span>Terdaftar ({template.toolsConfig?.tools?.length || 0} Spesialisasi Tool Calling)</span>
              </h4>

              {(!template.toolsConfig?.tools || template.toolsConfig.tools.length === 0) ? (
                <div className="p-8 text-center rounded-2xl bg-[#fcfaf7] dark:bg-[#0d0907] border border-[#edd6bb]/30 dark:border-[#edd6bb]/20">
                  <p className="text-xs text-[#8b7e6d] italic">Template ini belum memiliki konfigurasi Tool Calling terdaftar.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {template.toolsConfig.tools.map((t: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-5 rounded-2xl glass-panel border border-[#edd6bb]/40 dark:border-[#edd6bb]/20 bg-[#fcfaf7] dark:bg-[#0d0907] space-y-3 shadow-md hover:border-[#e1b329]/40 transition-all"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-mono">
                          <span className="w-6 h-6 rounded-lg bg-[#e1b329]/20 text-[#b8860b] dark:text-[#e1b329] font-bold text-xs flex items-center justify-center border border-[#e1b329]/30">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-[#edd6bb]">{t.name}</span>
                        </div>
                        {t.agentRole && (
                          <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20 text-[11px] font-extrabold flex items-center gap-1.5">
                            <Bot className="w-3.5 h-3.5 text-[#e1b329]" />
                            <span>{t.agentRole}</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-700 dark:text-[#edd6bb]/90 leading-relaxed font-sans">
                        {t.description}
                      </p>

                      {(t.textContext || t.includeImageContext) && (
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#edd6bb]/20 text-[11px]">
                          {t.textContext && (
                            <span className="px-2.5 py-1 rounded-lg bg-slate-200/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-mono text-[10px]">
                              Context: {t.textContext}
                            </span>
                          )}
                          {t.includeImageContext && (
                            <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-bold text-[10px]">
                              + Multimodal Image Context Enabled
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Raw JSON viewer */}
            <div className="pt-4 border-t border-[#edd6bb]/20 space-y-2">
              <span className="text-xs font-bold text-slate-900 dark:text-[#edd6bb] block font-mono">Raw Tools Config JSON Schema:</span>
              <pre className="p-5 rounded-2xl bg-[#0d0907] border border-[#edd6bb]/20 text-xs font-mono text-emerald-400 leading-relaxed overflow-x-auto">
                {JSON.stringify(template.toolsConfig || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 5: REQUEST CURL INTEGRATION */}
        {activeTab === "request" && (
          <div className="space-y-6">
            <div className="border-b border-[#edd6bb]/20 pb-4">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-[#edd6bb]">Integrasi API Gateway Callcraft</h3>
              <p className="text-xs text-[#8b7e6d]">Eksekusi spesifikasi ekstraksi ini secara instan menggunakan endpoint REST Gateway</p>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-900 dark:text-[#edd6bb] block">Contoh HTTP cURL Request:</span>
              <pre className="p-6 rounded-2xl bg-[#0d0907] border border-[#edd6bb]/20 text-xs font-mono text-emerald-400 leading-relaxed overflow-x-auto">
{`curl -X POST http://localhost:8080/v1/call \\
  -H "Authorization: Bearer call_sk_live_..." \\
  -H "X-USER-ID: usr_demo" \\
  -H "X-CALL-SPEC-ID: ${template.code}" \\
  -F "file=@document.pdf"`}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 4: REVIEWS & RATING */}
        {activeTab === "reviews" && (
          <div className="space-y-8">
            <div className="border-b border-[#edd6bb]/20 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-[#edd6bb]">Komunitas & Ulasan Developer</h3>
                <p className="text-xs text-[#8b7e6d]">Lihat dan berikan ulasan mengenai performa serta akurasi template ini</p>
              </div>
              <div className="flex items-center gap-1.5 text-amber-500 font-extrabold text-sm">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{template.ratingAvg?.toFixed(1) || "5.0"} / 5.0 Rating</span>
              </div>
            </div>

            {/* Post New Review Form */}
            <form onSubmit={handlePostComment} className="p-6 rounded-3xl glass-panel border border-[#edd6bb]/30 dark:border-[#edd6bb]/20 space-y-4 bg-[#fcfaf7] dark:bg-[#191410]">
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-[#edd6bb]">Tulis Ulasan & Berikan Rating</h4>

              <div className="flex items-center gap-3">
                <span className="text-xs text-[#8b7e6d] font-bold">Pilih Rating:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewRating(star)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= newRating
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-300 dark:text-slate-600"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-xs font-bold text-amber-500">{newRating} dari 5 Bintang</span>
              </div>

              <textarea
                rows={3}
                required
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Bagikan pengalaman penggunaan atau saran untuk template ini..."
                className="w-full p-4 rounded-2xl bg-white dark:bg-[#0d0907] border border-[#edd6bb]/30 dark:border-[#edd6bb]/20 text-xs text-slate-800 dark:text-[#edd6bb] placeholder-[#8b7e6d] focus:outline-none focus:border-[#e1b329]"
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingComment || !newCommentText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] disabled:opacity-50 text-slate-950 font-extrabold text-xs shadow-md flex items-center gap-2"
                >
                  {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Kirim Ulasan</span>
                </button>
              </div>
            </form>

            {/* List of Community Reviews */}
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-[#edd6bb]">Daftar Ulasan Komunitas ({comments.length})</h4>

              {comments.length === 0 ? (
                <p className="text-xs text-[#8b7e6d] italic text-center py-8">Belum ada ulasan untuk template ini. Jadilah yang pertama memberikan ulasan!</p>
              ) : (
                <div className="divide-y divide-[#edd6bb]/20">
                  {comments.map((cmt) => (
                    <div key={cmt.id} className="py-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#e1b329]/20 text-[#e1b329] font-bold text-xs flex items-center justify-center border border-[#e1b329]/30">
                            {cmt.authorName?.charAt(0) || "U"}
                          </div>
                          <div>
                            <span className="text-xs font-extrabold text-slate-900 dark:text-[#edd6bb] block">{cmt.authorName}</span>
                            <span className="text-[10px] text-[#8b7e6d] font-mono">
                              {cmt.createdAt ? new Date(cmt.createdAt).toLocaleDateString() : "Baru saja"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-amber-500 font-extrabold text-xs">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span>{cmt.rating} / 5</span>
                          </div>

                          {(cmt.userId === currentUserId || template.userId === currentUserId) && (
                            <button
                              onClick={() => handleDeleteComment(cmt.id)}
                              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors"
                              title="Hapus Ulasan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-[#edd6bb]/90 leading-relaxed pl-11">{cmt.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

