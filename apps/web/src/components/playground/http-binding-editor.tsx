"use client";
import type { ToolCallingConfig } from "@/lib/types";

export function HttpBindingEditor({ value, onChange }: { value: ToolCallingConfig; onChange: (value: ToolCallingConfig) => void }) {
  const binding = value.execution;
  function update(field: string, next: string | number | boolean) {
    if (binding) onChange({ ...value, execution: { ...binding, [field]: next } });
  }
  return <section className="border rounded-xl p-4 space-y-3">
    <h3 className="font-bold">Mode eksekusi</h3>
    <select aria-label="Mode eksekusi" className="bg-transparent border rounded p-2" value={binding ? "http" : "extraction"} onChange={e => {
      if (e.target.value === "extraction") { const { execution, ...rest } = value; onChange(rest); }
      else onChange({ ...value, execution: { schemaVersion: "1", type: "http", url: "", credentialEnv: "", timeoutSeconds: 0, maxResponseBytes: 0, requiresIdempotency: true } });
    }}><option value="extraction">AI structured extraction</option><option value="http">HTTP backend action</option></select>
    {binding && <>
      <p className="text-sm">Backend menerima arguments JSON. Isi timeout dan batas respons sesuai kebijakan project. Origin dan referensi credential harus sudah diizinkan operator server; jangan masukkan secret di sini.</p>
      <label className="block">URL HTTPS<input className="w-full bg-transparent border p-2 rounded" type="url" value={binding.url} onChange={e => update("url", e.target.value)} /></label>
      <label className="block">Nama environment service credential<input className="w-full bg-transparent border p-2 rounded" value={binding.credentialEnv} onChange={e => update("credentialEnv", e.target.value)} /></label>
      <label className="block">Timeout (detik)<input className="w-full bg-transparent border p-2 rounded" type="number" min="0" step="any" value={binding.timeoutSeconds || ""} onChange={e => update("timeoutSeconds", Number(e.target.value))} /></label>
      <label className="block">Batas respons (byte)<input className="w-full bg-transparent border p-2 rounded" type="number" min="1" value={binding.maxResponseBytes || ""} onChange={e => update("maxResponseBytes", Number(e.target.value))} /></label>
      <label className="flex gap-2"><input type="checkbox" checked={binding.requiresIdempotency} onChange={e => update("requiresIdempotency", e.target.checked)} />Wajib idempotency key</label>
      <label className="block">URL rekonsiliasi (opsional, origin sama)<input className="w-full bg-transparent border p-2 rounded" type="url" value={binding.reconciliationUrl || ""} onChange={e => onChange({ ...value, execution: { ...binding, reconciliationUrl: e.target.value || undefined } })} /></label>
      <p className="text-sm">Request schema mendefinisikan arguments; response schema harus cocok dengan JSON backend. Lookup rekonsiliasi menerima executionId dan idempotencyKey; status: succeeded, failed, pending, atau unknown. Validasi server dijalankan saat menyimpan.</p>
    </>}
  </section>;
}
