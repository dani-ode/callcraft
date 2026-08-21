import { ApiCredential, AppInitSettings, CallSpec, ExecutionLog, Template, TemplateComment, UserAiProvider } from "./types";

const PYTHON_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080";

export function getActiveUserId(): string {
  if (typeof window !== "undefined") {
    try {
      const savedUser = localStorage.getItem("callcraft_user_session");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed?.id) return parsed.id;
      }
    } catch (e) {}
  }
  return "usr_dev_active";
}

export async function fetchAppInitSettings(): Promise<AppInitSettings> {
  try {
    const res = await fetch(`${PYTHON_API_URL}/internal/v1/app-init`, { cache: "no-store" });
    if (!res.ok) {
      return {
        id: "app_01HZX01INIT00000000001",
        appName: "Callcraft",
        appIcon: "Feather",
        tagline: "Multimodal AI Execution Gateway",
        faviconUrl: "/favicon.ico",
        disableLandingPage: false,
      };
    }
    const data = await res.json();
    return {
      id: data.id || "app_01HZX01INIT00000000001",
      appName: data.app_name || "Callcraft",
      appIcon: data.app_icon || "Feather",
      tagline: data.tagline || "Multimodal AI Execution Gateway",
      description: data.description,
      faviconUrl: data.favicon_url || "/favicon.ico",
      disableLandingPage: Boolean(data.disable_landing_page),
    };
  } catch (err) {
    return {
      id: "app_01HZX01INIT00000000001",
      appName: "Callcraft",
      appIcon: "Feather",
      tagline: "Multimodal AI Execution Gateway",
      faviconUrl: "/favicon.ico",
      disableLandingPage: false,
    };
  }
}

export async function updateAppInitSettings(payload: Partial<{
  appName: string;
  appIcon: string;
  tagline: string;
  description: string;
  faviconUrl: string;
  disableLandingPage: boolean;
}>): Promise<AppInitSettings> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/app-init`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_name: payload.appName,
      app_icon: payload.appIcon,
      tagline: payload.tagline,
      description: payload.description,
      favicon_url: payload.faviconUrl,
      disable_landing_page: payload.disableLandingPage,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to update app settings: ${res.statusText}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    appName: data.app_name,
    appIcon: data.app_icon,
    tagline: data.tagline,
    description: data.description,
    disableLandingPage: Boolean(data.disable_landing_page),
  };
}

export async function fetchCallSpecs(): Promise<CallSpec[]> {
  try {
    const res = await fetch(`${PYTHON_API_URL}/internal/v1/specs`, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`[Callcraft API] Specs endpoint HTTP ${res.status}`);
      return [];
    }
    return await res.json();
  } catch (err) {
    console.warn(`[Callcraft API] Unable to connect to ${PYTHON_API_URL}/internal/v1/specs:`, err);
    return [];
  }
}

export async function fetchTemplates(
  category?: string,
  search?: string,
  sort?: string
): Promise<Template[]> {
  try {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (search) params.set("search", search);
    if (sort) params.set("sort", sort);

    const res = await fetch(`${PYTHON_API_URL}/internal/v1/templates?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) {
      return [];
    }
    return await res.json();
  } catch (err) {
    console.warn(`[Callcraft API] Unable to connect to ${PYTHON_API_URL}/internal/v1/templates:`, err);
    return [];
  }
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      call_spec_id: payload.callSpecId,
      code: payload.code,
      name: payload.name,
      description: payload.description,
      category: payload.category || "custom",
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: "Failed to publish template" }));
    throw new Error(errData.detail || `HTTP Error ${res.status}`);
  }

  return await res.json();
}

export async function forkTemplate(templateId: string): Promise<{ message: string; fork_count: number; spec: CallSpec }> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/templates/${templateId}/fork`, {
    method: "POST",
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: "Failed to fork template" }));
    throw new Error(errData.detail || `HTTP Error ${res.status}`);
  }

  return await res.json();
}

export async function toggleLikeTemplate(templateId: string): Promise<{ is_liked: boolean; likes_count: number }> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/templates/${templateId}/like`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error(`Failed to toggle like: ${res.statusText}`);
  }

  return await res.json();
}

export async function fetchTemplateComments(templateId: string): Promise<TemplateComment[]> {
  try {
    const res = await fetch(`${PYTHON_API_URL}/internal/v1/templates/${templateId}/comments`, { cache: "no-store" });
    if (!res.ok) {
      return [];
    }
    return await res.json();
  } catch (err) {
    return [];
  }
}

export async function addTemplateComment(payload: {
  templateId: string;
  rating: number;
  comment: string;
  authorName?: string;
}): Promise<any> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/templates/${payload.templateId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rating: payload.rating,
      comment: payload.comment,
      author_name: payload.authorName,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: "Failed to add comment" }));
    throw new Error(errData.detail || `HTTP Error ${res.status}`);
  }

  return await res.json();
}

