import { ApiCredential, CallSpec, ExecutionLog, Template, UserAiProvider } from "./types";

const PYTHON_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080";

export async function fetchCallSpecs(): Promise<CallSpec[]> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/specs`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch call specs: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchTemplates(): Promise<Template[]> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/templates`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch templates: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchApiKeys(): Promise<ApiCredential[]> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/keys`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch API keys: ${res.statusText}`);
  }
  return await res.json();
}

export async function createApiKey(name: string): Promise<{ credential: ApiCredential; secret_key: string }> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create API key: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchExecutionLogs(): Promise<ExecutionLog[]> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/logs`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch logs: ${res.statusText}`);
  }
  return await res.json();
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
