"use client";

import { BarChart3, Clock, DollarSign, ShieldAlert, Zap } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Analytics & Request Logs</h1>
        <p className="text-xs text-slate-400">Detailed metric telemetry from Redis Outbox & PostgreSQL audit store</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <span className="text-xs text-slate-400 font-medium">Total Requests (24h)</span>
          <p className="text-2xl font-bold text-slate-100">1,482</p>
          <span className="text-[11px] text-emerald-400 font-medium">99.8% Success Rate</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <span className="text-xs text-slate-400 font-medium">Avg Latency</span>
          <p className="text-2xl font-bold text-slate-100">790 ms</p>
          <span className="text-[11px] text-indigo-400 font-medium">RAM Stream Decoding</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <span className="text-xs text-slate-400 font-medium">Token Usage (24h)</span>
          <p className="text-2xl font-bold text-slate-100">842,100</p>
          <span className="text-[11px] text-slate-400">Prompt + Completion</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <span className="text-xs text-slate-400 font-medium">Estimated AI Cost</span>
          <p className="text-2xl font-bold text-slate-100">$0.18</p>
          <span className="text-[11px] text-emerald-400 font-medium">Gemini 1.5 Flash Rate</span>
        </div>
      </div>

      {/* Detailed Request Logs Table */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-slate-100">Audit Metadata Stream Logs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 border-b border-slate-800 bg-slate-900/40">
              <tr>
                <th className="py-2.5 px-3">Request ID</th>
                <th className="py-2.5 px-3">Call Spec</th>
                <th className="py-2.5 px-3">AI Provider</th>
                <th className="py-2.5 px-3">Latency</th>
                <th className="py-2.5 px-3">Tokens</th>
                <th className="py-2.5 px-3">Cost</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300 font-mono">
              <tr>
                <td className="py-3 px-3 text-indigo-300">req_01HZX01AAA99</td>
                <td className="py-3 px-3 font-sans font-medium text-slate-200">Indonesian KTP Parser</td>
                <td className="py-3 px-3 font-sans">Gemini 1.5 Flash</td>
                <td className="py-3 px-3">720 ms</td>
                <td className="py-3 px-3">540</td>
                <td className="py-3 px-3">$0.0001</td>
                <td className="py-3 px-3 font-sans">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                    200 OK
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 text-indigo-300">req_01HZX01BBB88</td>
                <td className="py-3 px-3 font-sans font-medium text-slate-200">Invoice Data Extractor</td>
                <td className="py-3 px-3 font-sans">OpenAI GPT-4o</td>
                <td className="py-3 px-3">1,050 ms</td>
                <td className="py-3 px-3">1,200</td>
                <td className="py-3 px-3">$0.0030</td>
                <td className="py-3 px-3 font-sans">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                    200 OK
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 text-indigo-300">req_01HZX01CCC77</td>
                <td className="py-3 px-3 font-sans font-medium text-slate-200">Retail Receipt Parser</td>
                <td className="py-3 px-3 font-sans">Gemini 1.5 Flash</td>
                <td className="py-3 px-3">640 ms</td>
                <td className="py-3 px-3">480</td>
                <td className="py-3 px-3">$0.0001</td>
                <td className="py-3 px-3 font-sans">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                    200 OK
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
