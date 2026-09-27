"use client";

import { useState } from "react";
import { PYTHON_API_URL } from "@/lib/api/core";

export function HttpToolPanel({ specId, userId }: { specId: string; userId: string }) {
  const [publicKey, setPublicKey] = useState("");
  const [secret, setSecret] = useState("");
  const [token, setToken] = useState("");
  const [key, setKey] = useState("");
  const [argumentsText, setArgumentsText] = useState("{}");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [executionId, setExecutionId] = useState("");

  async function execute(reconcile = false) {
    setBusy(true);
    setOutput("");
    setStatus("");
    try {
      if (!PYTHON_API_URL) throw new Error("NEXT_PUBLIC_API_URL belum dikonfigurasi.");
      if (!publicKey || !secret || !key) throw new Error("Public key, secret, dan idempotency key wajib diisi.");
      if (reconcile && !executionId) throw new Error("Execution ID wajib diisi untuk lookup.");
      const args: unknown = reconcile ? {} : JSON.parse(argumentsText);
      if (!args || Array.isArray(args) || typeof args !== "object") throw new Error("Arguments harus berupa JSON object.");
      const response = await fetch(`${PYTHON_API_URL}/v1/call`, {
        method: "POST", redirect: "error",
        headers: { "Content-Type": "application/json", "X-USER-ID": userId,
          "X-CALL-PUBLIC-KEY": publicKey, Authorization: `Bearer ${secret}`,
          "X-CALL-SPEC-ID": specId, "Idempotency-Key": key,
          ...(token ? { "X-Execution-Token": token } : {}) },
        body: JSON.stringify({ arguments: args, ...(reconcile ? { reconcileExecutionId: executionId } : {}) }),
      });
      const result = await response.json();
      setOutput(JSON.stringify(result, null, 2));
      if (typeof result.executionId === "string") setExecutionId(result.executionId);
      setStatus(response.ok && result.status === "succeeded" ? "Backend mengembalikan hasil sukses" : "Eksekusi gagal atau hasil belum dapat dipastikan — periksa respons");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Eksekusi gagal; hasil mungkin belum diketahui.");
    } finally { setBusy(false); }
  }

  return <section className="glass-panel p-5 rounded-2xl space-y-4">
    <h2 className="font-bold">HTTP backend Playground</h2>
    <p className="text-sm">Menjalankan aksi nyata pada backend tanpa inference AI. Gunakan key yang sama untuk rekonsiliasi/replay operasi yang sama. Credential dan hasil hanya berada dalam memori halaman ini.</p>
    <label className="block">Public key<input className="w-full p-2 bg-transparent border rounded" value={publicKey} onChange={e => setPublicKey(e.target.value)} autoComplete="off" /></label>
    <label className="block">Secret key<input className="w-full p-2 bg-transparent border rounded" type="password" value={secret} onChange={e => setSecret(e.target.value)} autoComplete="off" /></label>
    <label className="block">Execution token (opsional)<input className="w-full p-2 bg-transparent border rounded" type="password" value={token} onChange={e => setToken(e.target.value)} autoComplete="off" /></label>
    <label className="block">Idempotency key<input className="w-full p-2 bg-transparent border rounded" value={key} onChange={e => setKey(e.target.value)} /></label>
    <button type="button" onClick={() => setKey(crypto.randomUUID())}>Buat key untuk operasi baru</button>
    <label className="block">Arguments JSON<textarea className="w-full p-2 bg-transparent border rounded font-mono" rows={8} value={argumentsText} onChange={e => setArgumentsText(e.target.value)} /></label>
    <button type="button" disabled={busy} onClick={() => execute()} className="p-3 bg-amber-400 text-black rounded disabled:opacity-50">{busy ? "Menjalankan…" : "Jalankan backend tool"}</button>
    <label className="block">Execution ID<input className="w-full p-2 bg-transparent border rounded" value={executionId} onChange={e => setExecutionId(e.target.value)} /></label>
    <button type="button" disabled={busy || !executionId} onClick={() => execute(true)} className="p-3 border rounded disabled:opacity-50">Periksa hasil ke backend (tanpa mengulang aksi)</button>
    <p role="status">{status}</p>
    {output && <pre className="overflow-auto text-xs whitespace-pre-wrap">{output}</pre>}
  </section>;
}
