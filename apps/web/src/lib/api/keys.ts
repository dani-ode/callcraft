import { ApiCredential } from "../types";
import { PYTHON_API_URL, checkResponseAuth, extractErrorMessage, getActiveUserId, getAuthHeaders } from "./core";

export async function fetchApiKeys(projectId?: string): Promise<ApiCredential[]> {
  const userId = getActiveUserId();
  if (!userId) {
    throw new Error("Pengguna tidak terautentikasi (Sesi tidak ditemukan).");
  }
  const params = new URLSearchParams({ user_id: userId });
  if (projectId) params.set("project_id", projectId);
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/keys?${params}`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  checkResponseAuth(res);
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, `Gagal memuat API Keys (HTTP ${res.status})`));
  }
  return await res.json();
}

export async function createApiKey(
  name: string,
  environment: string,
  ipWhitelist: string[] = [],
  projectId?: string
): Promise<{ credential: ApiCredential; secret_key: string }> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/keys?user_id=${getActiveUserId()}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, environment, ip_whitelist: ipWhitelist, project_id: projectId || null }),
  });
  checkResponseAuth(res);
  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errData, "Gagal membuat API Key baru"));
  }
  const data = await res.json();
  return {
    credential: data.credential,
    secret_key: data.secretKey || data.secret_key,
  };
}

export async function updateApiKeyWhitelist(
  keyId: string,
  ipWhitelist: string[]
): Promise<ApiCredential> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/keys/${keyId}/whitelist?user_id=${getActiveUserId()}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ ip_whitelist: ipWhitelist }),
  });
  checkResponseAuth(res);
  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errData, `Gagal meng-update IP Whitelist untuk key ${keyId}`));
  }
  return await res.json();
}

export async function deleteApiKey(keyId: string): Promise<boolean> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/keys/${keyId}?user_id=${getActiveUserId()}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  checkResponseAuth(res);
  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errData, `Gagal menghapus API Key ${keyId}`));
  }
  return true;
}
