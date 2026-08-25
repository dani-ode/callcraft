import { UserProfileDetail } from "../types";
import { PYTHON_API_URL, checkResponseAuth, extractErrorMessage, getActiveUserId, getAuthHeaders } from "./core";

export async function fetchUserProfile(userId: string): Promise<UserProfileDetail | null> {
  const targetId = userId || getActiveUserId();
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/users/${targetId}/profile?user_id=${getActiveUserId()}`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  checkResponseAuth(res);
  if (!res.ok) {
    if (res.status === 404) return null;
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, `Gagal memuat profil pengguna ${userId}`));
  }
  return await res.json();
}

export async function fetchCurrentUserProfile(): Promise<any | null> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/users/me?user_id=${getActiveUserId()}`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  checkResponseAuth(res);
  if (!res.ok) {
    if (res.status === 404) return null;
    const errorData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errorData, `Gagal memuat profil pengguna saat ini (HTTP ${res.status})`));
  }
  return await res.json();
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
    const errData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errData, "Gagal memperbarui profil pengguna"));
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
    const errData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errData, "Gagal menutup akun"));
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
    const errData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errData, "Gagal memverifikasi email"));
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
    const errData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errData, "Gagal mengirim ulang verifikasi email"));
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
    const errData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errData, `Gagal meng-update status user ${targetUserId}`));
  }

  return await res.json();
}

export async function adminVerifyUser(targetUserId: string): Promise<{ message: string; status: string }> {
  const res = await fetch(`${PYTHON_API_URL}/internal/v1/admin/users/${targetUserId}/verify`, {
    method: "PUT",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(errData, `Gagal memverifikasi user ${targetUserId}`));
  }

  return await res.json();
}
