"use client";

import Link from "next/link";
import {
  Users,
  Bot,
  Key,
  ShieldCheck,
  Server,
  Zap,
  Activity,
  ArrowUpRight,
  Clock,
  Lock,
  Cpu,
  Layers,
  FileText,
  AlertTriangle,
} from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="relative rounded-3xl p-8 overflow-hidden glass-panel border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-slate-950">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Standalone Platform Admin Workspace</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Admin Management <span className="gradient-text">Control Center</span>
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Centralized admin infrastructure for managing user organizations, RBAC permission scopes, 17 AI models taxonomy, encrypted provider API keys, and zero-retention memory storage.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href="/admin/users"
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-600/30 flex items-center gap-2 transition-all"
            >
              <Users className="w-4 h-4" />
              <span>Manage Users & RBAC</span>
            </Link>
            <Link
              href="/admin/models"
              className="px-4 py-2.5 rounded-xl glass-panel hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all border border-slate-800"
            >
              <Bot className="w-4 h-4 text-purple-400" />
              <span>AI Models Registry (17)</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Admin KPI Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Platform Registered Users</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-100">3 Users</p>
          <p className="text-[11px] text-amber-400 font-medium">3 RBAC Roles Configured</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">AI Model Taxonomy</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-100">17 Models</p>
          <p className="text-[11px] text-emerald-400 font-medium">Gemini, OpenAI, Claude, DeepSeek</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Encrypted Provider Keys</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Key className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-100">2 Active Keys</p>
          <p className="text-[11px] text-indigo-400 font-medium">AES-256-GCM Tested</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Core Engine Health</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-400">100% Healthy</p>
          <p className="text-[11px] text-slate-400">Python FastAPI + Bun Runtime</p>
        </div>
      </div>

      {/* Admin Management Quick Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/admin/users"
          className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-amber-500/40 transition-all space-y-3 group"
        >
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 w-fit group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-100">User Accounts & RBAC</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Manage organization members, assign roles (Super Admin, Developer, Finance Viewer), and set granular permissions.
          </p>
          <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
            <span>Manage Users</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </Link>

        <Link
          href="/admin/models"
          className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-purple-500/40 transition-all space-y-3 group"
        >
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 w-fit group-hover:scale-110 transition-transform">
            <Bot className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-100">AI Models Registry</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Configure the 17 AI models taxonomy across Google Gemini 3.6, OpenAI GPT-5.6, Claude Sonnet 5, DeepSeek VL2, and OCR 4.1.
          </p>
          <span className="text-xs font-semibold text-purple-400 flex items-center gap-1">
            <span>View Models Taxonomy</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </Link>

        <Link
          href="/admin/providers"
          className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-indigo-500/40 transition-all space-y-3 group"
        >
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 w-fit group-hover:scale-110 transition-transform">
            <Key className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-100">AI Provider Keys</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Configure and test encrypted API keys with real live HTTP verification against official Google, OpenAI, Anthropic, and DeepSeek servers.
          </p>
          <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1">
            <span>Test & Manage Keys</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </div>
    </div>
  );
}
