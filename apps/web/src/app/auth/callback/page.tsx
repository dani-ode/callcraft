"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Feather, Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { exchangeGoogleCode } from "@/lib/api/auth";
import { ThemeToggle } from "@/components/theme-toggle";

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loginWithSessionData } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setLoading(false);
      if (errorParam === "google_cancelled" || errorParam === "access_denied") {
        setError("Otorisasi Google dibatalkan. Silakan coba kembali.");
      } else if (errorParam === "unverified_google_email") {
        setError("Akun Google Anda belum memiliki email yang terverifikasi.");
      } else if (errorParam === "account_suspended") {
        setError("Akun Anda dinonaktifkan. Silakan hubungi administrator.");
      } else {
        setError(`Gagal autentikasi via Google: ${errorParam}`);
      }
      return;
    }

    if (!code) {
      setLoading(false);
      setError("Kode otorisasi Google tidak ditemukan dalam tautan.");
      return;
    }

    let isMounted = true;

    async function processExchange() {
      try {
        const session = await exchangeGoogleCode(code!);
        if (!isMounted) return;

        loginWithSessionData({
          id: session.id,
          name: session.name,
          email: session.email,
          role: session.role,
          avatar: session.avatar,
          status: session.status,
        });

        router.replace("/dashboard");
      } catch (err: any) {
        if (!isMounted) return;
        setLoading(false);
        setError(err.message || "Gagal memverifikasi sesi Google. Silakan coba kembali.");
      }
    }

    processExchange();

    return () => {
      isMounted = false;
    };
  }, [searchParams, router, loginWithSessionData]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative transition-colors duration-200">
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
          <p className="text-xs text-[#8a715e] dark:text-[#8b7e6d]">Autentikasi Google Terenkripsi</p>
        </div>

        {/* Card */}
        <div className="glass-panel p-8 rounded-3xl border border-[#8a715e]/20 dark:border-[#edd6bb]/20 shadow-2xl space-y-6 text-center">
          {loading && !error && (
            <div className="space-y-4 py-6">
              <Loader2 className="w-10 h-10 text-[#e1b329] animate-spin mx-auto" />
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-slate-800 dark:text-[#edd6bb]">
                  Menghubungkan Akun Google...
                </h2>
                <p className="text-xs text-[#8a715e] dark:text-[#8b7e6d]">
                  Memverifikasi identitas Anda dan menyiapkan sesi aman Callcraft.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-3 text-left">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Proses Autentikasi Terhenti</p>
                  <p className="text-xs opacity-90">{error}</p>
                </div>
              </div>

              <Link
                href="/login"
                className="w-full py-3 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 font-extrabold text-xs shadow-lg shadow-[#e1b329]/25 flex items-center justify-center gap-2 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Halaman Login</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 text-[#e1b329] animate-spin" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
