"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Feather, Lock, Mail, User, ArrowRight, UserPlus, AlertCircle, Loader2, Send, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { resendVerificationEmail, getGoogleAuthUrl } from "@/lib/api-client";

export default function UserRegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isLoading, register } = useAuth();
  const router = useRouter();

  const handleGoogleRegister = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const res = await getGoogleAuthUrl();
      if (res && res.url) {
        window.location.href = res.url;
      } else {
        throw new Error("Tautan otorisasi Google tidak valid.");
      }
    } catch (err: any) {
      setError(err.message || "Gagal menghubungkan ke Google.");
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading && user && user.status === "active") {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  if (isLoading || (user && user.status === "active")) {
    return null;
  }

  const handleResendActivation = async () => {
    if (!email.trim() || resending) return;
    setResending(true);
    try {
      await resendVerificationEmail(email.trim());
      setResendSuccess(true);
    } catch (err: any) {
      setError(err.message || "Gagal mengirim ulang link aktivasi.");
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Semua kolom nama, email, dan password wajib diisi.");
      return;
    }

    setLoading(true);
    setError(null);
    setResendSuccess(false);

    try {
      await register(name.trim(), email.trim().toLowerCase(), password);
      router.push(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}&registered=true`);
    } catch (err: any) {
      setError(err.message || "Pendaftaran gagal. Email mungkin sudah terdaftar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative transition-colors duration-200">
      {/* Top Right Theme Toggle */}
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#e1b329] via-[#ffb443] to-[#8a715e] p-0.5 shadow-xl shadow-[#e1b329]/20 mx-auto">
            <div className="w-full h-full bg-[#fdfaf5] dark:bg-[#120e0b] rounded-[14px] flex items-center justify-center transition-colors">
              <Feather className="w-7 h-7 text-[#e1b329]" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight gradient-text">Daftar Akun Baru</h1>
          <p className="text-xs text-[#8a715e] dark:text-[#8b7e6d]">Buat akun Developer Callcraft Studio Anda</p>
        </div>

        {/* Register Form Card */}
        <div className="glass-panel p-8 rounded-3xl border border-[#8a715e]/20 dark:border-[#edd6bb]/20 shadow-2xl space-y-5">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-xs space-y-2.5">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>

              {(error.includes("belum diverifikasi") || error.includes("terdaftar")) && (
                <div className="pt-1 border-t border-rose-500/20">
                  {resendSuccess ? (
                    <p className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 pt-1">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Link aktivasi baru telah dikirim ke inbox {email}.</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      disabled={resending || !email.trim()}
                      onClick={handleResendActivation}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/30 flex items-center gap-1.5 transition-all disabled:opacity-50 mt-1"
                    >
                      {resending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Kirim Ulang Link Aktivasi</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Google Sign-Up Button */}
          <button
            type="button"
            onClick={handleGoogleRegister}
            disabled={googleLoading || loading}
            className="w-full py-2.5 px-4 rounded-xl border border-[#8a715e]/30 dark:border-[#edd6bb]/25 bg-white/70 dark:bg-black/30 hover:bg-white dark:hover:bg-black/50 text-slate-800 dark:text-[#edd6bb] font-semibold text-xs shadow-sm flex items-center justify-center gap-3 transition-all disabled:opacity-50"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#e1b329]" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>{googleLoading ? "Mengarahkan ke Google..." : "Daftar dengan Google"}</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#8a715e]/20 dark:border-[#edd6bb]/15 w-full"></div>
            <span className="bg-transparent px-3 text-[10px] uppercase font-bold tracking-wider text-[#8a715e] dark:text-[#8b7e6d]">
              atau dengan email
            </span>
            <div className="border-t border-[#8a715e]/20 dark:border-[#edd6bb]/15 w-full"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#8a715e] dark:text-[#edd6bb] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#e1b329]" />
                <span>Nama Lengkap</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Budi Santoso"
                className="w-full glass-panel border border-[#8a715e]/30 dark:border-[#edd6bb]/25 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-[#edd6bb] placeholder:text-slate-400 dark:placeholder:text-[#8b7e6d] font-medium focus:outline-none focus:border-[#e1b329]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#8a715e] dark:text-[#edd6bb] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#e1b329]" />
                <span>Alamat Email</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="budi@company.co.id"
                className="w-full glass-panel border border-[#8a715e]/30 dark:border-[#edd6bb]/25 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-[#edd6bb] placeholder:text-slate-400 dark:placeholder:text-[#8b7e6d] font-medium focus:outline-none focus:border-[#e1b329]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#8a715e] dark:text-[#edd6bb] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#e1b329]" />
                <span>Password (Min 6 Karakter)</span>
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full glass-panel border border-[#8a715e]/30 dark:border-[#edd6bb]/25 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-[#edd6bb] placeholder:text-slate-400 dark:placeholder:text-[#8b7e6d] font-mono focus:outline-none focus:border-[#e1b329]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] disabled:opacity-50 text-slate-950 font-extrabold text-xs shadow-lg shadow-[#e1b329]/25 flex items-center justify-center gap-2 transition-all mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              <span>{loading ? "Mendaftarkan..." : "Daftar Akun Baru"}</span>
            </button>
          </form>

          <div className="pt-3 border-t border-[#8a715e]/15 dark:border-[#edd6bb]/15 flex items-center justify-between text-xs">
            <span className="text-[#8a715e] dark:text-[#8b7e6d]">Sudah memiliki akun?</span>
            <Link href="/login" className="font-bold text-[#e1b329] hover:underline flex items-center gap-1">
              <span>Masuk Sekarang</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
