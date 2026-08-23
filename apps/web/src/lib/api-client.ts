import { 
  ApiCredential,
  AppInitSettings, 
  CallSpec, 
  ExecutionLog, 
  Template, 
  TemplateComment, 
  UserAiProvider,
  UserProfile, 
  UserProfileDetail 
} from "./types";

export const PYTHON_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080";

export function getActiveUserId(): string {
  if (typeof window !== "undefined") {
    const key = localStorage.getItem("callcraft_session_key");
    if (key) return key;

    const legacy = localStorage.getItem("callcraft_user_session");
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy);
        return typeof parsed === "string" ? parsed : parsed?.id || "usr_default_dev_01";
      } catch {
        return legacy;
      }
    }
  }
  return "usr_default_dev_01";
}

export function getActiveUserSession(): { id: string; name: string; email: string } {
  return {
    id: getActiveUserId(),
    name: "",
    email: "",
  };
}

export function getAuthHeaders(): Record<string, string> {
  const userId = getActiveUserId();
  return {
    "Content-Type": "application/json",
    "X-User-Id": userId,
  };
}

export function clearUserSessionOnly(): void {
  if (typeof window === "undefined") return;
  const keysToKeep = ["theme", "callcraft_theme"];
  const keysToRemove = Object.keys(localStorage).filter((k) => !keysToKeep.includes(k));
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}

export function checkResponseAuth(res: Response): void {
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      clearUserSessionOnly();
      window.dispatchEvent(new CustomEvent("callcraft_unauthorized"));
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
    }
  }
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
      id: data.id,
      appName: data.appName,
      appIcon: data.appIcon,
      tagline: data.tagline,
      description: data.description,
      faviconUrl: data.faviconUrl,
      disableLandingPage: Boolean(data.disableLandingPage),
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
  defaultRegistrationStatus: string;
  requireEmailVerification: boolean;
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
      default_registration_status: payload.defaultRegistrationStatus,
      require_email_verification: payload.requireEmailVerification,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to update app settings: ${res.statusText}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    appName: data.appName,
    appIcon: data.appIcon,
    tagline: data.tagline,
    description: data.description,
    disableLandingPage: Boolean(data.disableLandingPage),
  };
}

export async function fetchCallSpecs(): Promise<CallSpec[]> {
  try {
    const res = await fetch(`${PYTHON_API_URL}/internal/v1/specs?user_id=${getActiveUserId()}`, { headers: getAuthHeaders(), cache: "no-store" });
    checkResponseAuth(res);
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

export async function fetchCallSpecById(specId: string): Promise<CallSpec | null> {
  try {
    const res = await fetch(`${PYTHON_API_URL}/internal/v1/specs/${specId}?user_id=${getActiveUserId()}`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    checkResponseAuth(res);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.warn(`[Callcraft API] Unable to fetch spec ${specId}:`, err);
    return null;
  }
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
    systemPrompt?: string;
    extractionPrompt?: string;
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
      system_prompt: payload.systemPrompt,
      extraction_prompt: payload.extractionPrompt,
      use_external_api_key: payload.useExternalApiKey,
      external_model_name: payload.externalModelName,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to save Call Spec" }));
    throw new Error(errorData.detail || `HTTP Error ${res.status}`);
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
  systemPrompt?: string;
  extractionPrompt?: string;
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
      response_schema: payload.responseSchema || { type: "object", properties: {} },
      tools_config: payload.toolsConfig,
      system_prompt: payload.systemPrompt,
      extraction_prompt: payload.extractionPrompt,
      use_external_api_key: payload.useExternalApiKey ?? true,
      external_model_name: payload.externalModelName,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to create Call Spec" }));
    throw new Error(errorData.detail || `HTTP Error ${res.status}`);
  }

  return await res.json();
}

export async function duplicateCallSpec(specId: string): Promise<CallSpec> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/specs/${specId}/duplicate`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Gagal menduplikasi Call Spec" }));
    throw new Error(errorData.detail || `HTTP Error ${res.status}`);
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
    const errorData = await res.json().catch(() => ({ detail: "Gagal menghapus Call Spec" }));
    throw new Error(errorData.detail || `HTTP Error ${res.status}`);
  }

  return await res.json();
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

    const res = await fetch(`${PYTHON_API_URL}/internal/v1/templates?user_id=${getActiveUserId()}&${params.toString()}`, { headers: getAuthHeaders(), cache: "no-store" });
    checkResponseAuth(res);
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
    headers: getAuthHeaders(),
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
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/templates/${templateId}/fork?user_id=${getActiveUserId()}`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: "Failed to fork template" }));
    throw new Error(errData.detail || `HTTP Error ${res.status}`);
  }

  return await res.json();
}

