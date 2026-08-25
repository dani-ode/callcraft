"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Zap,
  Clock,
  Layers,
  DollarSign,
  BarChart3,
  Search,
  RefreshCw,
  Loader2,
  FileText,
  Code2,
  Play,
  Key,
  TrendingUp,
  Activity,
  CheckCircle2,
  Boxes,
  Feather,
  Wrench,
  ShieldCheck,
  Stethoscope,
  Rocket,
  Globe,
  Cpu,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { fetchCallSpecs, fetchExecutionLogs } from "@/lib/api-client";
import { CallSpec, ExecutionLog } from "@/lib/types";
import { useProject } from "@/context/project-context";

const ICON_MAP: Record<string, React.ElementType> = {
  Boxes,
  Feather,
  Wrench,
  ShieldCheck,
  Stethoscope,
  Rocket,
  Layers,
  Globe,
  Code2,
  Cpu,
};

function ProjectIcon({ icon, color, className = "w-5 h-5" }: { icon: string; color: string; className?: string }) {
  const IconComponent = ICON_MAP[icon] ?? Boxes;
  return <IconComponent className={className} style={{ color }} />;
}

// Chart Palette Colors
const PROVIDER_COLORS: Record<string, string> = {
  gemini: "#e1b329",
  openai: "#10b981",
  anthropic: "#6366f1",
  deepseek: "#06b6d4",
  mistral: "#f59e0b",
  other: "#8b5cf6",
};

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: "#10b981",
  FAILED: "#ef4444",
  VALIDATION_ERROR: "#f59e0b",
};

