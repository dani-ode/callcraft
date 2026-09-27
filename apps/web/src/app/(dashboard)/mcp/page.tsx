"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useProject } from "@/context/project-context";
import { PYTHON_API_URL } from "@/lib/api/core";

export default function McpServerPage() {
  const { user } = useAuth();
  const { activeProject } = useProject();
  const [publicKey, setPublicKey] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [message, setMessage] = useState("");
  const endpoint = `${PYTHON_API_URL}/mcp/v1`;
  const configuration = JSON.stringify({ mcpServers: { callcraft: {
    serverUrl: endpoint,
    headers: { "X-USER-ID": user?.id || "<USER_ID>",
      "X-CALL-PUBLIC-KEY": "<PROJECT_PUBLIC_KEY>",
      Authorization: "Bearer <PROJECT_SECRET_KEY>",
      "X-PROJECT-ID": activeProject?.id || "<PROJECT_ID>" },
  } } }, null, 2);

  async function probe() {
    setBusy(true); setResult(""); setMessage("");
    try {
      if (!PYTHON_API_URL || !user?.id || !activeProject?.id) throw new Error("API URL, user, dan project harus tersedia.");
      if (!publicKey || !secret) throw new Error("Masukkan credential project untuk memeriksa koneksi.");
      const response = await fetch(endpoint, {
        method: "POST", redirect: "error",
        headers: { "Content-Type": "application/json", Accept: "application/json",
          "X-USER-ID": user.id, "X-PROJECT-ID": activeProject.id,
          "X-CALL-PUBLIC-KEY": publicKey, Authorization: `Bearer ${secret}` },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call",
          params: { name: "callcraft_get_capabilities", arguments: {} } }),
      });
      const payload = await response.json();
      setResult(JSON.stringify(payload, null, 2));
      setMessage(response.ok && !payload.error && !payload.result?.isError
        ? "Koneksi dan autentikasi berhasil. Tidak ada inference atau aksi backend yang dijalankan."
        : "Pemeriksaan gagal. Periksa credential, project, dan versi server pada respons.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tidak dapat menghubungi MCP server.");
    } finally { setBusy(false); }
  }

  return <main className="max-w-5xl mx-auto space-y-6">
    <header><h1 className="text-3xl font-bold">MCP & integrasi IDE</h1>
      <p className="mt-2">Kelola Call Specs dari AI coding assistant dan gunakan CallCraft untuk project {activeProject?.name || "yang dipilih"}.</p></header>
    {!PYTHON_API_URL && <p role="alert" className="text-red-500">NEXT_PUBLIC_API_URL belum dikonfigurasi. Rebuild frontend setelah mengisi konfigurasi.</p>}
    <section className="glass-panel rounded-2xl p-6 space-y-3">
      <h2 className="text-xl font-bold">1. Hubungkan IDE</h2>
      <p>Gunakan Streamable HTTP di <code>{endpoint}</code>. Untuk client yang memakai format CallCraft/Antigravity, properti endpoint adalah <code>serverUrl</code>. Beberapa client MCP resmi memakai <code>url</code>; gunakan format yang didokumentasikan client tersebut. Pilih API key milik project aktif dari <Link className="underline" href="/keys">halaman API Keys</Link>. Secret disimpan melalui secret store/environment IDE, bukan prompt atau repository.</p>
      <pre className="overflow-auto text-xs p-4 border rounded-xl">{configuration}</pre>
      <button type="button" className="border rounded px-3 py-2" onClick={async () => {
        try { await navigator.clipboard.writeText(configuration); setMessage("Template disalin; ganti placeholder melalui konfigurasi rahasia IDE."); }
        catch { setMessage("Clipboard tidak tersedia; salin template secara manual."); }
      }}>Salin template konfigurasi</button>
      <p className="text-sm">Jika validator menampilkan <code>Property url is not allowed</code>, ganti <code>url</code> menjadi <code>serverUrl</code>. Legacy SSE tersedia di <code>/mcp/v1/sse</code>; header autentikasi juga wajib pada POST pesan.</p>
    </section>
    <section className="glass-panel rounded-2xl p-6 space-y-3">
      <h2 className="text-xl font-bold">2. Periksa koneksi</h2>
      <p className="text-sm">Credential hanya disimpan di memori halaman. Pemeriksaan membaca capabilities server dan tidak menjalankan tool bisnis.</p>
      <label className="block">Public key<input autoComplete="off" className="block w-full bg-transparent border p-2 rounded" value={publicKey} onChange={e => setPublicKey(e.target.value)} /></label>
      <label className="block">Secret key<input autoComplete="off" type="password" className="block w-full bg-transparent border p-2 rounded" value={secret} onChange={e => setSecret(e.target.value)} /></label>
      <button type="button" disabled={busy} onClick={probe} className="bg-amber-400 text-black rounded px-4 py-2 disabled:opacity-50">{busy ? "Memeriksa…" : "Periksa MCP"}</button>
      <p role="status">{message}</p>
      {result && <pre className="overflow-auto text-xs whitespace-pre-wrap">{result}</pre>}
    </section>
    <section className="glass-panel rounded-2xl p-6 space-y-3">
      <h2 className="text-xl font-bold">3. Workflow AI coding</h2>
      <ol className="list-decimal pl-5 space-y-2">
        <li>Panggil <code>callcraft_get_capabilities</code> dan <code>callcraft_get_integration_guide</code>.</li>
        <li>Temukan spec dengan <code>callcraft_list_specs</code>, lalu baca <code>callcraft_get_call_contract</code>.</li>
        <li>Untuk HTTP binding, gunakan <code>callcraft_validate_spec</code> sebelum menyimpan.</li>
        <li>Buat atau perbarui spec melalui MCP, lalu verifikasi hasil dengan get/export.</li>
        <li>Uji di <Link className="underline" href="/playground">Playground</Link>. Eksekusi aplikasi menggunakan <code>POST /v1/call</code>.</li>
      </ol>
      <p>Resource panduan: <code>callcraft://integration</code>. Skill portabel tersedia pada repository: <code>skills/callcraft/SKILL.md</code>.</p>
    </section>
    <section className="glass-panel rounded-2xl p-6 space-y-3">
      <h2 className="text-xl font-bold">Stdio dan mode eksekusi</h2>
      <p>Untuk IDE stdio-only, jalankan <code>python /path/to/callcraft/integrations/mcp_remote.py</code> dengan dependency <code>httpx</code>. Bridge mengakses server online tanpa database lokal.</p>
      <p>Environment wajib: <code>CALLCRAFT_MCP_URL</code>, <code>CALLCRAFT_USER_ID</code>, <code>CALLCRAFT_PUBLIC_KEY</code>, <code>CALLCRAFT_AUTH</code>, <code>CALLCRAFT_MCP_TIMEOUT_SECONDS</code>.</p>
      <p><strong>Extraction</strong> menghasilkan data terstruktur melalui AI. <strong>HTTP</strong> menjalankan backend terdaftar tanpa inference. Keberhasilan ekstraksi tidak membuktikan aksi bisnis tersimpan.</p>
      <p>Jika hasil mutasi belum diketahui, periksa backend memakai idempotency key yang sama. Jangan membuat key baru untuk retry otomatis.</p>
    </section>
  </main>;
}
