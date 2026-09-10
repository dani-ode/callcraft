"use client";

import { useState } from "react";
import {
  Cpu,
  Server,
  Code,
  Workflow,
  Copy,
  Check,
  Zap,
  Terminal,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { getActiveUserId, PYTHON_API_URL } from "@/lib/api/core";

export default function McpServerPage() {
  const { user } = useAuth();
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [dshTab, setDshTab] = useState<"streamable" | "stdio" | "proxy">("streamable");
  
  const activeUserId = user?.id || getActiveUserId() || "";
  const baseUrl = PYTHON_API_URL || "http://localhost:8081";
  const streamableHttpUrl = `${baseUrl}/mcp/v1`;
  const sseUrl = `${baseUrl}/mcp/v1/sse?user_id=${activeUserId}`;
  const rpcUrl = `${baseUrl}/mcp/v1/rpc`;
  const stdioCmd = `python -m callcraft_api.mcp_stdio --user-id ${activeUserId || "<YOUR_USER_ID>"}`;

  const dshStreamableConfig = `- insert:
    - id: callcraft
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        transport: streamable-http
        serverName: callcraft
        url: '${streamableHttpUrl}'
        headers:
          X-USER-ID: '${activeUserId || "<YOUR_USER_ID>"}'`;

  const dshStdioConfig = `- insert:
    - id: callcraft
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        transport: stdio
        command: python
        args:
          - -m
          - callcraft_api.mcp_stdio
          - --user-id
          - '${activeUserId || "<YOUR_USER_ID>"}'`;

  const dshProxyConfig = `- insert:
    - id: callcraft
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        transport: stdio
        command: npx
        args:
          - -y
          - mcp-proxy
          - --streamEndpoint
          - /mcp/v1
          - ${baseUrl}`;

  const claudeConfigObj = {
    mcpServers: {
      callcraft: {
        command: "python",
        args: [
          "-m",
          "callcraft_api.mcp_stdio",
          "--user-id",
          activeUserId,
        ],
      },
    },
  };

  const cursorSseConfigObj = {
    mcpServers: {
      callcraft: {
        url: sseUrl,
      },
    },
  };

  const antigravitySseConfigObj = {
    mcpServers: {
      callcraft: {
        serverUrl: sseUrl,
      },
    },
  };

  const restWorkflowSnippet = `# 1. Get List of Projects
curl -X GET "${baseUrl}/v1/projects" \\
  -H "X-USER-ID: ${activeUserId}" \\
  -H "X-CALL-PUBLIC-KEY: <YOUR_PUBLIC_KEY>" \\
  -H "Authorization: Bearer <YOUR_SECRET_KEY>"

# 2. Get List of Specs by Project
curl -X GET "${baseUrl}/v1/specs?projectId=prj_01HZX..." \\
  -H "X-USER-ID: ${activeUserId}" \\
  -H "X-CALL-PUBLIC-KEY: <YOUR_PUBLIC_KEY>" \\
  -H "Authorization: Bearer <YOUR_SECRET_KEY>"

# 3. Execute Call Spec (POST /v1/call)
curl -X POST "${baseUrl}/v1/call" \\
  -H "X-USER-ID: ${activeUserId}" \\
  -H "X-CALL-PUBLIC-KEY: <YOUR_PUBLIC_KEY>" \\
  -H "Authorization: Bearer <YOUR_SECRET_KEY>" \\
  -H "X-CALL-SPEC-ID: ktp-reader" \\
  -H "Content-Type: application/json" \\
  -d '{"file": "https://example.com/invoice.pdf"}'`;

  const n8nBodySnippet = JSON.stringify(
    {
      jsonrpc: "2.0",
      id: "1",
      method: "tools/call",
      params: {
        name: "callcraft_update_spec_section",
        arguments: {
          spec_id: "spc_01HZX01SPEC000000000001",
          section: "prompts",
          content: {
            positivePrompt: "Ekstrak rincian transaksi dengan presisi tinggi...",
          },
        },
      },
    },
    null,
    2
  );

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(key);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const mcpToolsList = [
    { name: "callcraft_list_projects", desc: "List all projects in CallCraft workspace" },
    { name: "callcraft_list_specs", desc: "List CallCraft endpoint specs (optional project_id filter)" },
    { name: "callcraft_get_spec", desc: "Get complete spec by ID or slug" },
    { name: "callcraft_get_spec_section", desc: "Get specific section (request-schema, response-schema, prompts, tools-config, config)" },
    { name: "callcraft_create_spec", desc: "Create a new CallCraft spec with schemas and prompts" },
    { name: "callcraft_update_spec", desc: "Update an existing spec or metadata" },
    { name: "callcraft_update_spec_section", desc: "Update only a specific section (e.g. positive prompt, response schema)" },
    { name: "callcraft_delete_spec", desc: "Delete a spec by ID or slug" },
    { name: "callcraft_export_spec_json", desc: "Export spec as a complete, standardized JSON document" },
    { name: "callcraft_import_spec_json", desc: "Import full JSON spec to create or replace spec in DB" },
    { name: "callcraft_list_user_ai_providers", desc: "List user's configured AI Provider API keys, masked keys, and custom base URLs" },
    { name: "callcraft_list_ai_models", desc: "List available AI models in CallCraft with capability flags (multimodal, tool calling)" },
    { name: "callcraft_verify_ai_provider", desc: "Verify connectivity and health of AI providers / custom gateways directly" },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#edd6bb]/25 gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-lg shadow-purple-500/10">
            <Cpu className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Model Context Protocol (MCP) Server</span>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold border border-purple-500/30">
                v1.0 Ready
              </span>
            </h1>
            <p className="text-xs text-[#8a715e] dark:text-[#8b7e6d] font-medium">
              Koneksikan AI Model di Cursor, Antigravity, Claude Desktop, Langflow, & n8n untuk membuat & mengedit spec CallCraft secara otomatis.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://modelcontextprotocol.io"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 rounded-xl glass-panel text-xs font-bold border border-[#edd6bb]/25 hover:bg-[#edd6bb]/15 text-[#5c4b3c] dark:text-[#edd6bb] flex items-center gap-1.5 transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
            <span>MCP Specification</span>
          </a>
        </div>
      </div>

      {/* Connection Endpoint Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streamable HTTP Card */}
        <div className="p-5 rounded-3xl glass-card border border-cyan-500/30 bg-[#fdfbf7] dark:bg-[#101b2b] space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-400 font-extrabold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Streamable HTTP</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 text-[10px] font-bold border border-cyan-500/30">
              DeepSeek & Claude
            </span>
          </div>
          <p className="text-xs text-[#8a715e] dark:text-[#8b7e6d]">
            Endpoint Streamable HTTP resmi untuk DeepSeek Harness (DSH) dan klien MCP modern.
          </p>
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-cyan-300 font-mono text-xs">
            <span className="truncate pr-2">{streamableHttpUrl}</span>
            <button
              type="button"
              onClick={() => handleCopy(streamableHttpUrl, "stream_card")}
              className="p-1.5 hover:text-white transition-all shrink-0 rounded-lg hover:bg-slate-800"
              title="Copy Streamable HTTP URL"
            >
              {copiedSnippet === "stream_card" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* SSE Endpoint Card */}
        <div className="p-5 rounded-3xl glass-card border border-purple-500/30 bg-[#fdfbf7] dark:bg-[#181424] space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-400 font-extrabold text-sm">
              <Server className="w-4 h-4" />
              <span>SSE Transport</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold">
              Antigravity & Cursor
            </span>
          </div>
          <p className="text-xs text-[#8a715e] dark:text-[#8b7e6d]">
            Gunakan URL EventSource SSE ini di Cursor IDE atau MCP Clients berbasis SSE.
          </p>
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-purple-300 font-mono text-xs">
            <span className="truncate pr-2">{sseUrl}</span>
            <button
              type="button"
              onClick={() => handleCopy(sseUrl, "sse_card")}
              className="p-1.5 hover:text-white transition-all shrink-0 rounded-lg hover:bg-slate-800"
              title="Copy SSE URL"
            >
              {copiedSnippet === "sse_card" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* HTTP RPC Endpoint Card */}
        <div className="p-5 rounded-3xl glass-card border border-purple-500/30 bg-[#fdfbf7] dark:bg-[#181424] space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-400 font-extrabold text-sm">
              <Zap className="w-4 h-4" />
              <span>HTTP RPC Endpoint</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 text-[10px] font-bold">
              JSON-RPC 2.0
            </span>
          </div>
          <p className="text-xs text-[#8a715e] dark:text-[#8b7e6d]">
            Endpoint POST JSON-RPC langsung untuk Langflow, n8n, cURL, dan Postman.
          </p>
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-purple-300 font-mono text-xs">
            <span className="truncate pr-2">{rpcUrl}</span>
            <button
              type="button"
              onClick={() => handleCopy(rpcUrl, "rpc_card")}
              className="p-1.5 hover:text-white transition-all shrink-0 rounded-lg hover:bg-slate-800"
              title="Copy RPC URL"
            >
              {copiedSnippet === "rpc_card" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Stdio Command Card */}
        <div className="p-5 rounded-3xl glass-card border border-purple-500/30 bg-[#fdfbf7] dark:bg-[#181424] space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-400 font-extrabold text-sm">
              <Terminal className="w-4 h-4" />
              <span>Stdio CLI Transport</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-bold">
              Local Stdio
            </span>
          </div>
          <p className="text-xs text-[#8a715e] dark:text-[#8b7e6d]">
            Command stdio untuk integrasi langsung di file `claude_desktop_config.json`.
          </p>
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-amber-300 font-mono text-xs">
            <span className="truncate pr-2">{stdioCmd}</span>
            <button
              type="button"
              onClick={() => handleCopy(stdioCmd, "stdio_card")}
              className="p-1.5 hover:text-white transition-all shrink-0 rounded-lg hover:bg-slate-800"
              title="Copy Stdio Command"
            >
              {copiedSnippet === "stdio_card" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Configuration Code Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DeepSeek Harness (DSH) Configuration Card */}
        <div className="col-span-1 lg:col-span-2 p-6 rounded-3xl glass-card border border-cyan-500/30 bg-[#fdfbf7] dark:bg-[#0e1726] space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-cyan-500/20 gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>DeepSeek Harness (DSH) Configuration</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold border border-cyan-500/30">
                  Streamable HTTP / Stdio
                </span>
              </h3>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setDshTab("streamable")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  dshTab === "streamable"
                    ? "bg-cyan-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Streamable HTTP
              </button>
              <button
                type="button"
                onClick={() => setDshTab("stdio")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  dshTab === "stdio"
                    ? "bg-cyan-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Local Stdio
              </button>
              <button
                type="button"
                onClick={() => setDshTab("proxy")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  dshTab === "proxy"
                    ? "bg-cyan-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                mcp-proxy
              </button>
            </div>
          </div>

          <p className="text-xs text-[#8a715e] dark:text-[#8b7e6d] leading-relaxed">
            {dshTab === "streamable" && (
              <>
                Tambahkan konfigurasi YAML ini ke file <code className="text-cyan-400">cordis.patch.yml</code> atau menu MCP Settings di DeepSeek Harness untuk menghubungkan MCP via <strong>Streamable HTTP</strong> ke endpoint <code className="text-cyan-400">{streamableHttpUrl}</code>.
              </>
            )}
            {dshTab === "stdio" && (
              <>
                Gunakan transport <strong>stdio</strong> langsung tanpa overhead jaringan jika DeepSeek Harness berjalan di mesin yang sama dengan CallCraft.
              </>
            )}
            {dshTab === "proxy" && (
              <>
                Gunakan adapter <strong>mcp-proxy</strong> jika DeepSeek Harness memerlukan bridge stdio menuju endpoint streamable HTTP remote CallCraft.
              </>
            )}
          </p>

          <div className="relative">
            <button
              type="button"
              onClick={() =>
                handleCopy(
                  dshTab === "streamable"
                    ? dshStreamableConfig
                    : dshTab === "stdio"
                    ? dshStdioConfig
                    : dshProxyConfig,
                  "dsh_yaml"
                )
              }
              className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 text-xs font-bold flex items-center gap-1.5 border border-cyan-500/30 transition-all z-10"
            >
              {copiedSnippet === "dsh_yaml" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSnippet === "dsh_yaml" ? "Copied!" : "Copy YAML"}</span>
            </button>

            <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-cyan-200 font-mono text-xs overflow-x-auto">
              {dshTab === "streamable"
                ? dshStreamableConfig
                : dshTab === "stdio"
                ? dshStdioConfig
                : dshProxyConfig}
            </pre>
          </div>
        </div>
        {/* Claude Desktop & Antigravity Config */}
        <div className="p-6 rounded-3xl glass-card border border-[#edd6bb]/30 bg-[#fdfbf7] dark:bg-[#1a1612] space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-[#edd6bb]/15">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Code className="w-4 h-4 text-purple-400" />
              <span>Claude Desktop / Antigravity / Cursor Stdio Config</span>
            </h3>
            <button
              type="button"
              onClick={() => handleCopy(JSON.stringify(claudeConfigObj, null, 2), "claude_json")}
              className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 text-xs font-bold flex items-center gap-1.5 border border-purple-500/30 transition-all"
            >
              {copiedSnippet === "claude_json" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSnippet === "claude_json" ? "Copied!" : "Copy JSON"}</span>
            </button>
          </div>
          <p className="text-xs text-[#8a715e] dark:text-[#8b7e6d] leading-relaxed">
            Tambahkan konfigurasi ini ke file <code className="text-purple-400">claude_desktop_config.json</code> atau seting MCP pada Cursor/Antigravity Anda.
          </p>
          <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs overflow-x-auto">
{JSON.stringify(claudeConfigObj, null, 2)}
          </pre>
        </div>

        {/* Antigravity & Cursor SSE Config */}
        <div className="p-6 rounded-3xl glass-card border border-[#edd6bb]/30 bg-[#fdfbf7] dark:bg-[#1a1612] space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-[#edd6bb]/15">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Server className="w-4 h-4 text-amber-400" />
              <span>Antigravity & Cursor SSE Config</span>
            </h3>
            <button
              type="button"
              onClick={() => handleCopy(JSON.stringify(antigravitySseConfigObj, null, 2), "antigravity_json")}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-xs font-bold flex items-center gap-1.5 border border-amber-500/30 transition-all"
            >
              {copiedSnippet === "antigravity_json" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSnippet === "antigravity_json" ? "Copied!" : "Copy Antigravity JSON"}</span>
            </button>
          </div>
          <p className="text-xs text-[#8a715e] dark:text-[#8b7e6d] leading-relaxed">
            Untuk <strong>Antigravity IDE</strong> (<code className="text-amber-400">.agents/mcp_config.json</code>), gunakan properti <code className="text-purple-400">serverUrl</code>:
          </p>
          <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs overflow-x-auto">
{JSON.stringify(antigravitySseConfigObj, null, 2)}
          </pre>
        </div>
      </div>

      {/* Workflow Integration & Tool Reference */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Langflow & n8n Guide */}
        <div className="p-6 rounded-3xl glass-card border border-[#edd6bb]/30 bg-[#fdfbf7] dark:bg-[#1a1612] space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-[#edd6bb]/15">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Workflow className="w-4 h-4 text-emerald-400" />
              <span>Integrasi Workflow Langflow & n8n</span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy(restWorkflowSnippet, "rest_curl")}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-bold flex items-center gap-1.5 border border-emerald-500/30 transition-all"
              >
                {copiedSnippet === "rest_curl" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSnippet === "rest_curl" ? "Copied!" : "Copy REST Flow"}</span>
              </button>
              <button
                type="button"
                onClick={() => handleCopy(n8nBodySnippet, "n8n_json")}
                className="px-2.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 text-xs font-bold flex items-center gap-1.5 border border-purple-500/30 transition-all"
              >
                {copiedSnippet === "n8n_json" ? <Check className="w-3.5 h-3.5 text-purple-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSnippet === "n8n_json" ? "Copied!" : "MCP JSON-RPC"}</span>
              </button>
            </div>
          </div>
          <div className="space-y-2 text-xs text-[#8a715e] dark:text-[#8b7e6d] leading-relaxed">
            <p>
              Di n8n atau Langflow, masukkan kredensial API Anda (User ID, Public Key, Secret Key):
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-300 font-medium text-[11px]">
              <li><strong>Step 1:</strong> Panggil <code>GET /v1/projects</code> untuk list project.</li>
              <li><strong>Step 2:</strong> Panggil <code>GET /v1/specs?projectId=...</code> untuk list spec.</li>
              <li><strong>Step 3:</strong> Panggil <code>POST /v1/call</code> untuk eksekusi spec.</li>
            </ul>
            <p className="text-[11px] text-amber-500 dark:text-amber-400 font-medium">
              💡 Paket integrasi resmi tersedia di <code>integrations/n8n/</code> (Community Node & Sample Workflow) dan <code>integrations/langflow/</code> (Custom Component).
            </p>
          </div>
          <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-emerald-300 font-mono text-[11px] overflow-x-auto max-h-[160px]">
{restWorkflowSnippet}
          </pre>
        </div>

        {/* MCP Tools Catalogue */}
        <div className="p-6 rounded-3xl glass-card border border-[#edd6bb]/30 bg-[#fdfbf7] dark:bg-[#1a1612] space-y-4 shadow-xl">
          <div className="pb-2 border-b border-[#edd6bb]/15 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Katalog 10 CallCraft MCP Tools</span>
            </h3>
            <span className="text-xs text-purple-400 font-bold">10 Tools Available</span>
          </div>

          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {mcpToolsList.map((tool) => (
              <div
                key={tool.name}
                className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-purple-500/40 transition-all space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-purple-300">{tool.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">MCP Tool</span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">{tool.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