export default function DashboardPage() {
  const { activeProject } = useProject();
  const [specs, setSpecs] = useState<CallSpec[]>([]);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [specData, logData] = await Promise.all([
        fetchCallSpecs(activeProject?.id),
        fetchExecutionLogs(activeProject?.id),
      ]);
      setSpecs(specData || []);
      setLogs(logData || []);
    } catch (err) {
      console.warn("Failed to load dashboard telemetry data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeProject?.id]);

  // Metrics Calculations
  const totalExecutions = logs.length;
  const successfulRequests = logs.filter(
    (l) => l.status === "SUCCESS" || l.httpStatus === 200 || (l.status as string) === "completed"
  ).length;
  const successRate = totalExecutions > 0 ? ((successfulRequests / totalExecutions) * 100).toFixed(1) : "0.0";
  const activeSpecsCount = specs.length;
  const totalTokens = logs.reduce((acc, l) => acc + (l.totalTokens || 0), 0);
  const totalCost = logs.reduce((acc, l) => acc + (l.costUsd || 0), 0);
  const avgLatency =
    totalExecutions > 0 ? Math.round(logs.reduce((acc, l) => acc + (l.processingTimeMs || 0), 0) / totalExecutions) : 0;

  // Chart Data 1: Execution & Token Volume Trend (REAL DATA ONLY)
  const trendData = useMemo(() => {
    if (!logs || logs.length === 0) return [];

    // Group logs by created date
    const map: Record<string, { executions: number; totalMs: number; tokens: number }> = {};
    for (const log of logs) {
      const d = log.createdAt ? log.createdAt.split("T")[0] : "Today";
      if (!map[d]) {
        map[d] = { executions: 0, totalMs: 0, tokens: 0 };
      }
      map[d].executions += 1;
      map[d].totalMs += log.processingTimeMs || 0;
      map[d].tokens += log.totalTokens || 0;
    }

    return Object.entries(map)
      .slice(-7)
      .map(([dateStr, val]) => ({
        name: dateStr.length > 5 ? dateStr.substring(5) : dateStr,
        executions: val.executions,
        latency: Math.round(val.totalMs / (val.executions || 1)),
        tokens: val.tokens,
      }));
  }, [logs]);

  // Chart Data 2: AI Provider Distribution Pie Chart (REAL DATA ONLY)
  const providerData = useMemo(() => {
    if (!logs || logs.length === 0) return [];

    const counts: Record<string, number> = {};
    for (const l of logs) {
      const p = (l.provider || "gemini").toLowerCase();
      counts[p] = (counts[p] || 0) + 1;
    }

    return Object.entries(counts).map(([code, value]) => ({
      name: code.toUpperCase(),
      value,
      color: PROVIDER_COLORS[code] || PROVIDER_COLORS.other,
    }));
  }, [logs]);

  // Chart Data 3: Execution Status Breakdown (REAL DATA ONLY)
  const statusData = useMemo(() => {
    if (!logs || logs.length === 0) return [];

    const counts: Record<string, number> = {};
    for (const l of logs) {
      const st = (l.status as string) === "completed" ? "SUCCESS" : l.status || "SUCCESS";
      counts[st] = (counts[st] || 0) + 1;
    }

    return Object.entries(counts).map(([st, value]) => ({
      name: st,
      value,
      color: STATUS_COLORS[st] || "#e1b329",
    }));
  }, [logs]);

  // Log Search Filtering
  const filteredLogs = logs.filter(
    (l) =>
      (l.requestId || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.specName || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.provider || "").toLowerCase().includes(search.toLowerCase())
  );

  const themeColor = activeProject?.color || "#e1b329";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Bar with Project Badge & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-[#8a715e]/20 dark:border-[#edd6bb]/15 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
            style={{ backgroundColor: `${themeColor}25` }}
          >
            <ProjectIcon icon={activeProject?.icon || "Boxes"} color={themeColor} className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-[#edd6bb]">
                {activeProject ? activeProject.name : "Dashboard Telemetri"}
              </h1>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border"
                style={{
                  backgroundColor: `${themeColor}20`,
                  color: themeColor,
                  borderColor: `${themeColor}40`,
                }}
              >
                Project Active
              </span>
            </div>
            <p className="text-xs text-[#8a715e] dark:text-[#8b7e6d] mt-0.5 flex items-center gap-2 font-mono">
              <span>{activeProject?.slug || "default-project"}</span>
              <span>•</span>
              <span className="text-emerald-500 dark:text-emerald-400 font-sans font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                Gateway Engine Online
              </span>
            </p>
          </div>
        </div>

        {/* Quick Action Navigation */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/specs"
            className="px-3.5 py-2 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 text-xs font-extrabold shadow-md shadow-[#e1b329]/20 flex items-center gap-1.5 transition-all"
          >
            <Code2 className="w-4 h-4" />
            <span>Call Specs</span>
          </Link>
          <Link
            href="/playground"
            className="px-3.5 py-2 rounded-xl glass-panel hover:bg-[#8a715e]/15 text-slate-800 dark:text-[#edd6bb] text-xs font-bold flex items-center gap-1.5 transition-all border border-[#8a715e]/20"
          >
            <Play className="w-4 h-4 text-[#e1b329]" />
            <span>Playground</span>
          </Link>
          <Link
            href="/keys"
            className="px-3.5 py-2 rounded-xl glass-panel hover:bg-[#8a715e]/15 text-slate-800 dark:text-[#edd6bb] text-xs font-bold flex items-center gap-1.5 transition-all border border-[#8a715e]/20"
          >
            <Key className="w-4 h-4 text-[#e1b329]" />
            <span>API Keys</span>
          </Link>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl glass-panel hover:bg-[#8a715e]/15 text-[#8a715e] dark:text-[#edd6bb] transition-all border border-[#8a715e]/20"
            title="Refresh telemetri"
          >
            <RefreshCw className={`w-4 h-4 text-[#e1b329] ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Primary Telemetry Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Executions */}
        <div className="glass-panel p-5 rounded-2xl border border-[#8a715e]/20 dark:border-[#edd6bb]/15 space-y-3 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8a715e] dark:text-[#8b7e6d]">Total API Executions</span>
            <div className="p-2 rounded-xl bg-[#e1b329]/15 text-[#e1b329]">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-[#edd6bb]">
              {loading ? "..." : totalExecutions.toLocaleString()}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{successRate}% Success Rate</span>
            </div>
          </div>
        </div>

        {/* Card 2: Avg Processing Latency */}
        <div className="glass-panel p-5 rounded-2xl border border-[#8a715e]/20 dark:border-[#edd6bb]/15 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8a715e] dark:text-[#8b7e6d]">Avg Response Latency</span>
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-[#edd6bb]">
              {loading ? "..." : `${avgLatency} ms`}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-bold mt-1">
              <Activity className="w-3.5 h-3.5" />
              <span>RAM Stream Processing</span>
            </div>
          </div>
        </div>

        {/* Card 3: Active Call Specs */}
        <div className="glass-panel p-5 rounded-2xl border border-[#8a715e]/20 dark:border-[#edd6bb]/15 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8a715e] dark:text-[#8b7e6d]">Active Call Specs</span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-[#edd6bb]">
              {loading ? "..." : `${activeSpecsCount} Specs`}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Project Isolated</span>
            </div>
          </div>
        </div>

        {/* Card 4: Total Cost & Token Usage */}
        <div className="glass-panel p-5 rounded-2xl border border-[#8a715e]/20 dark:border-[#edd6bb]/15 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8a715e] dark:text-[#8b7e6d]">Est. Token Cost (USD)</span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {loading ? "..." : `$${totalCost.toFixed(4)}`}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-[#8a715e] dark:text-[#8b7e6d] font-bold mt-1">
              <span>{totalTokens.toLocaleString()} Tokens Processed</span>
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS SECTION (Recharts Library) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Execution Volume & Latency Chart (2 Cols) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-[#8a715e]/20 dark:border-[#edd6bb]/15 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-[#edd6bb] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#e1b329]" />
                <span>Tren Eksekusi API & Volume Token (7 Hari)</span>
              </h2>
              <p className="text-xs text-[#8a715e] dark:text-[#8b7e6d]">
                Grafik performa pemanggilan API spec dan penggunaan token harian
              </p>
            </div>
            <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              Live Telemetri
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            {trendData.length === 0 ? (
              <div className="h-full w-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-[#8a715e]/30 dark:border-[#edd6bb]/20 rounded-2xl">
                <BarChart3 className="w-8 h-8 text-[#8b7e6d] opacity-40 mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-[#edd6bb]">Belum Ada Data Grafik Eksekusi</p>
                <p className="text-[11px] text-[#8a715e] dark:text-[#8b7e6d] mt-1 max-w-xs">
                  Jalankan eksekusi API spec via Playground atau HTTP request untuk melihat tren performa real-time.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorExec" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={themeColor} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={themeColor} stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#8a715e20" />
                  <XAxis dataKey="name" stroke="#8b7e6d" fontSize={11} tickLine={false} />
                  <YAxis stroke="#8b7e6d" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#120e0b",
                      borderColor: "#8a715e40",
                      borderRadius: "12px",
                      color: "#edd6bb",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="executions"
                    name="Eksekusi (Calls)"
                    stroke={themeColor}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorExec)"
                  />
                  <Area
                    type="monotone"
                    dataKey="latency"
                    name="Latency (ms)"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorLatency)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* AI Provider Breakdown Chart (1 Col) */}
        <div className="glass-panel p-6 rounded-3xl border border-[#8a715e]/20 dark:border-[#edd6bb]/15 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-[#edd6bb] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#e1b329]" />
              <span>Distribusi AI Provider</span>
            </h2>
            <p className="text-xs text-[#8a715e] dark:text-[#8b7e6d]">
              Proporsi penggunaan model AI (Gemini, OpenAI, Anthropic)
            </p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            {providerData.length === 0 ? (
              <div className="text-center p-4 border border-dashed border-[#8a715e]/30 dark:border-[#edd6bb]/20 rounded-2xl w-full h-full flex flex-col items-center justify-center">
                <Cpu className="w-8 h-8 text-[#8b7e6d] opacity-40 mb-1.5" />
                <p className="text-xs font-bold text-slate-700 dark:text-[#edd6bb]">Belum Ada Data Provider</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={providerData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {providerData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#120e0b",
                      borderColor: "#8a715e40",
                      borderRadius: "12px",
                      color: "#edd6bb",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    formatter={(value) => <span className="text-xs font-bold text-slate-800 dark:text-[#edd6bb]">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="pt-2 border-t border-[#8a715e]/15 flex items-center justify-between text-xs text-[#8a715e] dark:text-[#8b7e6d]">
            <span>Engine Mode</span>
            <span className="font-bold text-[#e1b329]">Multimodal Coercion</span>
          </div>
        </div>
      </div>

      {/* Execution Telemetry Stream Table */}
      <div className="glass-panel p-6 rounded-3xl border border-[#8a715e]/20 dark:border-[#edd6bb]/15 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#8a715e]/15">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-[#edd6bb] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#e1b329]" />
              <span>Realtime Execution Telemetry & Audit Logs</span>
            </h2>
            <p className="text-xs text-[#8a715e] dark:text-[#8b7e6d]">
              Riwayat eksekusi API, latency, penggunaan token, dan status HTTP
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8b7e6d]" />
              <input
                id="search-telemetry-input"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari Request ID atau Spec..."
                className="w-full glass-panel border border-[#8a715e]/30 dark:border-[#edd6bb]/25 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-[#edd6bb] placeholder:text-slate-400 focus:outline-none focus:border-[#e1b329]"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-[#8a715e] dark:text-[#8b7e6d] space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#e1b329]" />
            <p className="text-xs font-semibold">Memuat Data Telemetri Project...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-[#8a715e] dark:text-[#8b7e6d] space-y-2">
            <FileText className="w-8 h-8 mx-auto opacity-40" />
            <p className="text-xs">Belum ada log eksekusi untuk project ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[#8b7e6d] border-b border-[#8a715e]/15 bg-[#8a715e]/5">
                <tr>
                  <th className="py-2.5 px-3">Request ID</th>
                  <th className="py-2.5 px-3">Spec Name</th>
                  <th className="py-2.5 px-3">AI Provider & Model</th>
                  <th className="py-2.5 px-3">Latency</th>
                  <th className="py-2.5 px-3">Tokens</th>
                  <th className="py-2.5 px-3">Cost (USD)</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#8a715e]/15 font-mono">
                {filteredLogs.map((l) => {
                  const isOk = l.httpStatus === 200 || l.status === "SUCCESS" || (l.status as string) === "completed";
                  return (
                    <tr key={l.id} className="hover:bg-[#e1b329]/5 transition-colors">
                      <td className="py-3 px-3 font-bold text-[#e1b329]">{l.requestId || l.id}</td>
                      <td className="py-3 px-3 font-sans font-semibold text-slate-800 dark:text-[#edd6bb]">
                        {l.specName || "Extraction Spec"}
                      </td>
                      <td className="py-3 px-3 font-sans text-xs text-[#8b7e6d]">
                        {(l.provider || "Gemini").toUpperCase()} ({l.model || "standard"})
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300">{l.processingTimeMs} ms</td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300">{l.totalTokens?.toLocaleString()}</td>
                      <td className="py-3 px-3 text-emerald-600 dark:text-emerald-400 font-bold">
                        ${l.costUsd?.toFixed(4)}
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isOk
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                          }`}
                        >
                          {l.httpStatus || 200} {isOk ? "OK" : "ERROR"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
