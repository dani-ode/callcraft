import { PYTHON_API_URL, checkResponseAuth, extractErrorMessage, getActiveUserId, getAuthHeaders } from "./core";

export async function verifyProviderApiKey(payload: {
  provider: string;
  apiKey: string;
}): Promise<{ valid: boolean; status_code: number; message: string }> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/providers/verify-key`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      provider: payload.provider,
      api_key: payload.apiKey,
    }),
  });
  checkResponseAuth(res);

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, `Verifikasi API Key gagal (HTTP ${res.status})`));
  }

  return await res.json();
}

export async function saveProviderApiKey(payload: {
  provider: string;
  apiKey: string;
  projectId?: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/providers/save-key`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      provider: payload.provider,
      api_key: payload.apiKey,
      project_id: payload.projectId || null,
    }),
  });
  checkResponseAuth(res);

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, `Gagal menyimpan API key untuk provider ${payload.provider}`));
  }

  return await res.json();
}

export async function fetchUserAiProviders(projectId?: string): Promise<
  Array<{
    id: string;
    projectId?: string;
    providerCode: string;
    providerName: string;
    key: string;
    isActive: boolean;
    updatedAt: string;
  }>
> {
  const params = new URLSearchParams({ user_id: getActiveUserId() || "" });
  if (projectId) params.set("project_id", projectId);
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/providers/keys?${params}`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  checkResponseAuth(res);
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, `Gagal memuat daftar AI provider user (HTTP ${res.status})`));
  }
  return await res.json();
}

export async function fetchSystemAiProviders(): Promise<Array<{ id: string; code: string; name: string }>> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/providers/list`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  checkResponseAuth(res);
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, `Gagal memuat daftar AI provider sistem (HTTP ${res.status})`));
  }
  return await res.json();
}
