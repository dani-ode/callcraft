"use client";

import { useState, useEffect } from "react";
import { FileText, CheckCircle2, RefreshCw, Search, Loader2 } from "lucide-react";
import { fetchExecutionLogs } from "@/lib/api-client";
import { ExecutionLog } from "@/lib/types";

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    const data = await fetchExecutionLogs();
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(
    (l) =>
      l.requestId.toLowerCase().includes(search.toLowerCase()) ||
      l.specName.toLowerCase().includes(search.toLowerCase()) ||
      l.provider.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-400" />
            <span>System Audit Logs & Execution Traffic</span>
          </h1>
          <p className="text-xs text-slate-400">Live inspection of all API request streams, latencies, and execution status codes</p>
        </div>

        <button
          onClick={loadLogs}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-xl glass-panel hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 flex items-center gap-1.5 transition-all"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          <span>Refresh Traffic Stream</span>
        </button>
      </div>

      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 className="text-sm font-bold text-slate-100">Live API Execution Log Stream</h2>
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search request ID or spec..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center space-y-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-400" />
              <p className="text-xs font-semibold">Streaming Live Audit Logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center space-y-2 text-slate-400">
              <FileText className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-xs">No execution traffic logs found matching criteria.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 border-b border-slate-800 bg-slate-900/40">
                <tr>
                  <th className="py-2.5 px-3">Request ID</th>
                  <th className="py-2.5 px-3">Spec Name</th>
                  <th className="py-2.5 px-3">AI Provider & Model</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Latency</th>
                  <th className="py-2.5 px-3">Cost (USD)</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                {filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="py-3 px-3 font-mono text-[11px] text-amber-300">{l.requestId}</td>
                    <td className="py-3 px-3 font-semibold text-slate-200">{l.specName}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-purple-300">
                      {l.provider.toUpperCase()} ({l.model})
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{l.httpStatus} {l.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-300">{l.processingTimeMs} ms</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-amber-400">${l.costUsd.toFixed(4)}</td>
                    <td className="py-3 px-3 text-slate-400">{new Date(l.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
