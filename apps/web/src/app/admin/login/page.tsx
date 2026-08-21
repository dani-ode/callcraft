"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, Mail, ArrowLeft, Sparkles, Key } from "lucide-react";
import { useAuth } from "@/context/auth-context";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("admin@callcraft.io");
  const [password, setPassword] = useState("••••••••••••");
  const [loading, setLoading] = useState(false);
  const { adminSession, isLoading, adminLogin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && adminSession) {
      router.push("/admin");
    }
  }, [adminSession, isLoading, router]);

  if (isLoading || adminSession) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await adminLogin(email, password);
    setLoading(false);
    router.push("/admin");
  };

  const handleQuickAdminDemo = async () => {
    setLoading(true);
    await adminLogin("admin@callcraft.io");
    setLoading(false);
    router.push("/admin");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#e1b329] via-[#ffb443] to-[#8a715e] p-0.5 shadow-xl shadow-[#e1b329]/20 mx-auto">
            <div className="w-full h-full bg-[#120e0b] rounded-[14px] flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-[#e1b329]" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight">Callcraft Admin</h1>
            <span className="px-2 py-0.5 rounded bg-[#ffb443]/20 text-[#ffb443] text-[10px] font-extrabold uppercase border border-[#ffb443]/30">
              SECURITY PORTAL
            </span>
          </div>
          <p className="text-xs text-[#8b7e6d]">Argon2id Encrypted Admin Authorization Portal</p>
        </div>

        {/* Login Form Card */}
        <div className="glass-panel p-8 rounded-3xl border border-[#ffb443]/30 shadow-2xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#8a715e] dark:text-[#edd6bb] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#e1b329]" />
                <span>Super Admin Email</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@callcraft.io"
                className="w-full glass-panel border border-[#edd6bb]/25 rounded-xl px-4 py-2.5 text-xs text-[#8a715e] dark:text-[#edd6bb] font-mono focus:outline-none focus:border-[#e1b329]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#8a715e] dark:text-[#edd6bb] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#e1b329]" />
                <span>Argon2id Security Passkey</span>
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full glass-panel border border-[#edd6bb]/25 rounded-xl px-4 py-2.5 text-xs text-[#8a715e] dark:text-[#edd6bb] font-mono focus:outline-none focus:border-[#e1b329]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 font-extrabold text-xs shadow-lg shadow-[#e1b329]/25 flex items-center justify-center gap-2 transition-all mt-2"
            >
              <Key className="w-4 h-4" />
              <span>{loading ? "Authenticating..." : "Authorize Admin Session"}</span>
            </button>
          </form>

          {/* Quick Demo Login Option */}
          <div className="pt-4 border-t border-[#edd6bb]/15 space-y-3">
            <button
              type="button"
              onClick={handleQuickAdminDemo}
              className="w-full py-2.5 rounded-xl bg-[#ffb443]/15 hover:bg-[#ffb443]/25 text-[#8a715e] dark:text-[#ffb443] text-xs font-bold border border-[#ffb443]/30 flex items-center justify-center gap-2 transition-all"
            >
              <Sparkles className="w-4 h-4 text-[#ffb443]" />
              <span>Quick 1-Click Super Admin Login</span>
            </button>
          </div>
        </div>

        {/* Exit Admin Portal Link */}
        <div className="text-center">
          <Link
            href="/specs"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8b7e6d] hover:text-[#8a715e] dark:hover:text-[#edd6bb] transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to User Application</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
