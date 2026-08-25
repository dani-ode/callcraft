import { Project } from "../types";
import { PYTHON_API_URL, checkResponseAuth, extractErrorMessage, getActiveUserId, getAuthHeaders } from "./core";

export async function fetchProjects(): Promise<Project[]> {
  const userId = getActiveUserId();
  if (!userId) throw new Error("Pengguna tidak terautentikasi.");
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/projects?user_id=${encodeURIComponent(userId)}`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  checkResponseAuth(res);
  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errData, `Gagal memuat projects (HTTP ${res.status})`));
  }
  return await res.json();
}

export async function createProject(data: {
  name: string;
  slug?: string;
  description?: string;
  color?: string;
  icon?: string;
}): Promise<Project> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/projects?user_id=${getActiveUserId()}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  checkResponseAuth(res);
  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errData, "Gagal membuat project baru"));
  }
  return await res.json();
}

export async function updateProject(
  projectId: string,
  data: { name?: string; description?: string; color?: string; icon?: string }
): Promise<Project> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/projects/${projectId}?user_id=${getActiveUserId()}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  checkResponseAuth(res);
  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errData, "Gagal mengupdate project"));
  }
  return await res.json();
}

export async function deleteProject(projectId: string): Promise<void> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/projects/${projectId}?user_id=${getActiveUserId()}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  checkResponseAuth(res);
  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errData, "Gagal menghapus project"));
  }
}

export async function getProject(projectId: string): Promise<Project> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/projects/${projectId}?user_id=${getActiveUserId()}`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  checkResponseAuth(res);
  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errData, "Gagal memuat project"));
  }
  return await res.json();
}
