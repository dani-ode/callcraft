"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { fetchCurrentUserProfile, fetchUserProfile, clearUserSessionOnly } from "@/lib/api-client";

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "admin" | "developer" | "viewer";
  avatar: string;
  status?: string;
}

interface AuthContextType {
  user: UserSession | null;
  adminSession: UserSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdminAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  register: (name: string, email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  adminLogin: (email: string, password?: string) => Promise<boolean>;
  adminLogout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [adminSession, setAdminSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Listen for global 401 Unauthorized API events
    const handleUnauthorizedEvent = () => {
      console.warn("[AuthContext] Received 401 Unauthorized. Invalidating user session and preserving theme...");
      setUser(null);
      clearUserSessionOnly();
      router.push("/login");
    };

    if (typeof window !== "undefined") {
      window.addEventListener("callcraft_unauthorized", handleUnauthorizedEvent);
    }

    // Get session key (user_id) from storage
    let sessionKey = "";
    if (typeof window !== "undefined") {
      sessionKey = localStorage.getItem("callcraft_session_key") || "";
      if (!sessionKey) {
        const legacy = localStorage.getItem("callcraft_user_session");
        if (legacy) {
          try {
            const parsed = JSON.parse(legacy);
            sessionKey = typeof parsed === "string" ? parsed : parsed?.id || "";
          } catch {
            sessionKey = legacy;
          }
        }
      }
    }

    if (sessionKey) {
      // Hit backend DB directly to fetch real, live user display profile!
      fetchCurrentUserProfile()
        .then((res) => {
          if (!res || !res.id) {
            console.warn("[AuthContext] Session key is invalid or user no longer exists in DB. Logging out.");
            setUser(null);
            clearUserSessionOnly();
            router.push("/login");
          } else {
            localStorage.setItem("callcraft_session_key", res.id);
            setUser({
              id: res.id,
              name: res.fullName,
              email: res.email,
              role: "developer",
              avatar: res.avatarUrl || (res.fullName ? res.fullName.substring(0, 2).toUpperCase() : "CC"),
              status: res.status,
            });
          }
        })
        .catch(() => {
          setUser(null);
          localStorage.removeItem("callcraft_session_key");
          localStorage.removeItem("callcraft_user_session");
          router.push("/login");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }

    let savedAdminKey = "";
    if (typeof window !== "undefined") {
      savedAdminKey = localStorage.getItem("callcraft_admin_key") || "";
      if (!savedAdminKey) {
        const legacyAdmin = localStorage.getItem("callcraft_admin_session");
        if (legacyAdmin) {
          try {
            const parsed = JSON.parse(legacyAdmin);
            savedAdminKey = typeof parsed === "string" ? parsed : parsed?.id || "";
          } catch {
            savedAdminKey = legacyAdmin;
          }
        }
      }
    }

    if (savedAdminKey) {
      // Hit backend DB directly to verify admin session key & fetch live admin display profile!
      fetchUserProfile(savedAdminKey)
        .then((res) => {
          if (!res || !res.id) {
            console.warn("[AuthContext] Admin session key is invalid or admin user no longer exists in DB. Logging out admin.");
            setAdminSession(null);
            localStorage.removeItem("callcraft_admin_key");
            localStorage.removeItem("callcraft_admin_session");
          } else {
            localStorage.setItem("callcraft_admin_key", res.id);
            setAdminSession({
              id: res.id,
              name: res.fullName,
              email: res.email,
              role: "super_admin",
              avatar: res.avatarUrl || (res.fullName ? res.fullName.substring(0, 2).toUpperCase() : "SA"),
            });
          }
        })
        .catch(() => {
          setAdminSession(null);
          localStorage.removeItem("callcraft_admin_key");
          localStorage.removeItem("callcraft_admin_session");
        });
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("callcraft_unauthorized", handleUnauthorizedEvent);
      }
    };
  }, [router]);

  const login = async (email: string, password?: string): Promise<boolean> => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL is not configured");

    const res = await fetch(`${apiUrl}/internal/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: password || "" }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      const message =
        errData?.error?.message ||
        errData?.detail ||
        `Login gagal (HTTP ${res.status})`;
      const hint = errData?.error?.actionableStep ?? undefined;
      const err = new Error(message) as Error & { hint?: string };
      err.hint = hint;
      throw err;
    }

    const data = await res.json();
    const sessionKey = data.id;
    
    // Store ONLY the session key string in storage
    localStorage.setItem("callcraft_session_key", sessionKey);
    localStorage.removeItem("callcraft_user_session");

    // Populate state straight from backend DB response
    setUser({
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role || "developer",
      avatar: data.avatar || (data.name ? data.name.substring(0, 2).toUpperCase() : "CC"),
      status: data.status || "active",
    });

    return true;
  };

  const register = async (name: string, email: string, password?: string): Promise<boolean> => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL is not configured");

    const res = await fetch(`${apiUrl}/internal/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password: password || "" }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      const message =
        errData?.error?.message ||
        errData?.detail ||
        `Pendaftaran gagal (HTTP ${res.status})`;
      throw new Error(message);
    }

    const data = await res.json();

    if (data.requireVerification || data.status === "pending_verification") {
      // Do NOT set session key or user state if email verification is pending!
      setUser(null);
      localStorage.removeItem("callcraft_session_key");
      localStorage.removeItem("callcraft_user_session");
      return true;
    }

    const sessionKey = data.id;

    // Store ONLY the session key string in storage if account is active
    localStorage.setItem("callcraft_session_key", sessionKey);
    localStorage.removeItem("callcraft_user_session");

    setUser({
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role || "developer",
      avatar: data.avatar || (data.name ? data.name.substring(0, 2).toUpperCase() : "CC"),
      status: data.status,
    });

    return true;
  };

  const logout = () => {
    setUser(null);
    clearUserSessionOnly();
    router.push("/login");
  };

  const adminLogin = async (email: string, password?: string): Promise<boolean> => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL is not configured");

    const res = await fetch(`${apiUrl}/internal/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: password || "" }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      const message =
        errData?.error?.message ||
        errData?.detail ||
        `Login Admin gagal (HTTP ${res.status})`;
      throw new Error(message);
    }

    const data = await res.json();
    const adminKey = data.id;

    // Store ONLY the session key string in storage
    localStorage.setItem("callcraft_admin_key", adminKey);
    localStorage.removeItem("callcraft_admin_session");

    setAdminSession({
      id: data.id,
      name: data.name,
      email: data.email,
      role: "super_admin",
      avatar: data.avatar || (data.name ? data.name.substring(0, 2).toUpperCase() : "SA"),
    });

    return true;
  };

  const adminLogout = () => {
    setAdminSession(null);
    clearUserSessionOnly();
    router.push("/admin/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        adminSession,
        isLoading,
        isAuthenticated: !!user,
        isAdminAuthenticated: !!adminSession,
        login,
        register,
        logout,
        adminLogin,
        adminLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
