"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "admin" | "developer" | "viewer";
  avatar: string;
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

export const DEFAULT_USER: UserSession = {
  id: `usr_${Math.random().toString(36).substring(2, 10)}`,
  name: "Callcraft Developer",
  email: "dev@callcraft.io",
  role: "developer",
  avatar: "CC",
};

export const DEFAULT_ADMIN: UserSession = {
  id: `adm_${Math.random().toString(36).substring(2, 10)}`,
  name: "Super Administrator",
  email: "admin@callcraft.io",
  role: "super_admin",
  avatar: "SA",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [adminSession, setAdminSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Load persisted sessions if available
    const savedUser = localStorage.getItem("callcraft_user_session");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        setUser(null);
      }
    }

    const savedAdmin = localStorage.getItem("callcraft_admin_session");
    if (savedAdmin) {
      try {
        setAdminSession(JSON.parse(savedAdmin));
      } catch (e) {
        setAdminSession(null);
      }
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string): Promise<boolean> => {
    const session: UserSession = {
      id: `usr_${Math.random().toString(36).substring(2, 10)}`,
      name: email.split("@")[0].replace(".", " ").toUpperCase(),
      email,
      role: "developer",
      avatar: email.substring(0, 2).toUpperCase(),
    };
    setUser(session);
    localStorage.setItem("callcraft_user_session", JSON.stringify(session));
    return true;
  };

  const register = async (name: string, email: string): Promise<boolean> => {
    const session: UserSession = {
      id: `usr_${Math.random().toString(36).substring(2, 10)}`,
      name,
      email,
      role: "developer",
      avatar: name.substring(0, 2).toUpperCase(),
    };
    setUser(session);
    localStorage.setItem("callcraft_user_session", JSON.stringify(session));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("callcraft_user_session");
    router.push("/login");
  };

  const adminLogin = async (email: string): Promise<boolean> => {
    const session: UserSession = {
      id: "usr_01HZX01ADMIN0000000001",
      name: "Super Administrator",
      email: email || "admin@callcraft.io",
      role: "super_admin",
      avatar: "SA",
    };
    setAdminSession(session);
    localStorage.setItem("callcraft_admin_session", JSON.stringify(session));
    return true;
  };

  const adminLogout = () => {
    setAdminSession(null);
    localStorage.removeItem("callcraft_admin_session");
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
