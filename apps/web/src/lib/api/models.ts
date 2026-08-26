import { PYTHON_API_URL, checkResponseAuth, extractErrorMessage, getAuthHeaders } from "./core";

export interface AiModelItem {
  id: string;
  providerId: string;
  providerCode: string;
  providerName: string;
  name: string;
  modelIdentifier: string;
  supportsImage: boolean;
  supportsToolCalling: boolean;
  supportsStructuredOutput: boolean;
  costPer1kPromptTokens: number;
  costPer1kCompletionTokens: number;
  isDefault: boolean;
  isActive: boolean;
}

export interface AiProviderItem {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  modelsCount?: number;
}

export async function fetchAiModels(): Promise<AiModelItem[]> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/models`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  checkResponseAuth(res);
  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errData, `Gagal memuat daftar AI Model (HTTP ${res.status})`));
  }
  return await res.json();
}

export async function fetchAiProviders(): Promise<AiProviderItem[]> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/providers`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  checkResponseAuth(res);
  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errData, `Gagal memuat daftar AI Provider (HTTP ${res.status})`));
  }
  return await res.json();
}