export async function fetchSpecPublicationSettings(specId: string): Promise<{
  spec: CallSpec;
  template: Template | null;
  comments: TemplateComment[];
}> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/specs/${specId}/publication`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch publication settings: ${res.statusText}`);
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      is_published: payload.isPublished,
      name: payload.name,
      category: payload.category,
      description: payload.description,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: "Failed to update publication settings" }));
    throw new Error(errData.detail || `HTTP Error ${res.status}`);
  }

  return await res.json();
}

export async function deleteTemplateComment(commentId: string): Promise<{ message: string }> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/templates/comments/${commentId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error(`Failed to delete comment: ${res.statusText}`);
  }

  return await res.json();
}

export async function fetchApiKeys(): Promise<ApiCredential[]> {
  try {
    const res = await fetch(`${PYTHON_API_URL}/internal/v1/keys`, { cache: "no-store" });
    if (!res.ok) {
      return [];
    }
    return await res.json();
  } catch (err) {
    console.warn(`[Callcraft API] Unable to connect to ${PYTHON_API_URL}/internal/v1/keys:`, err);
    return [];
  }
}

export async function createApiKey(
  name: string,
  environment: string = "production",
  ipWhitelist: string[] = []
): Promise<{ credential: ApiCredential; secret_key: string }> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, environment, ip_whitelist: ipWhitelist }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: "Failed to create API Key" }));
    throw new Error(errData.detail || `HTTP Error ${res.status}`);
  }
  return await res.json();
}

export async function updateApiKeyWhitelist(
  keyId: string,
  ipWhitelist: string[]
): Promise<ApiCredential> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/keys/${keyId}/whitelist`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ip_whitelist: ipWhitelist }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: "Failed to update IP Whitelist" }));
    throw new Error(errData.detail || `HTTP Error ${res.status}`);
  }
  return await res.json();
}

export async function fetchExecutionLogs(): Promise<ExecutionLog[]> {
  try {
    const res = await fetch(`${PYTHON_API_URL}/internal/v1/logs`, { cache: "no-store" });
    if (!res.ok) {
      return [];
    }
    return await res.json();
  } catch (err) {
    console.warn(`[Callcraft API] Unable to connect to ${PYTHON_API_URL}/internal/v1/logs:`, err);
    return [];
  }
}

export async function executeCallcraftApi(payload: {
  userId: string;
  specId: string;
  provider: string;
  apiKey: string;
  image?: string;
  file?: string;
  pdf?: string;
  prompt?: string;
  aiApiKey?: string;
  aiModelName?: string;
}): Promise<any> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${payload.apiKey}`,
    "X-CALL-SPEC-ID": payload.specId,
    "X-CALL-PROVIDER": payload.provider,
  };

  if (payload.aiApiKey) {
    headers["X-AI-API-KEY"] = payload.aiApiKey;
  }
  if (payload.aiModelName) {
    headers["X-AI-MODEL-NAME"] = payload.aiModelName;
  }

  const res = await fetch(`${PYTHON_API_URL}/v1/call/${payload.userId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      image: payload.image,
      file: payload.file,
      pdf: payload.pdf,
      prompt: payload.prompt,
      ai_api_key: payload.aiApiKey,
      ai_model_name: payload.aiModelName,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "API Execution Failed" }));
    throw new Error(errorData.detail || `HTTP Error ${res.status}`);
  }

  return await res.json();
}

export async function verifyProviderApiKey(payload: {
  provider: string;
  apiKey: string;
}): Promise<{ valid: boolean; status_code: number; message: string }> {
  try {
    const res = await fetch(`${PYTHON_API_URL}/internal/v1/providers/verify-key`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: payload.provider,
        api_key: payload.apiKey,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: "Verification Failed" }));
      return {
        valid: false,
        status_code: res.status,
        message: errorData.detail || `HTTP Error ${res.status}: Failed to reach provider test endpoint`,
      };
    }

    return await res.json();
  } catch (err: any) {
    return {
      valid: false,
      status_code: 500,
      message: err.message || "Failed to reach backend API endpoint",
    };
  }
}

export async function saveProviderApiKey(payload: {
  provider: string;
  apiKey: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/providers/save-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: payload.provider,
      api_key: payload.apiKey,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Save Failed" }));
    throw new Error(errorData.detail || `HTTP Error ${res.status}: Failed to save provider key`);
  }

  return await res.json();
}

export async function fetchUserAiProviders(): Promise<
  Array<{
    id: string;
    providerCode: string;
    providerName: string;
    key: string;
    isActive: boolean;
    updatedAt: string;
  }>
> {
  try {
    const res = await fetch(`${PYTHON_API_URL}/internal/v1/providers/keys`, { cache: "no-store" });
    if (!res.ok) {
      return [];
    }
    return await res.json();
  } catch (err) {
    console.warn(`[Callcraft API] Unable to connect to ${PYTHON_API_URL}/internal/v1/providers/keys:`, err);
    return [];
  }
}
