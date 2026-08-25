import { CallSpec, Template, TemplateComment } from "../types";
import { PYTHON_API_URL, checkResponseAuth, extractErrorMessage, getActiveUserId, getAuthHeaders } from "./core";

export async function fetchCallSpecs(projectId?: string): Promise<CallSpec[]> {
  const params = new URLSearchParams({ user_id: getActiveUserId() || "" });
  if (projectId) params.set("project_id", projectId);
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/specs?${params}`, { headers: getAuthHeaders(), cache: "no-store" });
  checkResponseAuth(res);
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, `Gagal memuat Call Specs (HTTP ${res.status})`));
  }
  return await res.json();
}

export async function fetchCallSpecById(specId: string): Promise<CallSpec | null> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/specs/${specId}?user_id=${getActiveUserId()}`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  checkResponseAuth(res);
  if (!res.ok) {
    if (res.status === 404) return null;
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, `Gagal memuat Call Spec ${specId} (HTTP ${res.status})`));
  }
  return await res.json();
}

export async function updateCallSpec(
  specId: string,
  payload: {
    name?: string;
    slug?: string;
    description?: string;
    requestSchema?: Record<string, any>;
    responseSchema?: Record<string, any>;
    toolsConfig?: Record<string, any>;
    positivePrompt?: string;
    extractionPrompt?: string;
    negativePrompt?: string;
    additionalPrompt?: string;
    allowAdditionalPrompt?: boolean;
    useExternalApiKey?: boolean;
    externalModelName?: string;
  }
): Promise<CallSpec> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/specs/${specId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      name: payload.name,
      slug: payload.slug,
      description: payload.description,
      request_schema: payload.requestSchema,
      response_schema: payload.responseSchema,
      tools_config: payload.toolsConfig,
      positive_prompt: payload.positivePrompt || payload.extractionPrompt,
      negative_prompt: payload.negativePrompt,
      additional_prompt: payload.additionalPrompt,
      allow_additional_prompt: payload.allowAdditionalPrompt,
      use_external_api_key: payload.useExternalApiKey,
      external_model_name: payload.externalModelName,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, `Gagal meng-update Call Spec ${specId}`));
  }

  return await res.json();
}

export async function createCallSpec(payload: {
  name: string;
  slug: string;
  description?: string;
  requestSchema?: any;
  responseSchema?: any;
  toolsConfig?: any;
  positivePrompt?: string;
  extractionPrompt?: string;
  negativePrompt?: string;
  additionalPrompt?: string;
  allowAdditionalPrompt?: boolean;
  useExternalApiKey?: boolean;
  externalModelName?: string;
}): Promise<CallSpec> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/specs`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      name: payload.name,
      slug: payload.slug,
      description: payload.description,
      request_schema: payload.requestSchema,
      response_schema: payload.responseSchema,
      tools_config: payload.toolsConfig,
      positive_prompt: payload.positivePrompt || payload.extractionPrompt,
      negative_prompt: payload.negativePrompt,
      additional_prompt: payload.additionalPrompt,
      allow_additional_prompt: payload.allowAdditionalPrompt,
      use_external_api_key: payload.useExternalApiKey,
      external_model_name: payload.externalModelName,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, "Gagal membuat Call Spec baru"));
  }

  return await res.json();
}

export async function duplicateCallSpec(specId: string, projectId?: string): Promise<CallSpec> {
  const params = new URLSearchParams({ user_id: getActiveUserId() || "" });
  if (projectId) params.set("project_id", projectId);
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/specs/${specId}/duplicate?${params}`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, `Gagal menduplikasi Call Spec ${specId}`));
  }

  return await res.json();
}

export async function deleteCallSpec(specId: string): Promise<{ message: string; id: string }> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/specs/${specId}?user_id=${getActiveUserId()}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  checkResponseAuth(res);

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, `Gagal menghapus Call Spec ${specId}`));
  }

  return await res.json();
}

export async function fetchSpecPublicationSettings(specId: string): Promise<{
  spec: CallSpec;
  template: Template | null;
  comments: TemplateComment[];
}> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/specs/${specId}/publication?user_id=${getActiveUserId()}`, { headers: getAuthHeaders(), cache: "no-store" });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, `Gagal mengambil konfigurasi publikasi ${specId}`));
  }
  return await res.json();
}

export async function updateSpecPublicationSettings(
  specId: string,
  payload: {
    isPublished: boolean;
    name?: string;
    category?: string;
    description?: string;
  }
): Promise<{ message: string; is_published: boolean; published_template_id?: string }> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/specs/${specId}/publication`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      is_published: payload.isPublished,
      name: payload.name,
      category: payload.category,
      description: payload.description,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errData, "Gagal meng-update publikasi spec"));
  }

  return await res.json();
}
