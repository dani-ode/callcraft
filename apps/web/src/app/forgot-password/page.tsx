"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { Feather, Mail, ArrowLeft, Send, AlertCircle, CheckCircle2, Loader2, Clock } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { forgotPassword } from "@/lib/api-client";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading || cooldown > 0) return;

    setLoading(true);
    setError(null);

    try {
      await forgotPassword(email.trim());
      setSubmitted(true);
      setCooldown(60);
    } catch (err: any) {
      setError(err.message || "Gagal mengirimkan instruksi reset password. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative transition-colors duration-200">
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#e1b329] via-[#ffb443] to-[#8a715e] p-0.5 shadow-xl shadow-[#e1b329]/20 mx-auto">
            <div className="w-full h-full bg-[#fdfaf5] dark:bg-[#120e0b] rounded-[14px] flex items-center justify-center transition-colors">
              <Feather className="w-7 h-7 text-[#e1b329]" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight gradient-text">Lupa Password</h1>
          <p className="text-xs text-[#8a715e] dark:text-[#8b7e6d]">
            Masukkan email Anda untuk menerima instruksi reset password
          </p>
        </div>

        <div className="glass-panel p-8 rounded-3xl border border-[#8a715e]/20 dark:border-[#edd6bb]/20 shadow-2xl space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-xs flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {submitted ? (
            <div className="space-y-5 text-center py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-500">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-800 dark:text-[#edd6bb]">Cek Inbox Email Anda</h3>
                <p className="text-xs text-[#8a715e] dark:text-[#8b7e6d] leading-relaxed">
                  Jika email <span className="font-semibold text-[#e1b329]">{email}</span> terdaftar di Callcraft, kami telah mengirimkan link untuk mereset password Anda.
                </p>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  disabled={loading || cooldown > 0}
                  onClick={handleSubmit}
                  className="px-4 py-2 rounded-xl bg-slate-800 dark:bg-[#1f1914] border border-[#8a715e]/30 dark:border-[#edd6bb]/20 text-[#edd6bb] hover:border-[#e1b329] font-bold text-xs flex items-center justify-center gap-2 mx-auto transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : cooldown > 0 ? (
                    <Clock className="w-3.5 h-3.5 text-[#e1b329]" />
                  ) : (
                    <Send className="w-3.5 h-3.5 text-[#e1b329]" />
                  )}
                  <span>
                    {loading
                      ? "Mengirim..."
                      : cooldown > 0
                      ? `Kirim Ulang (${cooldown}d)`
                      : "Kirim Ulang Email Reset"}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#8a715e] dark:text-[#edd6bb] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#e1b329]" />
                  <span>Alamat Email Registered</span>
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

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-3 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] disabled:opacity-50 text-slate-950 font-extrabold text-xs shadow-lg shadow-[#e1b329]/25 flex items-center justify-center gap-2 transition-all mt-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{loading ? "Mengirim Instruksi..." : "Kirim Link Reset Password"}</span>
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-[#8a715e]/15 dark:border-[#edd6bb]/15 flex items-center justify-center text-xs">
            <Link href="/login" className="font-bold text-[#8a715e] dark:text-[#edd6bb] hover:text-[#e1b329] flex items-center gap-1.5 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Halaman Login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
