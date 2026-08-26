import { ExecutionLog } from "../types";
import { PYTHON_API_URL, checkResponseAuth, extractErrorMessage, getActiveUserId, getAuthHeaders, sanitizeHeaderValue } from "./core";

export async function fetchExecutionLogs(projectId?: string): Promise<ExecutionLog[]> {
  const params = new URLSearchParams({ user_id: getActiveUserId() || "" });
  if (projectId) params.set("project_id", projectId);
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/logs?${params}`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  checkResponseAuth(res);
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, `Gagal memuat log eksekusi (HTTP ${res.status})`));
  }
  return await res.json();
}

export async function executeCallcraftApi(payload: {
  userId: string;
  specId: string;
  provider: string;
  apiKey: string;
  publicKey: string;
  image?: string;
  file?: string;
  pdf?: string;
  prompt?: string;
  negativePrompt?: string;
  aiApiKey?: string;
  aiModelName?: string;
  data?: Record<string, any>;
}): Promise<any> {
  const cleanApiKey = sanitizeHeaderValue(payload.apiKey);
  const cleanPublicKey = sanitizeHeaderValue(payload.publicKey);
  const cleanSpecId = sanitizeHeaderValue(payload.specId);
  const cleanProvider = sanitizeHeaderValue(payload.provider);
  const cleanAiApiKey = sanitizeHeaderValue(payload.aiApiKey);
  const cleanAiModelName = sanitizeHeaderValue(payload.aiModelName);

  if (!cleanPublicKey) {
    throw new Error("Public Key wajib dipilih sebelum menjalankan eksekusi. Pilih API Key pada tab Headers.");
  }
  if (!cleanApiKey) {
    throw new Error("Secret Key (Bearer Token) wajib diisi sebelum menjalankan eksekusi. Isi pada tab Auth.");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${cleanApiKey}`,
    "X-USER-ID": payload.userId,
    "X-CALL-SPEC-ID": cleanSpecId,
    "X-CALL-PUBLIC-KEY": cleanPublicKey,
    "X-CALL-PROVIDER": cleanProvider,
    "X-CALL-SHOW-PROMPT": "true",
  };

  if (cleanAiApiKey) {
    headers["X-AI-API-KEY"] = cleanAiApiKey;
  }
  if (cleanAiModelName) {
    headers["X-AI-MODEL-NAME"] = cleanAiModelName;
  }

  const reqBody: Record<string, any> = {
    ...(payload.data || {}),
  };
  if (payload.image) reqBody.image = payload.image;
  if (payload.file) reqBody.file = payload.file;
  if (payload.pdf) reqBody.pdf = payload.pdf;
  if (payload.prompt) reqBody.prompt = payload.prompt;
  if (payload.negativePrompt) reqBody.negativePrompt = payload.negativePrompt;
  if (payload.aiApiKey) reqBody.ai_api_key = payload.aiApiKey;
  if (payload.aiModelName) reqBody.ai_model_name = payload.aiModelName;

  const res = await fetch(`${PYTHON_API_URL}/v1/call`, {
    method: "POST",
    headers,
    body: JSON.stringify(reqBody),
  });

  const responseHeaders: Record<string, string> = {};
  res.headers.forEach((val, key) => {
    responseHeaders[key.toLowerCase()] = val;
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    const msg = extractErrorMessage(errorData, "API Execution Failed", res.status);
    throw new Error(msg);
  }

  const jsonBody = await res.json();

  return {
    ...jsonBody,
    _responseHeaders: responseHeaders,
    _responseStatus: res.status,
    _responseStatusText: res.statusText,
  };
}

export interface PlaygroundStateData {
  id?: string;
  userId?: string;
  callSpecId?: string;
  selectedCredentialId?: string | null;
  publicKey?: string | null;
  credentialDeleted?: boolean;
  checkedStates?: Record<string, boolean>;
  extraInputs?: Record<string, any>;
  prompt?: string | null;
  imageUrl?: string | null;
  aiModelName?: string | null;
  aiApiKey?: string | null;
  updatedAt?: string;
}

export async function fetchPlaygroundState(specId: string): Promise<PlaygroundStateData | null> {
  if (!specId) return null;
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/specs/${specId}/playground-state?user_id=${getActiveUserId()}`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  checkResponseAuth(res);
  if (!res.ok) {
    if (res.status === 404) return null;
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, `Gagal memuat playground state ${specId}`));
  }
  const data = await res.json();
  return data.state;
}

export async function savePlaygroundState(specId: string, stateData: PlaygroundStateData): Promise<{ success: boolean; message: string; state: PlaygroundStateData }> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/specs/${specId}/playground-state?user_id=${getActiveUserId()}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(stateData),
  });

  checkResponseAuth(res);
  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errData, `Gagal menyimpan state playground ${specId}`));
  }

  return await res.json();
}
