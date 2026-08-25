import { CallSpec, Template, TemplateComment } from "../types";
import { PYTHON_API_URL, checkResponseAuth, extractErrorMessage, getActiveUserId, getAuthHeaders } from "./core";

export async function fetchTemplates(
  category?: string,
  search?: string,
  sort?: string
): Promise<Template[]> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (search) params.set("search", search);
  if (sort) params.set("sort", sort);

  const res = await fetch(`${PYTHON_API_URL}/internal/v1/templates?user_id=${getActiveUserId()}&${params.toString()}`, { headers: getAuthHeaders(), cache: "no-store" });
  checkResponseAuth(res);
  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errData, `Gagal memuat template marketplace (HTTP ${res.status})`));
  }
  return await res.json();
}

export async function publishTemplate(payload: {
  callSpecId: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
}): Promise<Template> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/templates/publish`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      call_spec_id: payload.callSpecId,
      code: payload.code,
      name: payload.name,
      description: payload.description,
      category: payload.category,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errData, "Gagal memublikasikan template"));
  }

  return await res.json();
}

export async function forkTemplate(templateId: string, projectId?: string): Promise<{ message: string; fork_count: number; spec: CallSpec }> {
  const params = new URLSearchParams({ user_id: getActiveUserId() || "" });
  if (projectId) params.set("project_id", projectId);
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/templates/${templateId}/fork?${params}`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errData, `Gagal melakukan fork template ${templateId}`));
  }

  return await res.json();
}

export async function toggleLikeTemplate(templateId: string): Promise<{ is_liked: boolean; likes_count: number }> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/templates/${templateId}/like?user_id=${getActiveUserId()}`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errData, `Gagal memproses like template ${templateId}`));
  }

  return await res.json();
}

export async function fetchTemplateComments(templateId: string): Promise<TemplateComment[]> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/templates/${templateId}/comments`, { headers: getAuthHeaders(), cache: "no-store" });
  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errData, `Gagal memuat komentar template ${templateId}`));
  }
  return await res.json();
}

export async function addTemplateComment(payload: {
  templateId: string;
  rating: number;
  comment: string;
  authorName?: string;
}): Promise<any> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/templates/${payload.templateId}/comments`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      rating: payload.rating,
      comment: payload.comment,
      author_name: payload.authorName,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errData, "Gagal mengirimkan komentar template"));
  }

  return await res.json();
}

export async function fetchTemplateDetail(templateId: string): Promise<Template | null> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/templates/${templateId}?user_id=${getActiveUserId()}`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    const errData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errData, `Gagal memuat detail template ${templateId}`));
  }
  return await res.json();
}

export async function deleteTemplateComment(commentId: string): Promise<{ message: string }> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/templates/comments/${commentId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errData, `Gagal menghapus komentar ${commentId}`));
  }

  return await res.json();
}
