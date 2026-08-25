import { AppInitSettings } from "../types";
import { PYTHON_API_URL, extractErrorMessage } from "./core";

export async function fetchAppInitSettings(): Promise<AppInitSettings> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/app-init`, { cache: "no-store" });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, `Gagal memuat pengaturan aplikasi (HTTP ${res.status})`));
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
