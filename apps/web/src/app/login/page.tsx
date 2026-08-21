"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Feather, Lock, Mail, ArrowRight, Sparkles, LogIn } from "lucide-react";
import { useAuth } from "@/context/auth-context";

export default function UserLoginPage() {
  const [email, setEmail] = useState("dev@callcraft.io");
  const [password, setPassword] = useState("••••••••••••");
  const [loading, setLoading] = useState(false);
  const { user, isLoading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/specs");
    }
  }, [user, isLoading, router]);

  if (isLoading || user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await login(email, password);
    setLoading(false);
    router.push("/specs");
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    await login("dev@callcraft.io");
    setLoading(false);
    router.push("/specs");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#e1b329] via-[#ffb443] to-[#8a715e] p-0.5 shadow-xl shadow-[#e1b329]/20 mx-auto">
            <div className="w-full h-full bg-[#120e0b] rounded-[14px] flex items-center justify-center">
              <Feather className="w-7 h-7 text-[#e1b329]" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight gradient-text">Callcraft</h1>
          <p className="text-xs text-[#8b7e6d] dark:text-[#8b7e6d]">Sign in to your Callcraft Developer Account</p>
        </div>

        {/* Login Form Card */}
        <div className="glass-panel p-8 rounded-3xl border border-[#edd6bb]/20 shadow-2xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#8a715e] dark:text-[#edd6bb] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#e1b329]" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dev@callcraft.io"
                className="w-full glass-panel border border-[#edd6bb]/25 rounded-xl px-4 py-2.5 text-xs text-[#8a715e] dark:text-[#edd6bb] font-medium focus:outline-none focus:border-[#e1b329]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#8a715e] dark:text-[#edd6bb] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#e1b329]" />
                  <span>Password</span>
                </label>
                <a href="#" className="text-[11px] font-bold text-[#e1b329] hover:underline">
                  Forgot?
                </a>
              </div>
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
              <LogIn className="w-4 h-4" />
              <span>{loading ? "Signing in..." : "Sign In to Callcraft"}</span>
            </button>
          </form>

          {/* Quick Demo Login Option */}
          <div className="pt-4 border-t border-[#edd6bb]/15 space-y-3">
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full py-2.5 rounded-xl glass-panel hover:bg-[#e1b329]/15 text-[#8a715e] dark:text-[#edd6bb] text-xs font-bold border border-[#edd6bb]/20 flex items-center justify-center gap-2 transition-all"
            >
              <Sparkles className="w-4 h-4 text-[#e1b329]" />
              <span>Quick 1-Click Demo Login</span>
            </button>

            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-[#8b7e6d]">Don't have an account?</span>
              <Link href="/register" className="font-bold text-[#e1b329] hover:underline flex items-center gap-1">
                <span>Create Account</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
