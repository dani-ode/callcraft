"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Heart,
  Star,
  MessageSquare,
  Copy,
  Eye,
  User as UserIcon,
  CheckCircle2,
  Loader2,
  Code2,
  X,
  Send,
  Layers,
  Settings,
} from "lucide-react";
import {
  fetchUserProfile,
  forkTemplate,
  toggleLikeTemplate,
  fetchTemplateComments,
  addTemplateComment,
} from "@/lib/api-client";
import { UserProfileDetail, Template, TemplateComment } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { getActiveUserId } from "@/lib/api-client";
import { extractPlainTextFromMarkdown, MarkdownRenderer } from "@/components/markdown-editor";

export default function UserPublicProfilePage() {
  const [mounted, setMounted] = useState(false);
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;

  const [profile, setProfile] = useState<UserProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Selected Template for Comments & Details Drawer
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [drawerTab, setDrawerTab] = useState<"overview" | "request" | "response" | "reviews">("overview");
  const [comments, setComments] = useState<TemplateComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);

  // Toast Notification
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const { user } = useAuth();
  const currentUserId = user?.id || getActiveUserId();

  useEffect(() => {
    setMounted(true);
    if (userId) {
      loadProfile();
    }
  }, [userId]);

  async function loadProfile() {
    setLoading(true);
    const data = await fetchUserProfile(userId);
    setProfile(data);
    setLoading(false);
  }

  async function handleLikeToggle(tmpl: Template) {
    try {
      const res = await toggleLikeTemplate(tmpl.id);
      if (profile) {
        setProfile({
          ...profile,
          templates: profile.templates.map((t) =>
            t.id === tmpl.id
              ? { ...t, isLiked: res.is_liked, likesCount: res.likes_count }
              : t
          ),
        });
      }
    } catch (err: any) {
      setNotification({ message: err.message || "Failed to toggle like", type: "error" });
    }
  }

  async function handleForkTemplate(tmpl: Template) {
    if (tmpl.userId === currentUserId) {
      setNotification({ message: "Anda tidak dapat meng-clone template milik Anda sendiri.", type: "error" });
      return;
    }

    try {
      await forkTemplate(tmpl.id);
      setNotification({ message: `Successfully cloned '${tmpl.name}'! Redirecting to Specs...`, type: "success" });
      setTimeout(() => {
        router.push("/specs");
      }, 1500);
    } catch (err: any) {
      setNotification({ message: err.message || "Failed to clone template", type: "error" });
    }
  }

  async function openCommentsDrawer(tmpl: Template) {
    setSelectedTemplate(tmpl);
    setDrawerTab("overview");
    setLoadingComments(true);
    const data = await fetchTemplateComments(tmpl.id);
    setComments(data);
    setLoadingComments(false);
  }

  function handleCopyJson(obj: any) {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
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
        authorName: user?.name || user?.email || "",
      });

      setComments((prev) => [res, ...prev]);
      setNewCommentText("");
      
      if (profile) {
        setProfile({
          ...profile,
          templates: profile.templates.map((t) =>
            t.id === selectedTemplate.id
              ? { ...t, ratingAvg: res.ratingAvg, reviewsCount: res.reviewsCount }
              : t
          ),
        });
      }

      setNotification({ message: "Review posted successfully!", type: "success" });
    } catch (err: any) {
      setNotification({ message: err.message || "Failed to post comment", type: "error" });
    } finally {
      setSubmittingComment(false);
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 max-w-7xl mx-auto">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#e1b329]" />
        <p className="text-xs mt-3">Loading User Profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-20 text-center max-w-7xl mx-auto glass-panel rounded-3xl p-8 space-y-4">
        <UserIcon className="w-12 h-12 mx-auto text-slate-500" />
        <h2 className="text-xl font-bold text-[#edd6bb]">User Profile Not Found</h2>
        <p className="text-xs text-[#8b7e6d]">Pengguna tidak ditemukan atau tidak memiliki publikasi template.</p>
        <Link
          href="/templates"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e1b329] text-slate-950 font-bold text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Pasar Template</span>
        </Link>
      </div>
    );
  }

  const initials = profile.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

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

      {/* Navigation Header */}
      <div>
        <Link
          href="/templates"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#8b7e6d] hover:text-[#edd6bb] transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Pasar Template</span>
        </Link>
      </div>

      {/* Profile Header Banner */}
      <div className="glass-panel p-6 md:p-8 rounded-3xl border border-[#edd6bb]/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-[#e1b329] to-[#ffb443] text-slate-950 flex items-center justify-center font-extrabold text-2xl md:text-3xl shadow-xl shadow-[#e1b329]/20 shrink-0">
            {initials || "U"}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#edd6bb]">
                {profile.fullName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#e1b329]/20 text-[#e1b329] text-[10px] font-extrabold border border-[#e1b329]/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#e1b329]" />
                <span>{profile.role}</span>
              </span>
            </div>
            <p className="text-xs text-[#8b7e6d] font-mono">{profile.email}</p>
          </div>
        </div>

        {/* Profile Statistics Badges */}
        <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
          <div className="p-3.5 rounded-2xl glass-panel border border-[#edd6bb]/15 text-center min-w-[100px]">
            <span className="text-[10px] text-[#8b7e6d] font-bold uppercase tracking-wider block">Published</span>
            <span className="text-lg font-extrabold text-[#edd6bb]">{profile.totalPublishedTemplates}</span>
          </div>
          <div className="p-3.5 rounded-2xl glass-panel border border-[#edd6bb]/15 text-center min-w-[100px]">
            <span className="text-[10px] text-[#8b7e6d] font-bold uppercase tracking-wider block">Total Clones</span>
            <span className="text-lg font-extrabold text-emerald-400">{profile.totalClones}</span>
          </div>
          <div className="p-3.5 rounded-2xl glass-panel border border-[#edd6bb]/15 text-center min-w-[100px]">
            <span className="text-[10px] text-[#8b7e6d] font-bold uppercase tracking-wider block">Total Likes</span>
            <span className="text-lg font-extrabold text-rose-400">{profile.totalLikes}</span>
          </div>
        </div>
      </div>

      {/* User's Published Templates List */}
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold tracking-tight text-[#edd6bb] flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#e1b329]" />
          <span>Template Dipublikasikan oleh {profile.fullName}</span>
        </h2>

        {profile.templates.length === 0 ? (
          <div className="py-12 text-center glass-panel rounded-3xl border border-[#edd6bb]/20 space-y-2">
            <Layers className="w-8 h-8 mx-auto text-slate-500" />
            <p className="text-xs font-bold text-[#8b7e6d]">Pengguna ini belum mempublikasikan template ke pasar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profile.templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="glass-panel glass-panel-hover p-6 rounded-3xl border border-[#edd6bb]/20 flex flex-col justify-between space-y-4 relative group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#8b7e6d] font-semibold">{tmpl.category.toUpperCase()}</span>
                    <span className="text-[10px] font-mono text-[#8b7e6d]">{tmpl.code}</span>
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-[#edd6bb] group-hover:text-[#ffb443] transition-colors">
                      {tmpl.name}
                    </h3>
                    <p className="text-xs text-[#8b7e6d] dark:text-[#edd6bb]/70 mt-1 line-clamp-2 leading-relaxed">
                      {extractPlainTextFromMarkdown(tmpl.description) || "Indonesian multimodal extraction specification template."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between py-2.5 px-3 rounded-2xl bg-[#120e0b]/50 border border-[#edd6bb]/15 text-xs text-[#8b7e6d]">
                    <div className="flex items-center gap-1 font-extrabold text-amber-400" title="Rating Average">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{tmpl.ratingAvg?.toFixed(1) || "5.0"}</span>
                    </div>

                    <div className="flex items-center gap-1 font-extrabold text-sky-400" title="Total Ulasan">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{tmpl.reviewsCount || 0}</span>
                    </div>

                    <button
                      onClick={() => handleLikeToggle(tmpl)}
                      className={`flex items-center gap-1 font-extrabold transition-all ${
                        tmpl.isLiked ? "text-rose-500" : "hover:text-rose-400"
                      }`}
                      title="Sukai Template"
                    >
                      <Heart className={`w-3.5 h-3.5 ${tmpl.isLiked ? "fill-rose-500" : ""}`} />
                      <span>{tmpl.likesCount || 0}</span>
                    </button>

                    <div className="flex items-center gap-1 font-extrabold text-emerald-400" title="Total Clone">
                      <Copy className="w-3.5 h-3.5" />
                      <span>{tmpl.forkCount || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  <Link
                    href={`/templates/${tmpl.id}`}
                    className="flex-1 py-2.5 rounded-xl glass-panel hover:bg-[#edd6bb]/15 text-xs font-extrabold text-[#edd6bb] flex items-center justify-center gap-1.5 border border-[#edd6bb]/20 transition-all hover:border-[#e1b329]/40"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#e1b329]" />
                    <span>Detail</span>
                  </Link>

                  {tmpl.userId === currentUserId ? (
                    <Link
                      href={`/specs/${tmpl.specId || tmpl.id}/publish`}
                      className="flex-1 py-2.5 rounded-xl bg-[#e1b329]/20 hover:bg-[#e1b329]/35 text-[#614600] dark:text-[#ffb443] font-extrabold text-xs flex items-center justify-center gap-1.5 border border-[#e1b329]/50 transition-all shadow-sm"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Configure</span>
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleForkTemplate(tmpl)}
                      className="flex-1 py-2.5 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 font-extrabold text-xs shadow-md shadow-[#e1b329]/20 flex items-center justify-center gap-1.5 transition-all transform active:scale-95"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Clone</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
