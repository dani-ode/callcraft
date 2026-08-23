"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Feather, Lock, Mail, ArrowRight, LogIn, AlertCircle, Loader2, Send, CheckCircle2, Clock } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { resendVerificationEmail } from "@/lib/api-client";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const redirectParam = searchParams ? searchParams.get("redirect") : null;
  const targetDestination =
    redirectParam && redirectParam.startsWith("/") && redirectParam !== "/login"
      ? redirectParam
      : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { user, isLoading, login } = useAuth();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!isLoading && user && user.status === "active") {
      router.replace(targetDestination);
    }
  }, [user, isLoading, router, targetDestination]);

  if (isLoading || (user && user.status === "active")) {
    return null;
  }

  const handleResendActivation = async () => {
    if (!email.trim() || resending || cooldown > 0) return;
    setResending(true);
    try {
      await resendVerificationEmail(email.trim());
      setResendSuccess(true);
      setCooldown(60);
    } catch (err: any) {
      setError(err.message || "Gagal mengirim ulang link verifikasi.");
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResendSuccess(false);

    try {
      await login(email, password);
      router.push(targetDestination);
    } catch (err: any) {
      setError(err.message || "Email atau password tidak valid.");
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
          <h1 className="text-3xl font-extrabold tracking-tight gradient-text">Callcraft</h1>
          <p className="text-xs text-[#8a715e] dark:text-[#8b7e6d]">Masuk ke Akun Developer Callcraft Anda</p>
        </div>

        {/* Login Form Card */}
        <div className="glass-panel p-8 rounded-3xl border border-[#8a715e]/20 dark:border-[#edd6bb]/20 shadow-2xl space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-xs space-y-2.5">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>

              {(error.includes("belum diverifikasi") || error.includes("verifikasi")) && (
                <div className="pt-1 border-t border-rose-500/20">
                  {resendSuccess ? (
                    <p className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 pt-1">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Link aktivasi baru telah dikirim ke inbox {email}.</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      disabled={resending || !email.trim() || cooldown > 0}
                      onClick={handleResendActivation}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/30 flex items-center gap-1.5 transition-all disabled:opacity-50 mt-1"
                    >
                      {resending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : cooldown > 0 ? (
                        <Clock className="w-3.5 h-3.5" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {resending
                          ? "Mengirim..."
                          : cooldown > 0
                          ? `Kirim Ulang (${cooldown}d)`
                          : "Kirim Ulang Link Verifikasi"}
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="nama@company.com"
                className="w-full glass-panel border border-[#8a715e]/30 dark:border-[#edd6bb]/25 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-[#edd6bb] placeholder:text-slate-400 dark:placeholder:text-[#8b7e6d] font-medium focus:outline-none focus:border-[#e1b329]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#8a715e] dark:text-[#edd6bb] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#e1b329]" />
                <span>Password</span>
              </label>
              <input
                type="password"
                required
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
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              <span>{loading ? "Memverifikasi..." : "Masuk ke Callcraft"}</span>
            </button>
          </form>

          <div className="pt-4 border-t border-[#8a715e]/15 dark:border-[#edd6bb]/15 flex items-center justify-between text-xs">
            <span className="text-[#8a715e] dark:text-[#8b7e6d]">Belum memiliki akun?</span>
            <Link href="/register" className="font-bold text-[#e1b329] hover:underline flex items-center gap-1">
              <span>Daftar Akun Baru</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
