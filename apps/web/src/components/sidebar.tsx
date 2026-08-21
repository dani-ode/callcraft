"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Code2,
  Key,
  Layers,
  LayoutDashboard,
  Play,
  BookOpen,
  ExternalLink,
  ShieldAlert,
  Feather,
  LogOut,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useAppInit } from "@/context/app-init-context";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Call Specs", href: "/specs", icon: Code2 },
  { name: "Playground", href: "/playground", icon: Play },
  { name: "Templates", href: "/templates", icon: Layers },
  { name: "API Keys", href: "/keys", icon: Key },
  { name: "API Docs", href: "http://127.0.0.1:8080/docs", icon: BookOpen, external: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { appInit, AppIconComponent, isCustomImageIcon } = useAppInit();

  return (
    <aside className="w-64 glass-panel border-r border-[#edd6bb]/15 min-h-screen flex flex-col justify-between p-4 z-40">
      <div>
        {/* Craft Brand Header */}
        <div className="flex items-center gap-3 px-3 py-4 mb-6 border-b border-[#edd6bb]/15 pb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#e1b329] via-[#ffb443] to-[#8a715e] p-0.5 shadow-lg shadow-[#e1b329]/20">
            <div className="w-full h-full bg-[#120e0b] dark:bg-[#120e0b] bg-[#f5ebe0] rounded-[10px] flex items-center justify-center overflow-hidden">
              {isCustomImageIcon ? (
                <img src={appInit.appIcon} alt={appInit.appName || "App Logo"} className="w-6 h-6 object-contain" />
              ) : (
                <AppIconComponent className="w-5 h-5 text-[#e1b329]" />
              )}
            </div>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight gradient-text truncate">{appInit.appName || "Callcraft"}</h1>
            <p className="text-[11px] text-[#8b7e6d] font-medium tracking-wide truncate">{appInit.tagline || "Drawing Book Gateway"}</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && !item.external && pathname.startsWith(item.href));
            const Icon = item.icon;
            
            if (item.external) {
              return (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#8a715e] dark:text-[#edd6bb] hover:bg-[#e1b329]/15 border border-[#edd6bb]/15 hover:border-[#e1b329]/40 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-[#e1b329]" />
                    <span>{item.name}</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-[#e1b329]" />
                </a>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200",
                  isActive
                    ? "bg-[#e1b329]/20 text-[#8a715e] dark:text-[#edd6bb] border border-[#e1b329]/40 shadow-sm shadow-[#e1b329]/10"
                    : "text-[#8b7e6d] hover:text-[#8a715e] dark:hover:text-[#edd6bb] hover:bg-[#edd6bb]/10"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-[#e1b329]" : "text-[#8b7e6d]")} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-3">
        {/* Switch to Admin Console Card Link */}
        <Link
          href="/admin"
          className="flex items-center justify-between p-3 rounded-xl bg-[#ffb443]/15 hover:bg-[#ffb443]/25 border border-[#ffb443]/35 transition-all group"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-[#8a715e] dark:text-[#ffb443]">
            <ShieldAlert className="w-4 h-4 text-[#ffb443] group-hover:scale-110 transition-transform" />
            <span>Admin Console</span>
          </div>
          <span className="text-[10px] bg-[#ffb443]/25 text-[#8a715e] dark:text-[#ffb443] px-2 py-0.5 rounded-md font-bold">
            Open ↗
          </span>
        </Link>

        {/* User Session & Logout Footer */}
        <div className="glass-panel rounded-xl p-3 border border-[#edd6bb]/15 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-[#e1b329]/20 text-[#e1b329] font-bold text-xs flex items-center justify-center shrink-0">
              {user?.avatar || "U"}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold truncate">{user?.name || "Developer"}</p>
              <p className="text-[10px] opacity-60 truncate">{user?.email || "dev@callcraft.io"}</p>
            </div>
          </div>

          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/15 transition-all shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
