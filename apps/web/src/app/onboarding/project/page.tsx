"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Feather, Boxes, Wrench, ShieldCheck, Stethoscope, Rocket, Layers,
  Globe, Code2, Cpu, Sparkles, ChevronRight, AlertCircle, Loader2
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { createProject } from "@/lib/api/projects";
import { ThemeToggle } from "@/components/theme-toggle";

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

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function OnboardingProjectPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(AVAILABLE_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState("Boxes");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.status !== "active")) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  const SelectedIconComponent = AVAILABLE_ICONS.find((i) => i.name === selectedIcon)?.Icon ?? Boxes;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nama project wajib diisi.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createProject({
        name: name.trim(),
        slug: slugify(name.trim()),
        description: description.trim() || undefined,
        color: selectedColor,
        icon: selectedIcon,
      });
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err.message || "Gagal membuat project. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative transition-colors duration-200">
      {/* Top-right theme toggle */}
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-48 -left-48 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl"
          style={{ background: `radial-gradient(circle, ${selectedColor}, transparent 70%)` }}
        />
        <div
          className="absolute -bottom-48 -right-48 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl"
          style={{ background: `radial-gradient(circle, ${selectedColor}, transparent 70%)` }}
        />
      </div>

      <div className="w-full max-w-xl relative z-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          {/* Animated logo */}
          <div className="flex items-center justify-center">
            <div
              className="w-16 h-16 rounded-2xl p-0.5 shadow-2xl"
              style={{ background: `linear-gradient(135deg, ${selectedColor}, #8a715e)` }}
            >
              <div className="w-full h-full rounded-[14px] bg-[#fdfaf5] dark:bg-[#120e0b] flex items-center justify-center transition-colors">
                <SelectedIconComponent className="w-8 h-8" style={{ color: selectedColor }} />
              </div>
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-[#edd6bb]">
              Buat Project Pertama Anda
            </h1>
            <p className="text-sm text-[#8a715e] dark:text-[#8b7e6d] mt-1.5">
              Setiap spec, API key, dan resource dalam Callcraft terikat ke project.
            </p>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-xs text-[#8a715e] dark:text-[#8b7e6d]">
            <Sparkles className="w-3.5 h-3.5" style={{ color: selectedColor }} />
            <span>Anda dapat membuat lebih banyak project kapan saja</span>
          </div>
        </div>

        {/* Form Card */}
        <div className="glass-panel p-8 rounded-3xl border border-[#8a715e]/20 dark:border-[#edd6bb]/20 shadow-2xl space-y-6">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/25 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Project Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#8a715e] dark:text-[#edd6bb]">
                Nama Project <span className="text-rose-500">*</span>
              </label>
              <input
                id="project-name-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: KYC Identity Platform"
                className="w-full glass-panel border border-[#8a715e]/30 dark:border-[#edd6bb]/25 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-[#edd6bb] placeholder:text-slate-400 dark:placeholder:text-[#8b7e6d] font-medium focus:outline-none focus:border-[#e1b329] transition-colors"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#8a715e] dark:text-[#edd6bb]">
                Deskripsi <span className="text-[#8b7e6d] font-normal">(opsional)</span>
              </label>
              <textarea
                id="project-description-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Deskripsi singkat tentang project ini..."
                className="w-full glass-panel border border-[#8a715e]/30 dark:border-[#edd6bb]/25 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-[#edd6bb] placeholder:text-slate-400 dark:placeholder:text-[#8b7e6d] font-medium focus:outline-none focus:border-[#e1b329] resize-none transition-colors"
              />
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#8a715e] dark:text-[#edd6bb]">
                Warna Aksen Project
              </label>
              <div className="flex flex-wrap gap-2.5">
                {AVAILABLE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    id={`color-${color.replace("#", "")}`}
                    onClick={() => setSelectedColor(color)}
                    className="w-8 h-8 rounded-xl border-2 transition-all hover:scale-110 active:scale-95"
                    style={{
                      backgroundColor: color,
                      borderColor: selectedColor === color ? "white" : "transparent",
                      boxShadow: selectedColor === color ? `0 0 0 2px ${color}` : "none",
                    }}
                    aria-label={`Pilih warna ${color}`}
                  />
                ))}
              </div>
            </div>

            {/* Icon Picker */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#8a715e] dark:text-[#edd6bb]">
                Ikon Project
              </label>
              <div className="grid grid-cols-5 gap-2">
                {AVAILABLE_ICONS.map(({ name: iconName, Icon }) => (
                  <button
                    key={iconName}
                    type="button"
                    id={`icon-${iconName.toLowerCase()}`}
                    onClick={() => setSelectedIcon(iconName)}
                    className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border transition-all hover:scale-105 active:scale-95 ${
                      selectedIcon === iconName
                        ? "border-transparent"
                        : "border-[#8a715e]/20 dark:border-[#edd6bb]/15 hover:border-[#8a715e]/40"
                    }`}
                    style={
                      selectedIcon === iconName
                        ? { borderColor: selectedColor, backgroundColor: `${selectedColor}20` }
                        : {}
                    }
                    aria-label={`Pilih ikon ${iconName}`}
                  >
                    <Icon
                      className="w-5 h-5"
                      style={{ color: selectedIcon === iconName ? selectedColor : undefined }}
                    />
                    <span className="text-[10px] font-medium text-[#8a715e] dark:text-[#8b7e6d] truncate max-w-full">
                      {iconName}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview pill */}
            {name.trim() && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl border border-dashed border-[#8a715e]/30 dark:border-[#edd6bb]/20">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${selectedColor}25` }}
                >
                  <SelectedIconComponent className="w-4 h-4" style={{ color: selectedColor }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-[#edd6bb] truncate">{name}</p>
                  <p className="text-[10px] text-[#8b7e6d] font-mono truncate">{slugify(name)}</p>
                </div>
              </div>
            )}

            <button
              id="create-project-submit-btn"
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full py-3.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-slate-950"
              style={{
                background: loading ? "#8a715e" : `linear-gradient(135deg, ${selectedColor}, ${selectedColor}cc)`,
                boxShadow: `0 8px 24px ${selectedColor}40`,
              }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Buat Project & Mulai</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#8a715e] dark:text-[#8b7e6d]">
          Masuk sebagai <span className="font-bold">{user?.email}</span>
        </p>
      </div>
    </div>
  );
}
