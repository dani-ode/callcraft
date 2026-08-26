"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Feather,
  ArrowRight,
  Sparkles,
  Zap,
  Code2,
  Play,
  Layers,
  ExternalLink,
  LogIn,
  UserPlus,
  LayoutDashboard,
  FileText,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/context/auth-context";
import { useAppInit } from "@/context/app-init-context";
import { PYTHON_API_URL } from "@/lib/api/core";

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const { appInit, AppIconComponent, isCustomImageIcon, isLoading: loadingSettings } = useAppInit();
  const router = useRouter();
  const docsUrl = PYTHON_API_URL ? `${PYTHON_API_URL}/docs` : "/docs";

  useEffect(() => {
    if (!loadingSettings && appInit.disableLandingPage && !isLoading) {
      if (user) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [user, isLoading, appInit, loadingSettings, router]);

  if (loadingSettings || (appInit.disableLandingPage && !isLoading)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-[#e1b329]/30">
      {/* Top Public Header */}
      <header className="h-20 glass-panel border-b border-[#edd6bb]/15 px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#e1b329] via-[#ffb443] to-[#8a715e] p-0.5 shadow-lg shadow-[#e1b329]/20">
            <div className="w-full h-full bg-[#120e0b] dark:bg-[#120e0b] bg-[#f5ebe0] rounded-[10px] flex items-center justify-center overflow-hidden">
              {isCustomImageIcon ? (
                <img src={appInit.appIcon} alt={appInit.appName || "Logo"} className="w-5 h-5 object-contain" />
              ) : (
                <AppIconComponent className="w-5 h-5 text-[#e1b329]" />
              )}
            </div>
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight gradient-text">
              {appInit.appName || "Callcraft"}
            </h1>
            <p className="text-[10px] text-[#8b7e6d] font-medium">
              {appInit.tagline || "Multimodal AI Execution Gateway"}
            </p>
          </div>
        </div>

        {/* Public Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-[#8a715e] dark:text-[#edd6bb]">
          <a href="#features" className="hover:text-[#e1b329] transition-colors">Features</a>
          <a href="#code-demo" className="hover:text-[#e1b329] transition-colors">Live API Demo</a>
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-[#e1b329] transition-colors"
          >
            <span>API Docs</span>
            <ExternalLink className="w-3 h-3 text-[#e1b329]" />
          </a>
        </nav>

        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl glass-panel border border-[#edd6bb]/20">
                <div className="w-6 h-6 rounded-full bg-[#e1b329]/20 text-[#e1b329] text-[10px] font-bold flex items-center justify-center">
                  {user.avatar || "U"}
                </div>
                <span className="text-xs font-bold text-[#8a715e] dark:text-[#edd6bb]">{user.name}</span>
              </div>
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 font-bold text-xs shadow-lg shadow-[#e1b329]/20 flex items-center gap-1.5 transition-all"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Go to Console</span>
              </Link>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl glass-panel hover:bg-[#edd6bb]/10 text-xs font-bold border border-[#edd6bb]/20 flex items-center gap-1.5 transition-all"
              >
                <LogIn className="w-3.5 h-3.5 text-[#e1b329]" />
                <span>Sign In</span>
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 font-bold text-xs shadow-lg shadow-[#e1b329]/20 flex items-center gap-1.5 transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Get Started Free</span>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="space-y-24 py-16 px-6 max-w-7xl mx-auto flex-1">
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#e1b329]/15 border border-[#e1b329]/30 text-[#8a715e] dark:text-[#ffb443] text-xs font-bold shadow-sm">
            <Sparkles className="w-4 h-4 text-[#e1b329]" />
            <span>Multimodal PDF & Vision AI Coercion Engine</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
            Convert Document & PDF Streams into <span className="gradient-text">Validated JSON</span>
          </h1>

          <p className="text-sm md:text-base text-[#8b7e6d] dark:text-[#edd6bb]/80 max-w-2xl mx-auto leading-relaxed">
            {appInit.description ||
              "Callcraft empowers developers to design dynamic extraction specifications, enforce strict model schema constraints, and execute zero-disk RAM stream processing with Bring-Your-Own External API Keys."}
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            {user ? (
              <Link
                href="/dashboard"
                className="px-6 py-3.5 rounded-2xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 text-sm font-extrabold shadow-xl shadow-[#e1b329]/25 flex items-center gap-2.5 transition-all transform hover:-translate-y-0.5"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Open Developer Console</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href="/register"
                className="px-6 py-3.5 rounded-2xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 text-sm font-extrabold shadow-xl shadow-[#e1b329]/25 flex items-center gap-2.5 transition-all transform hover:-translate-y-0.5"
              >
                <span>Start Building Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}

            <Link
              href="/playground"
              className="px-6 py-3.5 rounded-2xl glass-panel hover:bg-[#e1b329]/15 text-sm font-bold border border-[#edd6bb]/25 flex items-center gap-2.5 transition-all"
            >
              <Play className="w-4 h-4 text-[#e1b329]" />
              <span>Try Live Playground</span>
            </Link>
          </div>
        </div>

        {/* Feature Grid Cards Section */}
        <div id="features" className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-extrabold tracking-tight">Built for Production Scale Multimodality</h2>
            <p className="text-xs text-[#8b7e6d]">Everything you need to orchestrate tool-calling and document extraction</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel glass-panel-hover p-6 rounded-3xl border border-[#edd6bb]/20 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#e1b329]/15 text-[#e1b329] flex items-center justify-center font-bold">
                <Code2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">Visual Call Specs Builder</h3>
              <p className="text-xs text-[#8b7e6d] leading-relaxed">
                Design extraction prompts, configure PDF input streams, enable Bring-Your-Own External API Keys, and enforce target JSON schemas.
              </p>
            </div>

            <div className="glass-panel glass-panel-hover p-6 rounded-3xl border border-[#edd6bb]/20 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#ffb443]/15 text-[#ffb443] flex items-center justify-center font-bold">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">Zero-Disk RAM Execution</h3>
              <p className="text-xs text-[#8b7e6d] leading-relaxed">
                Document streams, image buffers, and PDF pages are decoded directly in RAM memory. Zero bytes of sensitive user data are retained on server disks.
              </p>
            </div>

            <div className="glass-panel glass-panel-hover p-6 rounded-3xl border border-[#edd6bb]/20 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#8a715e]/20 text-[#8a715e] dark:text-[#edd6bb] flex items-center justify-center font-bold">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">Argon2id & External Keys</h3>
              <p className="text-xs text-[#8b7e6d] leading-relaxed">
                Pass external provider API keys dynamically via headers or enforce saved provider keys encrypted with AES-256-GCM.
              </p>
            </div>
          </div>
        </div>

        {/* Live Code API Demo Section */}
        <div id="code-demo" className="glass-panel p-8 rounded-3xl border border-[#edd6bb]/20 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono text-[#e1b329] font-bold uppercase tracking-wider">REST API Gateway</span>
              <h3 className="text-xl font-extrabold">Execute Call Spec with Image or PDF Stream</h3>
            </div>
            <Link
              href="/specs"
              className="px-4 py-2 rounded-xl bg-[#e1b329]/15 text-[#8a715e] dark:text-[#edd6bb] text-xs font-bold border border-[#e1b329]/30 flex items-center gap-1.5 self-start md:self-auto"
            >
              <span>Explore Call Specs Catalog</span>
              <ArrowRight className="3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            <div className="bg-[#120e0b] dark:bg-[#120e0b] bg-[#f5ebe0] p-4 rounded-2xl border border-[#edd6bb]/15 space-y-2 overflow-x-auto">
              <span className="text-[10px] text-[#8b7e6d] font-bold">// HTTP Request with PDF Stream & External Key</span>
              <pre className="text-[#edd6bb] text-[11px] leading-relaxed">
{`curl -X POST http://localhost:8080/v1/call/usr_demo \\
  -H "Authorization: Bearer call_sk_live_9988..." \\
  -H "X-CALL-SPEC-ID: invoice-extractor" \\
  -H "X-AI-API-KEY: sk-proj-ext-key-99" \\
  -H "X-AI-MODEL-NAME: gpt-4o" \\
  -F "pdf=@invoice_doc.pdf"`}
              </pre>
            </div>

            <div className="bg-[#120e0b] dark:bg-[#120e0b] bg-[#f5ebe0] p-4 rounded-2xl border border-[#edd6bb]/15 space-y-2 overflow-x-auto">
              <span className="text-[10px] text-emerald-400 font-bold">// Coerced JSON Payload Output</span>
              <pre className="text-emerald-400 text-[11px] leading-relaxed">
{`{
  "success": true,
  "request_id": "req_01M0K89X",
  "data": {
    "invoice_number": "INV-2026-9041",
    "vendor_name": "ACME LOGISTICS",
    "total_amount": 4250.00
  }
}`}
              </pre>
            </div>
          </div>
        </div>
      </main>

      {/* Public Footer */}
      <footer className="border-t border-[#edd6bb]/15 glass-panel py-8 px-8 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#8b7e6d]">
          <div className="flex items-center gap-2">
            {isCustomImageIcon ? (
              <img src={appInit.appIcon} alt={appInit.appName || "Logo"} className="w-4 h-4 object-contain" />
            ) : (
              <AppIconComponent className="w-4 h-4 text-[#e1b329]" />
            )}
            <span className="font-bold text-[#8a715e] dark:text-[#edd6bb]">
              {appInit.appName || "Callcraft"} Execution Gateway
            </span>
            <span>© 2026. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 font-bold">
            {user ? (
              <>
                <Link href="/specs" className="hover:text-[#e1b329]">Developer Console</Link>
                <Link href="/dashboard" className="hover:text-[#e1b329]">Developer Dashboard</Link>
              </>
            ) : (
              <>
                <Link href="/login" className="hover:text-[#e1b329]">Login</Link>
                <Link href="/register" className="hover:text-[#e1b329]">Register</Link>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
