import { ApiCredential, CallSpec, ExecutionLog, Template, UserAiProvider } from "./types";

const PYTHON_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080";

export async function fetchCallSpecs(): Promise<CallSpec[]> {
  try {
    const res = await fetch(`${PYTHON_API_URL}/internal/v1/specs`, { cache: "no-store" });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Using local mock specs fallback:", e);
  }

  return [
    {
      id: "spc_01HZX01SPEC0000000001",
      name: "Indonesian KTP Parser",
      slug: "ktp-parser",
      description: "Extracts NIK, Full Name, DOB, Gender, and Address from KTP image.",
      activeVersionNumber: 1,
      status: "active",
      updatedAt: new Date().toISOString(),
      responseSchema: {
        properties: {
          nik: { type: "string", required: true },
          full_name: { type: "string", required: true },
          gender: { type: "enum", enum_values: ["LAKI-LAKI", "PEREMPUAN"], required: true },
        },
      },
    },
    {
      id: "spc_01HZX01SPEC0000000002",
      name: "Invoice Data Extractor",
      slug: "invoice-extractor",
      description: "Extracts invoice number, vendor name, invoice date, line items, and total amount.",
      activeVersionNumber: 2,
      status: "active",
      updatedAt: new Date().toISOString(),
      responseSchema: {
        properties: {
          invoice_number: { type: "string", required: true },
          vendor_name: { type: "string", required: true },
          total_amount: { type: "number", required: true },
        },
      },
    },
  ];
}

export async function fetchTemplates(): Promise<Template[]> {
  return [
    {
      id: "tmpl_01",
      code: "invoice-parser",
      name: "Invoice Data Extractor",
      description: "Extracts invoice metadata including invoice number, vendor, line items, and total amount.",
      category: "Financial",
      isOfficial: true,
      requestSchema: { properties: { image: { type: "string" } } },
      responseSchema: {
        properties: {
          invoice_number: { type: "string", required: true },
          vendor_name: { type: "string", required: true },
          invoice_date: { type: "date", required: true },
          total_amount: { type: "number", required: true },
        },
      },
    },
    {
      id: "tmpl_02",
      code: "ktp-id-parser",
      name: "Indonesian KTP / National ID Parser",
      description: "Extracts NIK, Full Name, Gender, DOB, and Address details from KTP document.",
      category: "Document Parsing",
      isOfficial: true,
      requestSchema: { properties: { image: { type: "string" } } },
      responseSchema: {
        properties: {
          nik: { type: "string", required: true },
          full_name: { type: "string", required: true },
          gender: { type: "enum", enum_values: ["LAKI-LAKI", "PEREMPUAN"], required: true },
        },
      },
    },
    {
      id: "tmpl_03",
      code: "receipt-parser",
      name: "Retail Receipt Parser",
      description: "Extracts merchant name, transaction date, line items, tax, and total paid.",
      category: "Financial",
      isOfficial: true,
      requestSchema: { properties: { image: { type: "string" } } },
      responseSchema: {
        properties: {
          merchant_name: { type: "string", required: true },
          transaction_date: { type: "date", required: true },
          total_paid: { type: "number", required: true },
        },
      },
    },
  ];
}

export async function executeCallcraftApi(payload: {
  userId: string;
  specId: string;
  provider: string;
  apiKey: string;
  image?: string;
  prompt?: string;
}): Promise<any> {
  const res = await fetch(`${PYTHON_API_URL}/v1/call/${payload.userId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${payload.apiKey}`,
      "X-CALL-SPEC-ID": payload.specId,
      "X-CALL-PROVIDER": payload.provider,
    },
    body: JSON.stringify({
      image: payload.image,
      prompt: payload.prompt,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "API Execution Failed" }));
    throw new Error(errorData.detail || `HTTP Error ${res.status}`);
  }

  return await res.json();
}