export async function toggleLikeTemplate(templateId: string): Promise<{ is_liked: boolean; likes_count: number }> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/templates/${templateId}/like?user_id=${getActiveUserId()}`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Failed to toggle like: ${res.statusText}`);
  }

  return await res.json();
}

export async function fetchTemplateComments(templateId: string): Promise<TemplateComment[]> {
  try {
    const res = await fetch(`${PYTHON_API_URL}/internal/v1/templates/${templateId}/comments`, { headers: getAuthHeaders(), cache: "no-store" });
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
    headers: getAuthHeaders(),
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

export async function fetchTemplateDetail(templateId: string): Promise<Template | null> {
  try {
    const res = await fetch(`${PYTHON_API_URL}/internal/v1/templates/${templateId}?user_id=${getActiveUserId()}`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`[Callcraft API] Failed to fetch template detail for ${templateId}:`, err);
    return null;
  }
}

export async function fetchSpecPublicationSettings(specId: string): Promise<{
  spec: CallSpec;
  template: Template | null;
  comments: TemplateComment[];
}> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/specs/${specId}/publication?user_id=${getActiveUserId()}`, { headers: getAuthHeaders(), cache: "no-store" });
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
    headers: getAuthHeaders(),
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
    const res = await fetch(`${PYTHON_API_URL}/internal/v1/keys?user_id=${getActiveUserId()}`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    checkResponseAuth(res);
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
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/keys?user_id=${getActiveUserId()}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, environment, ip_whitelist: ipWhitelist }),
  });
  checkResponseAuth(res);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: "Failed to create API Key" }));
    throw new Error(errData.detail || `HTTP Error ${res.status}`);
  }
  const data = await res.json();
  return {
    credential: data.credential,
    secret_key: data.secretKey || data.secret_key || "",
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
    const errData = await res.json().catch(() => ({ detail: "Failed to update IP Whitelist" }));
    throw new Error(errData.detail || `HTTP Error ${res.status}`);
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
    const errData = await res.json().catch(() => ({ detail: "Failed to delete API Key" }));
    throw new Error(errData.detail || `HTTP Error ${res.status}`);
  }
  return true;
}


export async function fetchExecutionLogs(): Promise<ExecutionLog[]> {
  try {
    const res = await fetch(`${PYTHON_API_URL}/internal/v1/logs?user_id=${getActiveUserId()}`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    checkResponseAuth(res);
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
      headers: getAuthHeaders(),
      body: JSON.stringify({
        provider: payload.provider,
        api_key: payload.apiKey,
      }),
    });
    checkResponseAuth(res);

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
    headers: getAuthHeaders(),
    body: JSON.stringify({
      provider: payload.provider,
      api_key: payload.apiKey,
    }),
  });
  checkResponseAuth(res);

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
    const res = await fetch(`${PYTHON_API_URL}/internal/v1/providers/keys?user_id=${getActiveUserId()}`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    checkResponseAuth(res);
    if (!res.ok) {
      return [];
    }
    return await res.json();
  } catch (err) {
    console.warn(`[Callcraft API] Unable to connect to ${PYTHON_API_URL}/internal/v1/providers/keys:`, err);
    return [];
  }
}

export async function fetchSystemAiProviders(): Promise<Array<{ id: string; code: string; name: string }>> {
  try {
    const res = await fetch(`${PYTHON_API_URL}/internal/v1/providers/list`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    checkResponseAuth(res);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn(`[Callcraft API] Unable to connect to ${PYTHON_API_URL}/internal/v1/providers/list:`, err);
    return [];
  }
}

export async function fetchUserProfile(userId: string): Promise<UserProfileDetail | null> {
  try {
    const targetId = userId || getActiveUserId();
    const res = await fetch(`${PYTHON_API_URL}/internal/v1/users/${targetId}/profile?user_id=${getActiveUserId()}`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    checkResponseAuth(res);
    if (!res.ok) {
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`[Callcraft API] Unable to fetch user profile for ${userId}:`, err);
    return null;
  }
}

export async function fetchCurrentUserProfile(): Promise<any | null> {
  try {
    const res = await fetch(`${PYTHON_API_URL}/internal/v1/users/me?user_id=${getActiveUserId()}`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    checkResponseAuth(res);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn(`[Callcraft API] Failed to fetch current user profile:`, err);
    return null;
  }
}

export async function updateUserProfile(payload: {
  fullName?: string;
  bio?: string;
  avatarUrl?: string;
  githubUrl?: string;
  websiteUrl?: string;
  company?: string;
  location?: string;
  phone?: string;
  newPassword?: string;
}): Promise<{ message: string; user: any }> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/users/profile?user_id=${getActiveUserId()}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      full_name: payload.fullName,
      bio: payload.bio,
      avatar_url: payload.avatarUrl,
      github_url: payload.githubUrl,
      website_url: payload.websiteUrl,
      company: payload.company,
      location: payload.location,
      phone: payload.phone,
      new_password: payload.newPassword,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: "Failed to update profile" }));
    throw new Error(errData.detail || `HTTP Error ${res.status}`);
  }

  return await res.json();
}

export async function closeUserAccount(password: string): Promise<{ message: string }> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/users/me/close-account?user_id=${getActiveUserId()}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ password }),
  });
  checkResponseAuth(res);

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: "Gagal menutup akun" }));
    throw new Error(errData.detail || `HTTP Error ${res.status}`);
  }

  return await res.json();
}

export async function verifyEmailToken(payload: { email?: string; token?: string; otp?: string }): Promise<{ message: string; user?: any }> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: "Failed to verify email" }));
    throw new Error(errData.detail || `HTTP Error ${res.status}`);
  }

  return await res.json();
}

export async function resendVerificationEmail(email: string): Promise<{ message: string; emailSent: boolean }> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/auth/resend-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: "Failed to resend verification email" }));
    throw new Error(errData.detail || `HTTP Error ${res.status}`);
  }

  return await res.json();
}

export async function adminUpdateUserStatus(targetUserId: string, status: string): Promise<{ message: string; status: string }> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/admin/users/${targetUserId}/status`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: "Failed to update user status" }));
    throw new Error(errData.detail || `HTTP Error ${res.status}`);
  }

  return await res.json();
}

export async function adminVerifyUser(targetUserId: string): Promise<{ message: string; status: string }> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/admin/users/${targetUserId}/verify`, {
    method: "PUT",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: "Failed to verify user" }));
    throw new Error(errData.detail || `HTTP Error ${res.status}`);
  }

  return await res.json();
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
  try {
    const res = await fetch(`${PYTHON_API_URL}/internal/v1/specs/${specId}/playground-state?user_id=${getActiveUserId()}`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    checkResponseAuth(res);
    if (!res.ok) return null;
    const data = await res.json();
    return data.state || null;
  } catch (err) {
    console.warn(`[Callcraft API] Unable to fetch playground state for spec ${specId}:`, err);
    return null;
  }
}

export async function savePlaygroundState(specId: string, stateData: PlaygroundStateData): Promise<{ success: boolean; message: string; state: PlaygroundStateData }> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/specs/${specId}/playground-state?user_id=${getActiveUserId()}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(stateData),
  });

  checkResponseAuth(res);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: "Failed to save playground state" }));
    throw new Error(errData.detail || `HTTP Error ${res.status}`);
  }

  return await res.json();
}

