"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Upload, Loader2, X, Layers } from "lucide-react";
import {
  fetchTemplates,
  forkTemplate,
  toggleLikeTemplate,
  fetchCallSpecs,
  publishTemplate,
  getActiveUserId,
} from "@/lib/api-client";
import { Template, CallSpec } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { TemplateCard } from "@/components/templates/template-card";
import { TemplateFilters } from "@/components/templates/template-filters";
import { PublishModal } from "@/components/templates/publish-modal";

import { useProject } from "@/context/project-context";

export default function TemplatesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeProject } = useProject();
  const currentUserId = user?.id || getActiveUserId();

  // State
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("popular");

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
    try {
      const data = await fetchTemplates(activeCategory, searchQuery, sortBy);
      setTemplates(data);
    } catch (err: any) {
      setNotification({ message: err.message || "Failed to load templates", type: "error" });
    } finally {
      setLoading(false);
    }
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
    if (tmpl.userId === currentUserId) {
      setNotification({ message: "Anda tidak dapat meng-clone template milik Anda sendiri.", type: "error" });
      return;
    }

    try {
      await forkTemplate(tmpl.id, activeProject?.id);
      setNotification({ message: `Successfully cloned '${tmpl.name}'! Redirecting to Specs...`, type: "success" });
      setTimeout(() => {
        router.push("/specs");
      }, 1500);
    } catch (err: any) {
      setNotification({ message: err.message || "Failed to clone template", type: "error" });
    }
  }

  async function openPublishModal() {
    setIsPublishModalOpen(true);
    try {
      const specs = await fetchCallSpecs(activeProject?.id);
      setUserSpecs(specs);
      if (specs.length > 0) {
        setSelectedSpecId(specs[0].id);
        setPublishName(specs[0].name);
        setPublishCode(specs[0].slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
        setPublishDescription(specs[0].description || "");
      }
    } catch (err: any) {
      setNotification({ message: err.message || "Failed to load user specs", type: "error" });
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
          <button type="button" onClick={() => setNotification(null)} className="hover:opacity-75">
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
            Jelajahi, sukai (love), ulas, dan clone template JSON schema buatan komunitas developer Callcraft
          </p>
        </div>

        <button
          type="button"
          onClick={openPublishModal}
          className="px-5 py-3 rounded-2xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 font-extrabold text-xs shadow-xl shadow-[#e1b329]/20 flex items-center gap-2 transition-all self-start md:self-auto transform hover:-translate-y-0.5"
        >
          <Upload className="w-4 h-4" />
          <span>Publikasikan Spec Saya</span>
        </button>
      </div>

      {/* Search & Category Filter Section */}
      <TemplateFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        sortBy={sortBy}
        setSortBy={setSortBy}
        onSearchSubmit={handleSearchSubmit}
      />

      {/* Templates Grid */}
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
            type="button"
            onClick={openPublishModal}
            className="text-xs text-[#e1b329] font-bold hover:underline"
          >
            Jadilah yang pertama mempublikasikan template!
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tmpl) => (
            <TemplateCard
              key={tmpl.id}
              template={tmpl}
              currentUserId={currentUserId}
              onLikeToggle={handleLikeToggle}
              onFork={handleForkTemplate}
            />
          ))}
        </div>
      )}

      {/* Publish Spec Modal */}
      <PublishModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        userSpecs={userSpecs}
        selectedSpecId={selectedSpecId}
        setSelectedSpecId={setSelectedSpecId}
        publishCode={publishCode}
        setPublishCode={setPublishCode}
        publishName={publishName}
        setPublishName={setPublishName}
        publishDescription={publishDescription}
        setPublishDescription={setPublishDescription}
        publishCategory={publishCategory}
        setPublishCategory={setPublishCategory}
        publishing={publishing}
        onPublishSubmit={handlePublishSubmit}
      />
    </div>
  );
}
