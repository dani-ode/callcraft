"use client";

import { useEffect, useState } from "react";
import {
  User as UserIcon,
  Mail,
  Shield,
  Key,
  Globe,
  Github,
  Building,
  MapPin,
  Phone,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Lock,
  Sparkles,
  Camera,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import {
  fetchCurrentUserProfile,
  updateUserProfile,
  resendVerificationEmail,
  closeUserAccount,
} from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";

export default function AccountSettingsPage() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "account" | "close-account">("profile");

  // Close Account Modal State
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  // Profile Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("active");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [emailVerifiedAt, setEmailVerifiedAt] = useState<string | null>(null);

  // Security Form State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Notification Toast State
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadUserProfile();
  }, []);

  async function loadUserProfile() {
    setLoading(true);
    try {
      const data = await fetchCurrentUserProfile();
      if (data) {
        setFullName(data.fullName || user?.name || "");
        setEmail(data.email || user?.email || "");
        setStatus(data.status || "active");
        setBio(data.bio || "");
        setAvatarUrl(data.avatarUrl || "");
        setGithubUrl(data.githubUrl || "");
        setWebsiteUrl(data.websiteUrl || "");
        setCompany(data.company || "");
        setLocation(data.location || "");
        setPhone(data.phone || "");
        setEmailVerifiedAt(data.emailVerifiedAt || null);
      }
    } catch (err: any) {
      setNotification({ message: err.message || "Gagal memuat profil pengguna", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateUserProfile({
        fullName: fullName.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim(),
        githubUrl: githubUrl.trim(),
        websiteUrl: websiteUrl.trim(),
        company: company.trim(),
        location: location.trim(),
        phone: phone.trim(),
      });

      setNotification({ message: res.message || "Profil berhasil diperbarui!", type: "success" });
    } catch (err: any) {
      setNotification({ message: err.message || "Gagal menyimpan perubahan profil", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setNotification({ message: "Password minimal 6 karakter.", type: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setNotification({ message: "Konfirmasi password tidak cocok.", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const res = await updateUserProfile({
        newPassword: newPassword,
      });

      setNewPassword("");
      setConfirmPassword("");
      setNotification({ message: "Password akun berhasil diperbarui!", type: "success" });
    } catch (err: any) {
      setNotification({ message: err.message || "Gagal memperbarui password", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleResendVerification() {
    if (!email || resendingEmail) return;
    setResendingEmail(true);
    try {
      const res = await resendVerificationEmail(email);
      setNotification({ message: res.message, type: "success" });
    } catch (err: any) {
      setNotification({ message: err.message || "Gagal mengirim ulang email verifikasi", type: "error" });
    } finally {
      setResendingEmail(false);
    }
  }

  async function handleConfirmCloseAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmPasswordInput.trim()) {
      setCloseError("Password konfirmasi wajib diisi.");
      return;
    }

    setClosing(true);
    setCloseError(null);

    try {
      await closeUserAccount(confirmPasswordInput);
      setShowCloseModal(false);
      logout();
    } catch (err: any) {
      setCloseError(err.message || "Gagal menutup akun. Pastikan password Anda benar.");
    } finally {
      setClosing(false);
    }
  }

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 max-w-4xl mx-auto space-y-3">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#e1b329]" />
        <p className="text-xs font-semibold">Memuat Pengaturan Akun Pengguna...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Toast Notification */}
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

      {/* Header Breadcrumb & Title */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-[#e1b329]/15 text-[#b8860b] dark:text-[#e1b329] border border-[#e1b329]/30 text-[10px] font-extrabold uppercase font-mono">
            {status.toUpperCase()}
          </span>
          {emailVerifiedAt ? (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Email Verified</span>
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-extrabold flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>Pending Verification</span>
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-[#edd6bb]">
          Pengaturan Akun & Profil
        </h1>
        <p className="text-xs text-[#8b7e6d]">Kelola identitas profil, biografi, tautan sosial, dan keamanan akun Anda</p>
      </div>

      {/* Main Container Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#edd6bb]/30 dark:border-[#edd6bb]/20 space-y-6 shadow-2xl bg-white/80 dark:bg-[#14100c]/80">
        {/* Navigation Tabs Header */}
        <div className="border-b border-[#edd6bb]/30 dark:border-[#edd6bb]/20 pb-0">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab("profile")}
              className={`px-5 py-3 rounded-t-2xl text-xs font-extrabold flex items-center gap-2 border-t border-x transition-all ${
                activeTab === "profile"
                  ? "bg-[#fcfaf7] dark:bg-[#0d0907] text-[#b8860b] dark:text-[#e1b329] border-[#edd6bb]/40 dark:border-[#edd6bb]/20 border-b-transparent shadow-sm"
                  : "text-[#8b7e6d] hover:text-slate-900 dark:hover:text-[#edd6bb] border-transparent"
              }`}
            >
              <UserIcon className="w-4 h-4 text-[#e1b329]" />
              <span>Profil Pengguna</span>
            </button>

            <button
              onClick={() => setActiveTab("security")}
              className={`px-5 py-3 rounded-t-2xl text-xs font-extrabold flex items-center gap-2 border-t border-x transition-all ${
                activeTab === "security"
                  ? "bg-[#fcfaf7] dark:bg-[#0d0907] text-[#b8860b] dark:text-[#e1b329] border-[#edd6bb]/40 dark:border-[#edd6bb]/20 border-b-transparent shadow-sm"
                  : "text-[#8b7e6d] hover:text-slate-900 dark:hover:text-[#edd6bb] border-transparent"
              }`}
            >
              <Shield className="w-4 h-4 text-[#e1b329]" />
              <span>Keamanan & Verifikasi Email</span>
            </button>

            <button
              onClick={() => setActiveTab("account")}
              className={`px-5 py-3 rounded-t-2xl text-xs font-extrabold flex items-center gap-2 border-t border-x transition-all ${
                activeTab === "account"
                  ? "bg-[#fcfaf7] dark:bg-[#0d0907] text-[#b8860b] dark:text-[#e1b329] border-[#edd6bb]/40 dark:border-[#edd6bb]/20 border-b-transparent shadow-sm"
                  : "text-[#8b7e6d] hover:text-slate-900 dark:hover:text-[#edd6bb] border-transparent"
              }`}
            >
              <Key className="w-4 h-4 text-[#e1b329]" />
              <span>Status Akun & Sesi</span>
            </button>

            <button
              onClick={() => setActiveTab("close-account")}
              className={`px-5 py-3 rounded-t-2xl text-xs font-extrabold flex items-center gap-2 border-t border-x transition-all ${
                activeTab === "close-account"
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/40 border-b-transparent shadow-sm"
                  : "text-[#8b7e6d] hover:text-rose-600 dark:hover:text-rose-400 border-transparent"
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>Tutup Akun</span>
            </button>
          </div>
        </div>

        {/* TAB 1: PROFIL PENGGUNA */}
        {activeTab === "profile" && (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Avatar Preview */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl bg-[#fcfaf7] dark:bg-[#0d0907] border border-[#edd6bb]/30 dark:border-[#edd6bb]/20">
              <div className="relative w-16 h-16 rounded-2xl bg-[#e1b329]/20 text-[#e1b329] font-extrabold text-xl flex items-center justify-center border border-[#e1b329]/40 overflow-hidden shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                ) : (
                  <span>{fullName ? fullName.slice(0, 2).toUpperCase() : "U"}</span>
                )}
              </div>

              <div className="flex-1 space-y-1">
                <label className="text-xs font-bold text-slate-900 dark:text-[#edd6bb] flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#e1b329]" />
                  <span>URL Foto Profil (Avatar URL)</span>
                </label>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://github.com/username.png atau URL gambar avatar..."
                  className="w-full p-3 rounded-xl bg-white dark:bg-[#14100c] border border-[#edd6bb]/30 dark:border-[#edd6bb]/20 text-xs text-slate-800 dark:text-[#edd6bb] placeholder-[#8b7e6d] focus:outline-none focus:border-[#e1b329]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-900 dark:text-[#edd6bb] block mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-[#fcfaf7] dark:bg-[#0d0907] border border-[#edd6bb]/30 dark:border-[#edd6bb]/20 text-xs font-bold text-slate-800 dark:text-[#edd6bb] focus:outline-none focus:border-[#e1b329]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-900 dark:text-[#edd6bb] block mb-1">Alamat Email (Akun Utama)</label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full p-3.5 rounded-xl bg-slate-100 dark:bg-black/40 border border-[#edd6bb]/20 text-xs text-slate-500 font-mono cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-900 dark:text-[#edd6bb] block mb-1">Biografi Ringkas (Bio)</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tuliskan biografi singkat, minat spesialisasi AI vision, atau latar belakang Anda..."
                className="w-full p-4 rounded-2xl bg-[#fcfaf7] dark:bg-[#0d0907] border border-[#edd6bb]/30 dark:border-[#edd6bb]/20 text-xs text-slate-800 dark:text-[#edd6bb] placeholder-[#8b7e6d] focus:outline-none focus:border-[#e1b329] leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-900 dark:text-[#edd6bb] block mb-1 flex items-center gap-1.5">
                  <Github className="w-3.5 h-3.5 text-[#e1b329]" />
                  <span>GitHub Profile URL</span>
                </label>
                <input
                  type="text"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/username"
                  className="w-full p-3.5 rounded-xl bg-[#fcfaf7] dark:bg-[#0d0907] border border-[#edd6bb]/30 dark:border-[#edd6bb]/20 text-xs text-slate-800 dark:text-[#edd6bb] focus:outline-none focus:border-[#e1b329]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-900 dark:text-[#edd6bb] block mb-1 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#e1b329]" />
                  <span>Website Portfolio URL</span>
                </label>
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://yourportfolio.io"
                  className="w-full p-3.5 rounded-xl bg-[#fcfaf7] dark:bg-[#0d0907] border border-[#edd6bb]/30 dark:border-[#edd6bb]/20 text-xs text-slate-800 dark:text-[#edd6bb] focus:outline-none focus:border-[#e1b329]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-900 dark:text-[#edd6bb] block mb-1 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-[#e1b329]" />
                  <span>Perusahaan / Organisasi</span>
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Callcraft Labs"
                  className="w-full p-3.5 rounded-xl bg-[#fcfaf7] dark:bg-[#0d0907] border border-[#edd6bb]/30 dark:border-[#edd6bb]/20 text-xs text-slate-800 dark:text-[#edd6bb] focus:outline-none focus:border-[#e1b329]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-900 dark:text-[#edd6bb] block mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#e1b329]" />
                  <span>Lokasi</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Jakarta, Indonesia"
                  className="w-full p-3.5 rounded-xl bg-[#fcfaf7] dark:bg-[#0d0907] border border-[#edd6bb]/30 dark:border-[#edd6bb]/20 text-xs text-slate-800 dark:text-[#edd6bb] focus:outline-none focus:border-[#e1b329]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-900 dark:text-[#edd6bb] block mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#e1b329]" />
                  <span>Nomor Telepon</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+62 812-3456-7890"
                  className="w-full p-3.5 rounded-xl bg-[#fcfaf7] dark:bg-[#0d0907] border border-[#edd6bb]/30 dark:border-[#edd6bb]/20 text-xs text-slate-800 dark:text-[#edd6bb] focus:outline-none focus:border-[#e1b329]"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#edd6bb]/20">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-2xl bg-[#e1b329] hover:bg-[#ffb443] disabled:opacity-50 text-slate-950 font-extrabold text-xs shadow-xl shadow-[#e1b329]/25 flex items-center gap-2 transition-all transform active:scale-95"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Simpan Perubahan Profil</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: KEAMANAN & VERIFIKASI EMAIL */}
        {activeTab === "security" && (
          <div className="space-y-8">
            {/* Email Verification Box */}
            <div className="p-6 rounded-3xl bg-[#fcfaf7] dark:bg-[#0d0907] border border-[#edd6bb]/30 dark:border-[#edd6bb]/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#edd6bb] flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#e1b329]" />
                    <span>Status Verifikasi Email Akun</span>
                  </h3>
                  <p className="text-xs text-[#8b7e6d]">
                    Email: <span className="font-mono text-slate-800 dark:text-[#edd6bb] font-bold">{email}</span>
                  </p>
                </div>

                <div>
                  {emailVerifiedAt ? (
                    <span className="px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-extrabold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Terverifikasi pada {new Date(emailVerifiedAt).toLocaleDateString()}</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={resendingEmail}
                      onClick={handleResendVerification}
                      className="px-5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-xs font-extrabold flex items-center gap-2 transition-all shadow-sm"
                    >
                      {resendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>Kirim Ulang Email Verifikasi (SMTP)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Change Password Form */}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#edd6bb] flex items-center gap-2 border-b border-[#edd6bb]/20 pb-3">
                <Lock className="w-4 h-4 text-[#e1b329]" />
                <span>Ganti Password Akun</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-900 dark:text-[#edd6bb] block mb-1">Password Baru</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full p-3.5 rounded-xl bg-[#fcfaf7] dark:bg-[#0d0907] border border-[#edd6bb]/30 dark:border-[#edd6bb]/20 text-xs text-slate-800 dark:text-[#edd6bb] focus:outline-none focus:border-[#e1b329]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-900 dark:text-[#edd6bb] block mb-1">Konfirmasi Password Baru</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    className="w-full p-3.5 rounded-xl bg-[#fcfaf7] dark:bg-[#0d0907] border border-[#edd6bb]/30 dark:border-[#edd6bb]/20 text-xs text-slate-800 dark:text-[#edd6bb] focus:outline-none focus:border-[#e1b329]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving || !newPassword}
                  className="px-6 py-3 rounded-2xl bg-[#e1b329] hover:bg-[#ffb443] disabled:opacity-50 text-slate-950 font-extrabold text-xs shadow-xl shadow-[#e1b329]/25 flex items-center gap-2 transition-all transform active:scale-95"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  <span>Perbarui Password</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: STATUS AKUN & SESI */}
        {activeTab === "account" && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-[#fcfaf7] dark:bg-[#0d0907] border border-[#edd6bb]/30 dark:border-[#edd6bb]/20 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#edd6bb]">Rincian Informasi Akun & Sesi</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl glass-panel border border-[#edd6bb]/20 space-y-1">
                  <span className="text-[#8b7e6d] font-bold block">User ID (ULID):</span>
                  <span className="font-mono text-slate-800 dark:text-amber-300 font-bold">{user?.id || "N/A"}</span>
                </div>

                <div className="p-4 rounded-2xl glass-panel border border-[#edd6bb]/20 space-y-1">
                  <span className="text-[#8b7e6d] font-bold block">Status Akses Akun:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase">{status}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TUTUP AKUN / DANGER ZONE */}
        {activeTab === "close-account" && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/30 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-rose-700 dark:text-rose-400">
                    Penutupan Akun & Hapus Data Permanen
                  </h3>
                  <p className="text-xs text-[#8a715e] dark:text-[#8b7e6d]">
                    Area bahaya. Menghapus akun Callcraft Anda secara permanen beserta seluruh aset yang terkait.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/60 dark:bg-black/40 border border-rose-500/20 text-xs text-slate-700 dark:text-[#edd6bb] space-y-2 leading-relaxed">
                <p className="font-bold text-rose-600 dark:text-rose-400">
                  Peringatan: Penutupan akun bersifat permanen dan tidak dapat dibatalkan.
                </p>
                <p>
                  Apabila Anda menutup akun Callcraft, tindakan berikut akan diproses secara otomatis oleh sistem:
                </p>
                <ul className="list-disc list-inside space-y-1.5 text-[#8a715e] dark:text-[#edd6bb]/80 font-medium">
                  <li>Seluruh Call Specs (skema payload JSON, versi prompt, dan konfigurasi API) milik Anda akan dihapus secara permanen dari database.</li>
                  <li>Kunci API Provider (Google Gemini, OpenAI, Anthropic, DeepSeek) yang terenkripsi AES-256-GCM akan dimusnahkan.</li>
                  <li>Seluruh API Key Kredensial dan Log Riwayat Eksekusi akan dihapus secara permanen.</li>
                  <li>Status publikasi pada Template Marketplace akan dinonaktifkan.</li>
                </ul>
              </div>

              <div className="pt-2 flex justify-start">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmPasswordInput("");
                    setCloseError(null);
                    setShowCloseModal(true);
                  }}
                  className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-xl shadow-rose-600/30 flex items-center gap-2 transition-all transform active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Tutup Akun Saya Permanen</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global Password Confirmation Alert Modal for Closing Account */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass-panel max-w-md w-full p-6 rounded-3xl border border-rose-500/30 shadow-2xl space-y-5 bg-[#fdfaf5] dark:bg-[#1c1713] text-[#5c4b3c] dark:text-[#edd6bb]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                  Konfirmasi Password Akun
                </h3>
                <p className="text-xs text-[#8a715e] dark:text-[#8b7e6d]">
                  Verifikasi identitas Anda untuk menutup akun.
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmCloseAccount} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 dark:text-[#edd6bb] block">
                  Masukkan Password Akun Anda
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full p-3.5 rounded-xl bg-white dark:bg-[#0d0907] border border-[#8a715e]/30 dark:border-[#edd6bb]/25 text-xs text-slate-800 dark:text-[#edd6bb] font-mono focus:outline-none focus:border-rose-500"
                />
              </div>

              {closeError && (
                <div className="p-3.5 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{closeError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={closing}
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 rounded-xl glass-panel text-xs font-bold border border-[#8a715e]/25 hover:bg-[#8a715e]/15 text-[#5c4b3c] dark:text-[#edd6bb] transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={closing || !confirmPasswordInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-extrabold shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-all"
                >
                  {closing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>{closing ? "Verifikasi..." : "Tutup Akun Sekarang"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
