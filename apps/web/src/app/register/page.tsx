"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Feather, Lock, Mail, User, Building, ArrowRight, UserPlus } from "lucide-react";
import { useAuth } from "@/context/auth-context";

export default function UserRegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, isLoading, register } = useAuth();
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
    await register(name || "New Developer", email || "dev@company.io", password);
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
          <h1 className="text-3xl font-extrabold tracking-tight gradient-text">Create Account</h1>
          <p className="text-xs text-[#8b7e6d]">Register your Callcraft Developer Studio account</p>
        </div>

        {/* Register Form Card */}
        <div className="glass-panel p-8 rounded-3xl border border-[#edd6bb]/20 shadow-2xl space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#8a715e] dark:text-[#edd6bb] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#e1b329]" />
                <span>Full Name</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Budi Santoso"
                className="w-full glass-panel border border-[#edd6bb]/25 rounded-xl px-4 py-2.5 text-xs text-[#8a715e] dark:text-[#edd6bb] font-medium focus:outline-none focus:border-[#e1b329]"
              />
            </div>

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
                placeholder="budi@company.co.id"
                className="w-full glass-panel border border-[#edd6bb]/25 rounded-xl px-4 py-2.5 text-xs text-[#8a715e] dark:text-[#edd6bb] font-medium focus:outline-none focus:border-[#e1b329]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#8a715e] dark:text-[#edd6bb] flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#e1b329]" />
                <span>Company / Organization (Optional)</span>
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="PT Callcraft Tech Indonesia"
                className="w-full glass-panel border border-[#edd6bb]/25 rounded-xl px-4 py-2.5 text-xs text-[#8a715e] dark:text-[#edd6bb] font-medium focus:outline-none focus:border-[#e1b329]"
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
                className="w-full glass-panel border border-[#edd6bb]/25 rounded-xl px-4 py-2.5 text-xs text-[#8a715e] dark:text-[#edd6bb] font-mono focus:outline-none focus:border-[#e1b329]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 font-extrabold text-xs shadow-lg shadow-[#e1b329]/25 flex items-center justify-center gap-2 transition-all mt-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? "Creating Account..." : "Create Free Account"}</span>
            </button>
          </form>

          <div className="pt-3 border-t border-[#edd6bb]/15 flex items-center justify-between text-xs">
            <span className="text-[#8b7e6d]">Already have an account?</span>
            <Link href="/login" className="font-bold text-[#e1b329] hover:underline flex items-center gap-1">
              <span>Sign In</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
