"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Feather, Lock, CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { resetPassword, verifyResetToken } from "@/lib/api-client";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams ? searchParams.get("token") : null;
  const email = searchParams ? searchParams.get("email") : null;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Token reset password tidak valid atau tidak ditemukan.");
      setVerifying(false);
      return;
    }

    const checkToken = async () => {
      setVerifying(true);
      try {
        await verifyResetToken(token, email || undefined);
        setTokenValid(true);
      } catch (err: any) {
        setError(err.message || "Token reset password tidak valid atau telah kedaluwarsa.");
        setTokenValid(false);
      } finally {
        setVerifying(false);
      }
    };

    checkToken();
  }, [token, email]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Token reset password tidak valid atau tidak ditemukan.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password baru minimal harus 6 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak cocok dengan password baru.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await resetPassword({
        email: email || undefined,
        token: token,
        newPassword: newPassword,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Gagal mereset password. Token mungkin sudah kedaluwarsa.");
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
          <h1 className="text-3xl font-extrabold tracking-tight gradient-text">Reset Password</h1>
          <p className="text-xs text-[#8a715e] dark:text-[#8b7e6d]">
            Buat password baru untuk akun Callcraft Anda
          </p>
        </div>

        <div className="glass-panel p-8 rounded-3xl border border-[#8a715e]/20 dark:border-[#edd6bb]/20 shadow-2xl space-y-6">
          {verifying ? (
            <div className="py-6 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#e1b329] mx-auto" />
              <p className="text-xs font-semibold text-[#8a715e] dark:text-[#8b7e6d]">
                Memverifikasi keaslian token reset password...
              </p>
            </div>
          ) : error && !tokenValid ? (
            <div className="p-4 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-xs flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          ) : null}


          {success ? (
            <div className="space-y-5 text-center py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-500">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-800 dark:text-[#edd6bb]">Password Berhasil Diperbarui!</h3>
                <p className="text-xs text-[#8a715e] dark:text-[#8b7e6d] leading-relaxed">
                  Password akun Anda telah berhasil diperbarui. Silakan login kembali dengan password baru Anda.
                </p>
              </div>

              <div className="pt-3">
                <Link
                  href="/login"
                  className="w-full py-3 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 font-extrabold text-xs shadow-lg shadow-[#e1b329]/25 flex items-center justify-center gap-2 transition-all"
                >
                  <span>Login Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#8a715e] dark:text-[#edd6bb] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#e1b329]" />
                  <span>Password Baru</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full glass-panel border border-[#8a715e]/30 dark:border-[#edd6bb]/25 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-[#edd6bb] placeholder:text-slate-400 dark:placeholder:text-[#8b7e6d] font-mono focus:outline-none focus:border-[#e1b329]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#8a715e] dark:text-[#edd6bb] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#e1b329]" />
                  <span>Konfirmasi Password Baru</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                  className="w-full glass-panel border border-[#8a715e]/30 dark:border-[#edd6bb]/25 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-[#edd6bb] placeholder:text-slate-400 dark:placeholder:text-[#8b7e6d] font-mono focus:outline-none focus:border-[#e1b329]"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !token || !newPassword || !confirmPassword}
                className="w-full py-3 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] disabled:opacity-50 text-slate-950 font-extrabold text-xs shadow-lg shadow-[#e1b329]/25 flex items-center justify-center gap-2 transition-all mt-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{loading ? "Memperbarui Password..." : "Simpan Password Baru"}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
