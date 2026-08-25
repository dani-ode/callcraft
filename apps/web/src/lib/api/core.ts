export const PYTHON_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080";

export function getActiveUserId(): string {
  if (typeof window !== "undefined") {
    const key = localStorage.getItem("callcraft_session_key");
    if (key) return key;

    const legacy = localStorage.getItem("callcraft_user_session");
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy);
        return typeof parsed === "string" ? parsed : parsed?.id || "";
      } catch {
        return legacy;
      }
    }
  }
  return "";
}

export function extractErrorMessage(errorData: any, defaultMsg: string, status?: number): string {
  if (!errorData) return status ? `HTTP Error ${status}` : defaultMsg;
  if (typeof errorData === "string") return errorData;
  if (errorData.error?.message) return errorData.error.message;
  if (errorData.message) return errorData.message;
  if (errorData.detail) {
    if (typeof errorData.detail === "string") return errorData.detail;
    if (Array.isArray(errorData.detail)) {
      return errorData.detail.map((d: any) => d.msg || d.issue || JSON.stringify(d)).join(", ");
    }
    return JSON.stringify(errorData.detail);
  }
  return status ? `HTTP Error ${status}` : defaultMsg;
}

export function getActiveUserSession(): { id: string; name: string; email: string } {
  return {
    id: getActiveUserId(),
    name: "",
    email: "",
  };
}

export function sanitizeHeaderValue(val: string | undefined | null): string {
  if (!val) return "";
  return val.replace(/[^\x00-\xFF]/g, "").trim();
}

export function getAuthHeaders(): Record<string, string> {
  const userId = getActiveUserId();
  return {
    "Content-Type": "application/json",
    "X-User-Id": sanitizeHeaderValue(userId),
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
