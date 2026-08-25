"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Boxes, Feather, Wrench, ShieldCheck, Stethoscope, Rocket, Layers,
  Globe, Code2, Cpu, Plus, Edit3, Trash2, Check, Sparkles, AlertCircle,
  Loader2, ArrowRight, FolderKanban, Info
} from "lucide-react";
import { Project } from "@/lib/types";
import { useProject } from "@/context/project-context";
import { createProject, updateProject, deleteProject as deleteProjectApi } from "@/lib/api/projects";
import { ConfirmModal } from "@/components/confirm-modal";

const AVAILABLE_ICONS = [
  { name: "Boxes", Icon: Boxes },
  { name: "Feather", Icon: Feather },
  { name: "Wrench", Icon: Wrench },
  { name: "ShieldCheck", Icon: ShieldCheck },
  { name: "Stethoscope", Icon: Stethoscope },
  { name: "Rocket", Icon: Rocket },
  { name: "Layers", Icon: Layers },
  { name: "Globe", Icon: Globe },
  { name: "Code2", Icon: Code2 },
  { name: "Cpu", Icon: Cpu },
];

const AVAILABLE_COLORS = [
  "#e1b329", "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#f97316", "#84cc16", "#ec4899",
];

function ProjectIcon({ icon, color, className = "w-5 h-5" }: { icon: string; color: string; className?: string }) {
  const item = AVAILABLE_ICONS.find((i) => i.name === icon);
  const IconComponent = item ? item.Icon : Boxes;
  return <IconComponent className={className} style={{ color }} />;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function ProjectsManagementPage() {
  const router = useRouter();
  const { projects, activeProject, setActiveProject, refreshProjects } = useProject();

  // Create Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newColor, setNewColor] = useState(AVAILABLE_COLORS[0]);
  const [newIcon, setNewIcon] = useState("Boxes");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal state
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState(AVAILABLE_COLORS[0]);
  const [editIcon, setEditIcon] = useState("Boxes");
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Modal state
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Toast / Banner state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setCreateError("Nama project wajib diisi.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createProject({
        name: newName.trim(),
        slug: slugify(newName.trim()),
        description: newDescription.trim() || undefined,
        color: newColor,
        icon: newIcon,
      });
      await refreshProjects();
      setActiveProject(created);
      setShowCreateModal(false);
      setNewName("");
      setNewDescription("");
      showToast(`Project "${created.name}" berhasil dibuat dan diaktifkan.`);
    } catch (err: any) {
      setCreateError(err.message || "Gagal membuat project");
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (project: Project) => {
    setEditingProject(project);
    setEditName(project.name);
    setEditDescription(project.description || "");
    setEditColor(project.color || AVAILABLE_COLORS[0]);
    setEditIcon(project.icon || "Boxes");
    setEditError(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    if (!editName.trim()) {
      setEditError("Nama project wajib diisi.");
      return;
    }
    setUpdating(true);
    setEditError(null);
    try {
      const updated = await updateProject(editingProject.id, {
        name: editName.trim(),
        description: editDescription.trim(),
        color: editColor,
        icon: editIcon,
      });
      await refreshProjects();
      if (activeProject?.id === updated.id) {
        setActiveProject(updated);
      }
      setEditingProject(null);
      showToast(`Project "${updated.name}" berhasil diperbarui.`);
    } catch (err: any) {
      setEditError(err.message || "Gagal mengupdate project");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProject) return;
    if (projects.length <= 1) {
      setDeleteError("Anda harus memiliki minimal 1 project aktif.");
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteProjectApi(deletingProject.id);
      await refreshProjects();
      setDeletingProject(null);
      showToast(`Project "${deletingProject.name}" berhasil dihapus.`);
    } catch (err: any) {
      setDeleteError(err.message || "Gagal menghapus project");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl border shadow-2xl flex items-center gap-3 text-xs font-bold animate-in slide-in-from-bottom-5 ${
            toast.type === "success"
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 backdrop-blur-xl"
              : "bg-rose-500/20 text-rose-300 border-rose-500/30 backdrop-blur-xl"
          }`}
        >
          {toast.type === "success" ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-[#8a715e]/20 dark:border-[#edd6bb]/15 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#e1b329] via-[#ffb443] to-[#8a715e] p-0.5 shadow-lg shadow-[#e1b329]/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#120e0b] rounded-[14px] flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-[#e1b329]" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-[#edd6bb]">
                Manajemen Projects
              </h1>
              <p className="text-xs text-[#8a715e] dark:text-[#8b7e6d]">
                Kelola ruang kerja dan isolasi resource per project (Call Specs, API Keys, Execution Logs)
              </p>
            </div>
          </div>
        </div>

        <button
          id="create-project-page-btn"
          onClick={() => {
            setNewName("");
            setNewDescription("");
            setNewColor(AVAILABLE_COLORS[0]);
            setNewIcon("Boxes");
            setCreateError(null);
            setShowCreateModal(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 font-extrabold text-xs shadow-lg shadow-[#e1b329]/20 flex items-center justify-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Project Baru</span>
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.map((project) => {
          const isActive = activeProject?.id === project.id;
          return (
            <div
              key={project.id}
              className={`glass-panel p-6 rounded-3xl border transition-all duration-300 relative flex flex-col justify-between group ${
                isActive
                  ? "border-[#e1b329] bg-[#e1b329]/5 dark:bg-[#e1b329]/8 shadow-2xl shadow-[#e1b329]/10"
                  : "border-[#8a715e]/20 dark:border-[#edd6bb]/15 hover:border-[#8a715e]/40 dark:hover:border-[#edd6bb]/30"
              }`}
            >
              {/* Header */}
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md transition-transform group-hover:scale-105"
                      style={{ backgroundColor: `${project.color}25` }}
                    >
                      <ProjectIcon icon={project.icon} color={project.color} className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-[#edd6bb] truncate">
                        {project.name}
                      </h3>
                      <p className="text-xs text-[#8b7e6d] font-mono truncate">{project.slug}</p>
                    </div>
                  </div>

                  {isActive ? (
                    <span className="px-2.5 py-1 rounded-full bg-[#e1b329]/20 text-[#e1b329] border border-[#e1b329]/30 text-[10px] font-extrabold shrink-0 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Aktif</span>
                    </span>
                  ) : null}
                </div>

                {project.description && (
                  <p className="text-xs text-[#8a715e] dark:text-[#8b7e6d] line-clamp-2 leading-relaxed">
                    {project.description}
                  </p>
                )}
              </div>

              {/* Footer Actions */}
              <div className="pt-5 mt-4 border-t border-[#8a715e]/15 dark:border-[#edd6bb]/10 flex items-center justify-between gap-2">
                {!isActive ? (
                  <button
                    id={`switch-project-btn-${project.id}`}
                    onClick={() => {
                      setActiveProject(project);
                      showToast(`Project aktif diganti ke "${project.name}"`);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#8a715e]/10 hover:bg-[#e1b329]/20 hover:text-[#e1b329] text-xs font-bold text-slate-700 dark:text-[#edd6bb] flex items-center gap-1.5 transition-all"
                  >
                    <span>Pilih Project Ini</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ) : (
                  <span className="text-[11px] font-bold text-[#e1b329]">Sedang Digunakan</span>
                )}

                <div className="flex items-center gap-1">
                  <button
                    id={`edit-project-btn-${project.id}`}
                    onClick={() => handleOpenEdit(project)}
                    className="p-2 rounded-xl text-[#8a715e] dark:text-[#8b7e6d] hover:text-[#e1b329] hover:bg-[#8a715e]/15 transition-all"
                    title="Edit project"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    id={`delete-project-btn-${project.id}`}
                    onClick={() => {
                      setDeletingProject(project);
                      setDeleteError(null);
                    }}
                    disabled={projects.length <= 1}
                    className="p-2 rounded-xl text-[#8a715e] dark:text-[#8b7e6d] hover:text-rose-500 hover:bg-rose-500/15 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title={projects.length <= 1 ? "Tidak dapat menghapus project terakhir" : "Hapus project"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#8a715e]/20 dark:border-[#edd6bb]/20 shadow-2xl max-w-lg w-full space-y-5">
            <div className="flex items-center justify-between border-b border-[#8a715e]/15 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${newColor}25` }}
                >
                  <ProjectIcon icon={newIcon} color={newColor} className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-[#edd6bb]">Buat Project Baru</h2>
                  <p className="text-xs text-[#8a715e] dark:text-[#8b7e6d]">Tambah ruang kerja baru di Callcraft</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-xl text-[#8a715e] hover:bg-[#8a715e]/15 transition-all"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#8a715e] dark:text-[#edd6bb]">Nama Project</label>
                <input
                  id="modal-create-project-name"
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Internal Tooling Suite"
                  className="w-full glass-panel border border-[#8a715e]/30 dark:border-[#edd6bb]/25 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-[#edd6bb] placeholder:text-slate-400 dark:placeholder:text-[#8b7e6d] font-medium focus:outline-none focus:border-[#e1b329]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#8a715e] dark:text-[#edd6bb]">Deskripsi (Opsional)</label>
                <textarea
                  id="modal-create-project-desc"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  placeholder="Penjelasan singkat project ini..."
                  className="w-full glass-panel border border-[#8a715e]/30 dark:border-[#edd6bb]/25 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-[#edd6bb] placeholder:text-slate-400 dark:placeholder:text-[#8b7e6d] font-medium focus:outline-none focus:border-[#e1b329] resize-none"
                />
              </div>

              {/* Color picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#8a715e] dark:text-[#edd6bb]">Warna Aksen</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className="w-7 h-7 rounded-lg border-2 transition-all"
                      style={{
                        backgroundColor: c,
                        borderColor: newColor === c ? "white" : "transparent",
                        boxShadow: newColor === c ? `0 0 0 2px ${c}` : "none",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Icon picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#8a715e] dark:text-[#edd6bb]">Ikon</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {AVAILABLE_ICONS.map(({ name: iconName, Icon }) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setNewIcon(iconName)}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                        newIcon === iconName ? "border-transparent" : "border-[#8a715e]/20"
                      }`}
                      style={newIcon === iconName ? { borderColor: newColor, backgroundColor: `${newColor}20` } : {}}
                    >
                      <Icon className="w-4 h-4" style={{ color: newIcon === iconName ? newColor : undefined }} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#8a715e] hover:bg-[#8a715e]/15 transition-all"
                >
                  Batal
                </button>
                <button
                  id="modal-submit-create-project"
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="px-5 py-2 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 font-extrabold text-xs shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>{creating ? "Membuat..." : "Buat Project"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#8a715e]/20 dark:border-[#edd6bb]/20 shadow-2xl max-w-lg w-full space-y-5">
            <div className="flex items-center justify-between border-b border-[#8a715e]/15 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${editColor}25` }}
                >
                  <ProjectIcon icon={editIcon} color={editColor} className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-[#edd6bb]">Edit Project</h2>
                  <p className="text-xs text-[#8a715e] dark:text-[#8b7e6d] font-mono">{editingProject.slug}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingProject(null)}
                className="p-2 rounded-xl text-[#8a715e] hover:bg-[#8a715e]/15 transition-all"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#8a715e] dark:text-[#edd6bb]">Nama Project</label>
                <input
                  id="modal-edit-project-name"
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full glass-panel border border-[#8a715e]/30 dark:border-[#edd6bb]/25 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-[#edd6bb] font-medium focus:outline-none focus:border-[#e1b329]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#8a715e] dark:text-[#edd6bb]">Deskripsi</label>
                <textarea
                  id="modal-edit-project-desc"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full glass-panel border border-[#8a715e]/30 dark:border-[#edd6bb]/25 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-[#edd6bb] font-medium focus:outline-none focus:border-[#e1b329] resize-none"
                />
              </div>

              {/* Color picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#8a715e] dark:text-[#edd6bb]">Warna Aksen</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      className="w-7 h-7 rounded-lg border-2 transition-all"
                      style={{
                        backgroundColor: c,
                        borderColor: editColor === c ? "white" : "transparent",
                        boxShadow: editColor === c ? `0 0 0 2px ${c}` : "none",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Icon picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#8a715e] dark:text-[#edd6bb]">Ikon</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {AVAILABLE_ICONS.map(({ name: iconName, Icon }) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setEditIcon(iconName)}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                        editIcon === iconName ? "border-transparent" : "border-[#8a715e]/20"
                      }`}
                      style={editIcon === iconName ? { borderColor: editColor, backgroundColor: `${editColor}20` } : {}}
                    >
                      <Icon className="w-4 h-4" style={{ color: editIcon === iconName ? editColor : undefined }} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#8a715e] hover:bg-[#8a715e]/15 transition-all"
                >
                  Batal
                </button>
                <button
                  id="modal-submit-edit-project"
                  type="submit"
                  disabled={updating || !editName.trim()}
                  className="px-5 py-2 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 font-extrabold text-xs shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{updating ? "Menyimpan..." : "Simpan Perubahan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={Boolean(deletingProject)}
        title={`Hapus Project "${deletingProject?.name}"?`}
        message="Semua Call Specs, API Keys, dan Log yang terikat dengan project ini akan terhapus secara permanen. Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus Project Permanen"
        cancelText="Batal"
        variant="danger"
        icon="alert"
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingProject(null)}
      />
    </div>
  );
}
