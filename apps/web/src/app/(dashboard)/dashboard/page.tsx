"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Code2,
  Layers,
  Play,
  Zap,
  Feather,
  BarChart3,
  DollarSign,
  FileText,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { fetchCallSpecs, fetchExecutionLogs } from "@/lib/api-client";
import { CallSpec, ExecutionLog } from "@/lib/types";

export default function DashboardPage() {
  const [specs, setSpecs] = useState<CallSpec[]>([]);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    const [specData, logData] = await Promise.all([fetchCallSpecs(), fetchExecutionLogs()]);
    setSpecs(specData);
    setLogs(logData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalExecutions = logs.length;
  const successfulRequests = logs.filter((l) => l.status === "SUCCESS" || l.httpStatus === 200).length;
  const successRate = totalExecutions > 0 ? ((successfulRequests / totalExecutions) * 100).toFixed(1) : "0.0";
  const activeSpecsCount = specs.length;
  const totalTokens = logs.reduce((acc, l) => acc + (l.totalTokens || 0), 0);
  const totalCost = logs.reduce((acc, l) => acc + (l.costUsd || 0), 0);
  const avgLatency =
    totalExecutions > 0 ? Math.round(logs.reduce((acc, l) => acc + (l.processingTimeMs || 0), 0) / totalExecutions) : 0;

  const filteredLogs = logs.filter(
    (l) =>
      (l.requestId || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.specName || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.provider || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Welcome Banner */}
      <div className="relative rounded-3xl p-8 overflow-hidden glass-panel border border-[#edd6bb]/20 bg-gradient-to-r from-[#241c16] via-[#1c1713] to-[#120e0b]">
        <div className="absolute right-0 top-0 w-96 h-96 bg-[#e1b329]/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e1b329]/10 border border-[#e1b329]/30 text-[#ffb443] text-xs font-semibold">
            <Feather className="w-3.5 h-3.5 text-[#e1b329]" />
            <span>Python Gateway & Bun Engine Active</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#edd6bb] sm:text-4xl">
            Developer <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="text-sm text-[#edd6bb]/80 leading-relaxed">
            Multimodal Gateway telemetry, real-time API execution stream, model latency, and spec performance metrics.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href="/specs"
              className="px-4 py-2.5 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 text-xs font-bold shadow-lg shadow-[#e1b329]/20 flex items-center gap-2 transition-all"
            >
              <Code2 className="w-4 h-4" />
              <span>Create Call Spec</span>
            </Link>
            <Link
              href="/playground"
              className="px-4 py-2.5 rounded-xl glass-panel hover:bg-[#edd6bb]/10 text-[#edd6bb] text-xs font-semibold flex items-center gap-2 transition-all border border-[#edd6bb]/20"
            >
              <Play className="w-4 h-4 text-[#e1b329]" />
              <span>Open Playground</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Primary Analytics & Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-panel p-5 rounded-2xl border border-[#edd6bb]/15 space-y-2">
          <div className="flex items-center justify-between text-[#8b7e6d]">
            <span className="text-xs font-medium">Total API Executions</span>
            <div className="p-2 rounded-lg bg-[#e1b329]/10 text-[#e1b329]">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#edd6bb]">{loading ? "..." : totalExecutions.toLocaleString()}</p>
          <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{successRate}% Success Rate</span>
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-[#edd6bb]/15 space-y-2">
          <div className="flex items-center justify-between text-[#8b7e6d]">
            <span className="text-xs font-medium">Avg Processing Latency</span>
            <div className="p-2 rounded-lg bg-[#ffb443]/10 text-[#ffb443]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#edd6bb]">{loading ? "..." : `${avgLatency} ms`}</p>
          <p className="text-[11px] text-indigo-400 font-medium">RAM Stream Decoding</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-[#edd6bb]/15 space-y-2">
          <div className="flex items-center justify-between text-[#8b7e6d]">
            <span className="text-xs font-medium">Active Call Specs</span>
            <div className="p-2 rounded-lg bg-[#8a715e]/20 text-[#edd6bb]">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#edd6bb]">{loading ? "..." : `${activeSpecsCount} Specs`}</p>
          <p className="text-[11px] text-[#ffb443] font-medium">Strict JSON Schemas</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-[#edd6bb]/15 space-y-2">
          <div className="flex items-center justify-between text-[#8b7e6d]">
            <span className="text-xs font-medium">Total AI Cost (USD)</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{loading ? "..." : `$${totalCost.toFixed(4)}`}</p>
          <p className="text-[11px] text-[#8b7e6d]">{totalTokens.toLocaleString()} Tokens Used</p>
        </div>
      </div>

      {/* Execution Telemetry & Request Stream Table */}
      <div className="glass-panel p-6 rounded-2xl border border-[#edd6bb]/20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#edd6bb]/15">
          <div>
            <h2 className="text-lg font-bold text-[#edd6bb] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#e1b329]" />
              <span>Realtime Execution Telemetry & Stream Logs</span>
            </h2>
            <p className="text-xs text-[#8b7e6d]">Inspecting request streams, latencies, tokens, and model status codes</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8b7e6d]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search request ID or spec..."
                className="w-full glass-panel border border-[#edd6bb]/20 rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#edd6bb] focus:outline-none focus:border-[#e1b329]"
              />
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl glass-panel hover:bg-[#e1b329]/15 text-[#edd6bb] text-xs font-semibold border border-[#edd6bb]/20 flex items-center gap-1.5 shrink-0 transition-all"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 text-[#e1b329]" />}
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#e1b329]" />
            <p className="text-xs font-semibold">Streaming Execution Metrics...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <FileText className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs">No execution telemetry logs found matching criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[#8b7e6d] border-b border-[#edd6bb]/15 bg-[#120e0b]/40">
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
              <tbody className="divide-y divide-[#edd6bb]/15 text-slate-300 font-mono">
                {filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-[#e1b329]/5 transition-colors">
                    <td className="py-3 px-3 text-[#ffb443] font-bold">{l.requestId || l.id}</td>
                    <td className="py-3 px-3 font-sans font-semibold text-[#edd6bb]">{l.specName || "Extraction Spec"}</td>
                    <td className="py-3 px-3 font-sans text-xs text-[#8b7e6d]">
                      {(l.provider || "Gemini").toUpperCase()} ({l.model || "standard"})
                    </td>
                    <td className="py-3 px-3">{l.processingTimeMs} ms</td>
                    <td className="py-3 px-3">{l.totalTokens?.toLocaleString()}</td>
                    <td className="py-3 px-3 text-[#e1b329]">${l.costUsd?.toFixed(4)}</td>
                    <td className="py-3 px-3 font-sans">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                        {l.httpStatus || 200} OK
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
