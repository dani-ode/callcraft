import { PYTHON_API_URL, extractErrorMessage } from "./core";

export interface GoogleAuthUrlResponse {
  url: string;
  state: string;
}

export interface GoogleExchangeResponse {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "admin" | "developer" | "viewer";
  status: string;
  bio?: string | null;
  avatar: string;
  avatarUrl?: string | null;
  githubUrl?: string | null;
  websiteUrl?: string | null;
  company?: string | null;
  location?: string | null;
  phone?: string | null;
}

/**
 * Requests the Google OAuth 2.0 consent URL from the backend API.
 */
export async function getGoogleAuthUrl(): Promise<GoogleAuthUrlResponse> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/auth/google/url`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, "Gagal mendapatkan tautan autentikasi Google."));
  }

  return await res.json();
}

/**
 * Exchanges a single-use OAuth exchange code for the full authenticated user session.
 */
export async function exchangeGoogleCode(code: string): Promise<GoogleExchangeResponse> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/auth/google/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, "Kode autentikasi Google tidak valid atau telah kedaluwarsa."));
  }

  return await res.json();
}
