"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  ShieldCheck,
  Lock,
  Save,
  Server,
  Cpu,
  Feather,
  Layers,
  Zap,
  Bot,
  Shield,
  Code,
  Layout,
  Globe,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { fetchAppInitSettings, updateAppInitSettings } from "@/lib/api-client";
import { AppInitSettings } from "@/lib/types";
import { useAppInit } from "@/context/app-init-context";

const AVAILABLE_ICONS = [
  { name: "Feather", icon: Feather },
  { name: "Layers", icon: Layers },
  { name: "Zap", icon: Zap },
  { name: "Bot", icon: Bot },
  { name: "Shield", icon: Shield },
  { name: "Code", icon: Code },
];

export default function AdminSettingsPage() {
  const { refetchAppInit } = useAppInit();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // App Init Settings State
  const [appName, setAppName] = useState("Callcraft");
  const [appIcon, setAppIcon] = useState("Feather");
  const [tagline, setTagline] = useState("Multimodal AI Execution Gateway");
  const [description, setDescription] = useState("AI-Powered Dynamic Multimodal Execution Engine & Data Plane Gateway");
  const [faviconUrl, setFaviconUrl] = useState("/favicon.ico");
  const [disableLandingPage, setDisableLandingPage] = useState(false);

  // Security Engine Parameters
  const [maxExecutionTimeoutMs, setMaxExecutionTimeoutMs] = useState(30000);
  const [argon2Rounds, setArgon2Rounds] = useState(3);
  const [zeroRetentionEnabled, setZeroRetentionEnabled] = useState(true);
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(600);

  useEffect(() => {
    fetchAppInitSettings().then((settings) => {
      if (settings) {
        setAppName(settings.appName || "Callcraft");
        setAppIcon(settings.appIcon || "Feather");
        setTagline(settings.tagline || "Multimodal AI Execution Gateway");
        setDescription(settings.description || "AI-Powered Dynamic Multimodal Execution Engine & Data Plane Gateway");
        setFaviconUrl(settings.faviconUrl || "/favicon.ico");
        setDisableLandingPage(settings.disableLandingPage || false);
      }
      setLoading(false);
    });
  }, []);

  const handleSaveAllSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMessage(null);

    try {
      await updateAppInitSettings({
        appName: appName.trim(),
        appIcon,
        tagline: tagline.trim(),
        description: description.trim(),
        faviconUrl: faviconUrl.trim(),
        disableLandingPage,
      });

      await refetchAppInit();

      setSavedMessage("Pengaturan sistem & App Init berhasil disimpan!");
      setTimeout(() => setSavedMessage(null), 4000);
    } catch (err: any) {
      alert(`Gagal menyimpan pengaturan: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 max-w-4xl mx-auto space-y-3">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-400" />
        <p className="text-xs font-semibold">Memuat Pengaturan Platform & App Init...</p>
      </div>
    );
  }

  const handleIconFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran file logo terlalu besar! Maksimal 2MB.");
      return;
    }

    if (file.type && !file.type.startsWith("image/")) {
      alert("Format file tidak valid! Harap gunakan file gambar (PNG, SVG, JPG, WEBP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAppIcon(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFaviconFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran file Favicon terlalu besar! Maksimal 2MB.");
      return;
    }

    const validTypes = ["image/x-icon", "image/vnd.microsoft.icon", "image/png", "image/jpeg", "image/svg+xml", "image/webp"];
    if (file.type && !validTypes.includes(file.type) && !file.name.endsWith(".ico")) {
      alert("Format file tidak valid! Harap gunakan file gambar (.ico, .png, .svg, .jpg, .webp).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFaviconUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const isCustomImage = appIcon.startsWith("http://") || appIcon.startsWith("https://") || appIcon.startsWith("/") || appIcon.startsWith("data:image/");
  const isCustomFavicon = faviconUrl.startsWith("http://") || faviconUrl.startsWith("https://") || faviconUrl.startsWith("/") || faviconUrl.startsWith("data:image/");

  return (
    <form onSubmit={handleSaveAllSettings} className="space-y-8 max-w-5xl mx-auto">
      {/* Top Bar Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Settings className="w-6 h-6 text-amber-400" />
            <span>Platform Settings & App Initialization</span>
          </h1>
          <p className="text-xs text-slate-400">
            Kelola identitas aplikasi (App Init), bypass landing page, batasan rate limit, serta zero retention memory engine
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Simpan Semua Pengaturan</span>
        </button>
      </div>

      {savedMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 text-xs font-bold flex items-center gap-2 animate-pulse shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* 1. App Init System Settings Section */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
        <div className="border-b border-slate-800/80 pb-4">
          <h2 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
            <Layout className="w-5 h-5 text-amber-400" />
            <span>Pengaturan Inisialisasi Aplikasi (App Init)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Konfigurasikan nama aplikasi, tagline, ikon branding, serta aturan akses halaman depan
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* App Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200 block">Nama Aplikasi (App Name)</label>
            <input
              type="text"
              required
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-semibold focus:outline-none focus:border-amber-400"
              placeholder="e.g. Callcraft"
            />
          </div>

          {/* App Tagline */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200 block">Tagline Aplikasi</label>
            <input
              type="text"
              required
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-semibold focus:outline-none focus:border-amber-400"
              placeholder="e.g. Multimodal AI Execution Gateway"
            />
          </div>
        </div>

        {/* App Branding Icon (File Gambar atau Preset) */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-200 block">
            Ikon Branding Aplikasi (App Icon / File Gambar Logo)
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Custom Image File Upload / URL Input */}
            <div className="p-4 rounded-2xl glass-panel border border-slate-800 space-y-3 bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                  {isCustomImage ? (
                    <img src={appIcon} alt="Preview Logo" className="w-8 h-8 object-contain" />
                  ) : (
                    <div className="text-amber-400 font-bold text-xs">{appIcon}</div>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Upload File Gambar / URL Logo</h4>
                  <p className="text-[10px] text-slate-400">PNG, SVG, JPG, WEBP, atau Path URL Gambar</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={appIcon}
                  onChange={(e) => setAppIcon(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                  placeholder="/logo.png atau https://.../logo.png"
                />
                <label className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold cursor-pointer whitespace-nowrap">
                  <span>Pilih File Gambar</span>
                  <input type="file" accept="image/*" onChange={handleIconFileUpload} className="hidden" />
                </label>
              </div>
            </div>

            {/* Quick Preset Lucide Icons */}
            <div className="p-4 rounded-2xl glass-panel border border-slate-800 space-y-2 bg-slate-950/40">
              <span className="text-[11px] font-bold text-slate-300 block">Atau Pilih Preset Ikon Vector:</span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {AVAILABLE_ICONS.map((item) => {
                  const IconComp = item.icon;
                  const isSelected = appIcon === item.name;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setAppIcon(item.name)}
                      className={`p-2 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        isSelected
                          ? "border-amber-400 bg-amber-400/20 text-amber-300 shadow-md shadow-amber-500/10"
                          : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* App Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-200 block">Deskripsi Singkat Aplikasi</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-medium focus:outline-none focus:border-amber-400 leading-relaxed"
            placeholder="Deskripsi platform..."
          />
        </div>

        {/* Favicon ICO File / URL Input */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-200 block">
            Favicon ICO aplikasi (Ikon Tab Browser)
          </label>

          <div className="p-4 rounded-2xl glass-panel border border-slate-800 space-y-3 bg-slate-950/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                {isCustomFavicon ? (
                  <img src={faviconUrl} alt="Favicon Preview" className="w-6 h-6 object-contain" />
                ) : (
                  <Globe className="w-5 h-5 text-amber-400" />
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Upload File Favicon ICO / PNG / SVG</h4>
                <p className="text-[10px] text-slate-400">Validasi otomatis (.ico, .png, .svg, .jpg, maks 2MB)</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={faviconUrl}
                onChange={(e) => setFaviconUrl(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                placeholder="/favicon.ico atau https://.../favicon.ico"
              />
              <label className="px-3.5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold cursor-pointer whitespace-nowrap">
                <span>Pilih File Favicon</span>
                <input type="file" accept=".ico,image/x-icon,image/vnd.microsoft.icon,image/png,image/svg+xml,image/jpeg,image/webp" onChange={handleFaviconFileUpload} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        {/* Disable Landing Page Flag Card */}
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 bg-slate-950/60 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold text-slate-100">Bypass / Nonaktifkan Halaman Landing Page (`/`)</h4>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Jika diaktifkan (<code className="text-amber-300">true</code>), pengunjung yang mengakses URL utama (<code className="text-amber-300">/</code>) tidak akan melihat landing page dan akan langsung di-redirect ke halaman <strong>Dashboard</strong> (atau Login jika belum masuk).
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={disableLandingPage}
              onChange={(e) => setDisableLandingPage(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>
      </div>

      {/* 2. Security & Zero Retention Memory Engine */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
        <div className="border-b border-slate-800/80 pb-4">
          <h2 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400" />
            <span>Security & Zero Retention Memory Engine</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Pengaturan retensi data host, batas iterasi Argon2id, dan rate limiter</p>
        </div>

        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-4 rounded-2xl glass-panel border border-slate-800 bg-slate-900/40">
            <div>
              <p className="font-bold text-slate-200">Zero Retention Disk Storage Policy</p>
              <p className="text-slate-400 text-[11px]">Enforce 0-byte document retention on host disk (stream exclusively in RAM memory)</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={zeroRetentionEnabled}
                onChange={(e) => setZeroRetentionEnabled(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0 w-4 h-4"
              />
              <span className="font-semibold text-emerald-400">Enforced</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl glass-panel border border-slate-800 space-y-1.5">
              <label className="font-semibold text-slate-300">Argon2id Hash Time Cost (t)</label>
              <input
                type="number"
                value={argon2Rounds}
                onChange={(e) => setArgon2Rounds(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono focus:outline-none"
              />
              <p className="text-[10px] text-slate-500">Argon2id memory hardness iteration rounds</p>
            </div>

            <div className="p-4 rounded-2xl glass-panel border border-slate-800 space-y-1.5">
              <label className="font-semibold text-slate-300">Global Rate Limit (Req/Min/Key)</label>
              <input
                type="number"
                value={rateLimitPerMinute}
                onChange={(e) => setRateLimitPerMinute(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-indigo-300 font-mono focus:outline-none"
              />
              <p className="text-[10px] text-slate-500">Maximum API calls allowed per customer secret key per minute</p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
