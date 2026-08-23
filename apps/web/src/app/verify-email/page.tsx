"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  ArrowRight,
  Send,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Clock,
} from "lucide-react";
import { verifyEmailToken, resendVerificationEmail } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const tokenParam = searchParams.get("token") || "";
  const emailParam = searchParams.get("email") || "";
  const isRegisteredParam = searchParams.get("registered") === "true";

  const [verifying, setVerifying] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [statusMessage, setStatusMessage] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!isLoading && user && user.status === "active") {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (tokenParam && emailParam) {
      autoVerify(tokenParam, emailParam);
    }
  }, [tokenParam, emailParam]);

  if (isLoading || (user && user.status === "active")) {
    return null;
  }

  async function autoVerify(token: string, emailAddr: string) {
    setVerifying(true);
    try {
      const res = await verifyEmailToken({ token, email: emailAddr });
      setVerifiedSuccess(true);
      setStatusMessage({ message: res.message || "Email berhasil diverifikasi!", type: "success" });
    } catch (err: any) {
      setStatusMessage({ message: err.message || "Gagal memverifikasi link aktivasi email.", type: "error" });
    } finally {
      setVerifying(false);
    }
  }

  async function handleResendEmail() {
    if (!emailParam.trim() || resending || cooldown > 0) return;
    setResending(true);
    try {
      const res = await resendVerificationEmail(emailParam.trim());
      setStatusMessage({
        message: res.message || `Link aktivasi baru berhasil dikirim ulang ke inbox ${emailParam}!`,
        type: "success",
      });
      setCooldown(60);
    } catch (err: any) {
      setStatusMessage({ message: err.message || "Gagal mengirim ulang link aktivasi.", type: "error" });
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-[#edd6bb]/25 space-y-6 shadow-2xl bg-[#17120e]/95 text-center transition-all duration-300">
      {/* Brand Header */}
      <div className="space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-[#e1b329]/20 text-[#e1b329] font-extrabold text-2xl flex items-center justify-center mx-auto border border-[#e1b329]/40 shadow-lg shadow-[#e1b329]/10">
          <Sparkles className="w-7 h-7 text-[#e1b329]" />
        </div>
        <h1 className="text-2xl font-extrabold text-[#edd6bb] tracking-tight">Callcraft AI Gateway</h1>
      </div>

      {/* STATE 1: Automatic Verification Loading Spinner */}
      {verifying && (
        <div className="py-10 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-[#e1b329]" />
          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-[#edd6bb]">Memverifikasi Token Aktivasi...</h2>
            <p className="text-xs text-[#8b7e6d]">Mohon tunggu sebentar, sistem sedang mengaktifkan akun Anda.</p>
          </div>
        </div>
      )}

      {/* STATE 2: Verification Successful (Token verified) */}
      {verifiedSuccess && (
        <div className="py-4 space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-extrabold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Akun Aktif & Terverifikasi</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-100 dark:text-[#edd6bb]">Email Berhasil Diverifikasi!</h2>
            <p className="text-xs text-[#8b7e6d] leading-relaxed">
              Selamat, akun Anda telah aktif 100%. Silakan masuk dengan email dan password Anda di halaman login.
            </p>
          </div>

          <Link
            href="/login"
            className="w-full py-3.5 rounded-2xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 font-extrabold text-xs shadow-xl shadow-[#e1b329]/25 flex items-center justify-center gap-2 transition-all transform active:scale-95"
          >
            <span>Lanjut ke Halaman Login</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* STATE 3: Notice from Register or Unverified Account (NO Token or Invalid Token) */}
      {!verifying && !verifiedSuccess && (
        <div className="space-y-6 text-center animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-2xl bg-[#e1b329]/15 text-[#e1b329] flex items-center justify-center mx-auto border border-[#e1b329]/30 shadow-md">
            <Mail className="w-8 h-8 text-[#e1b329]" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-[#e1b329]/15 text-[#ffb443] border border-[#e1b329]/30 text-[11px] font-extrabold uppercase tracking-wider">
              {isRegisteredParam ? "Pendaftaran Akun Berhasil" : "Verifikasi Email Diperlukan"}
            </span>
            <h2 className="text-xl font-extrabold text-[#edd6bb]">Periksa Inbox Email Anda</h2>
            <p className="text-xs text-[#8b7e6d]">
              Sistem telah mengirimkan link instruksi aktivasi akun ke alamat email:
            </p>
          </div>

          {/* Email Highlight Box */}
          {emailParam ? (
            <div className="px-4 py-3 rounded-2xl bg-[#e1b329]/15 border border-[#e1b329]/30 text-[#ffb443] font-mono text-xs font-bold truncate shadow-inner">
              {emailParam}
            </div>
          ) : (
            <div className="px-4 py-3 rounded-2xl bg-[#e1b329]/10 border border-[#e1b329]/25 text-[#8b7e6d] text-xs font-medium">
              Link aktivasi telah dikirim ke inbox email terdaftar Anda.
            </div>
          )}

          <p className="text-xs text-[#8b7e6d] leading-relaxed">
            Silakan buka email Anda dan klik tombol <strong className="text-[#edd6bb]">[Aktivasi Akun Sekarang]</strong> untuk mengaktifkan akun.
          </p>

          {/* Status Toast Message */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-2xl border text-xs font-bold text-left shadow-md ${
                statusMessage.type === "success"
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  : "bg-rose-500/15 border-rose-500/30 text-rose-400"
              }`}
            >
              {statusMessage.message}
            </div>
          )}

          {/* Resend Action Button (With 60s Cooldown Timer) */}
          {emailParam && (
            <div className="pt-2 space-y-3">
              <button
                type="button"
                disabled={resending || cooldown > 0}
                onClick={handleResendEmail}
                className="w-full py-3.5 rounded-2xl bg-[#e1b329] hover:bg-[#ffb443] disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-extrabold text-xs shadow-xl shadow-[#e1b329]/25 flex items-center justify-center gap-2 transition-all transform active:scale-95"
              >
                {resending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : cooldown > 0 ? (
                  <Clock className="w-4 h-4 text-slate-950" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>
                  {resending
                    ? "Mengirim Email Baru..."
                    : cooldown > 0
                    ? `Kirim Ulang Link Aktivasi (${cooldown}d)`
                    : "Kirim Ulang Link Aktivasi"}
                </span>
              </button>
              <p className="text-[11px] text-[#8b7e6d]">
                {cooldown > 0
                  ? `Tombol kirim ulang dapat digunakan kembali dalam ${cooldown} detik.`
                  : "Belum menerima email? Cek folder Spam/Junk atau klik tombol di atas."}
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-[#edd6bb]/15">
            <Link
              href="/login"
              className="text-xs text-[#8b7e6d] hover:text-[#e1b329] font-extrabold inline-flex items-center gap-1.5 transition-colors"
            >
              <span>Kembali ke Halaman Login</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-[#0c0a08] text-[#edd6bb] flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="text-center p-8 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#e1b329]" />
            <p className="text-xs text-slate-400 font-semibold">Memuat Halaman Verifikasi Email...</p>
          </div>
        }
      >
        <VerifyEmailForm />
      </Suspense>
    </div>
  );
}
