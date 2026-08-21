"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchAppInitSettings } from "@/lib/api-client";
import { AppInitSettings } from "@/lib/types";
import { Feather, Layers, Zap, Bot, Shield, Code, LucideIcon } from "lucide-react";

interface AppInitContextType {
  appInit: AppInitSettings;
  isLoading: boolean;
  refetchAppInit: () => Promise<void>;
  AppIconComponent: LucideIcon;
  isCustomImageIcon: boolean;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Feather: Feather,
  Layers: Layers,
  Zap: Zap,
  Bot: Bot,
  Shield: Shield,
  Code: Code,
};

const defaultAppInit: AppInitSettings = {
  id: "app_01HZX01INIT00000000001",
  appName: "Callcraft",
  appIcon: "Feather",
  tagline: "Multimodal AI Execution Gateway",
  description: "AI-Powered Dynamic Multimodal Execution Engine & Data Plane Gateway",
  faviconUrl: "/favicon.ico",
  disableLandingPage: false,
};

const AppInitContext = createContext<AppInitContextType>({
  appInit: defaultAppInit,
  isLoading: true,
  refetchAppInit: async () => {},
  AppIconComponent: Feather,
  isCustomImageIcon: false,
});

export function AppInitProvider({ children }: { children: React.ReactNode }) {
  const [appInit, setAppInit] = useState<AppInitSettings>(defaultAppInit);
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const data = await fetchAppInitSettings();
      if (data) {
        setAppInit(data);
        
        // Dynamically update document title & favicon in browser tab
        if (typeof window !== "undefined") {
          const titleText = `${data.appName || "Callcraft"} — ${data.tagline || "Multimodal AI Execution Gateway"}`;
          document.title = titleText;

          if (data.faviconUrl) {
            let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
            if (!link) {
              link = document.createElement("link");
              link.rel = "icon";
              document.getElementsByTagName("head")[0].appendChild(link);
            }
            link.href = data.faviconUrl;
          }
        }
      }
    } catch (err) {
      console.warn("Unable to load AppInit settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const isCustomImageIcon = Boolean(
    appInit.appIcon &&
      (appInit.appIcon.startsWith("http://") ||
        appInit.appIcon.startsWith("https://") ||
        appInit.appIcon.startsWith("/") ||
        appInit.appIcon.startsWith("data:image/"))
  );

  const IconComp = ICON_MAP[appInit.appIcon] || Feather;

  return (
    <AppInitContext.Provider
      value={{
        appInit,
        isLoading,
        refetchAppInit: loadSettings,
        AppIconComponent: IconComp,
        isCustomImageIcon,
      }}
    >
      {children}
    </AppInitContext.Provider>
  );
}

export function useAppInit() {
  return useContext(AppInitContext);
}
