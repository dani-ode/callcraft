import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Code2,
  Cpu,
  Key,
  Layers,
  Play,
  Zap,
} from "lucide-react";

export default function OverviewPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Welcome Banner */}
      <div className="relative rounded-3xl p-8 overflow-hidden glass-panel border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-950">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Python Data Plane & Bun Runtime Online</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Welcome to <span className="gradient-text">Callcraft</span>
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Dynamic Multimodal Execution Engine for converting image streams into strictly coerced, validated JSON payloads using Google Gemini and OpenAI.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href="/specs"
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
            >
              <Code2 className="w-4 h-4" />
              <span>Create Call Spec</span>
            </Link>
            <Link
              href="/playground"
              className="px-4 py-2.5 rounded-xl glass-panel hover:bg-slate-800/80 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <Play className="w-4 h-4 text-indigo-400" />
              <span>Open Playground</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total API Executions</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-100">12,840</p>
          <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+14.2% from last week</span>
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Avg Processing Latency</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-100">840 ms</p>
          <p className="text-[11px] text-slate-400">RAM Stream Processing</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Active Call Specs</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-100">6 Specs</p>
          <p className="text-[11px] text-indigo-400 font-medium">100% Validated Coercion</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Security Storage Residual</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-400">0 Bytes</p>
          <p className="text-[11px] text-slate-400">Zero Disk Document Retention</p>
        </div>
      </div>

      {/* Recent Executions & Active Specs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Executions Table */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Recent API Executions</h2>
              <p className="text-xs text-slate-400">Live stream logs from FastAPI & Redis outbox</p>
            </div>
            <Link href="/analytics" className="text-xs text-indigo-400 hover:underline font-medium">
              View all
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 border-b border-slate-800 bg-slate-900/40">
                <tr>
                  <th className="py-2.5 px-3">Request ID</th>
                  <th className="py-2.5 px-3">Spec</th>
                  <th className="py-2.5 px-3">Provider</th>
                  <th className="py-2.5 px-3">Latency</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                <tr>
                  <td className="py-3 px-3 font-mono text-[11px] text-indigo-300">req_01HZX99...</td>
                  <td className="py-3 px-3 font-medium">KTP Parser</td>
                  <td className="py-3 px-3">Gemini 1.5 Flash</td>
                  <td className="py-3 px-3 font-mono">750 ms</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      200 SUCCESS
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-mono text-[11px] text-indigo-300">req_01HZX88...</td>
                  <td className="py-3 px-3 font-medium">Invoice Extractor</td>
                  <td className="py-3 px-3">GPT-4o</td>
                  <td className="py-3 px-3 font-mono">1,120 ms</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      200 SUCCESS
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-mono text-[11px] text-indigo-300">req_01HZX77...</td>
                  <td className="py-3 px-3 font-medium">Receipt Parser</td>
                  <td className="py-3 px-3">Gemini 1.5 Flash</td>
                  <td className="py-3 px-3 font-mono">680 ms</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      200 SUCCESS
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Providers Status */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 space-y-4">
          <h2 className="text-lg font-bold text-slate-100">AI Provider Registry</h2>
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl glass-panel border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">
                  G
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">Google Gemini</p>
                  <p className="text-[10px] text-slate-400">Structured Tool Calling</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold">Active</span>
            </div>

            <div className="p-3.5 rounded-xl glass-panel border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                  O
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">OpenAI GPT-4o</p>
                  <p className="text-[10px] text-slate-400">Function Calling Specs</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold">Active</span>
            </div>

            <div className="p-3.5 rounded-xl glass-panel border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs">
                  A
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">Anthropic Claude</p>
                  <p className="text-[10px] text-slate-400">Multi-provider JSON</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
