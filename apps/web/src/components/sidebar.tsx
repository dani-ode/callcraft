"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Code2,
  Key,
  Layers,
  LayoutDashboard,
  Play,
  BookOpen,
  ExternalLink,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useAppInit } from "@/context/app-init-context";
import { ProjectSwitcher } from "@/components/project-switcher";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Call Specs", href: "/specs", icon: Code2 },
  { name: "Playground", href: "/playground", icon: Play },
  { name: "Templates", href: "/templates", icon: Layers },
  { name: "API Keys", href: "/keys", icon: Key },
  { name: "API Docs", href: "http://127.0.0.1:8080/docs", icon: BookOpen, external: true },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { appInit, AppIconComponent, isCustomImageIcon } = useAppInit();

  // Support manual collapse toggle in addition to tablet auto-collapse
  const [isManuallyCollapsed, setIsManuallyCollapsed] = useState(false);

  const sidebarContent = (isMobileDrawer: boolean = false) => (
    <div className="h-full flex flex-col justify-between p-3 lg:p-4">
      <div>
        {/* Brand Header */}
        <div className="flex items-center justify-between px-1 py-3 mb-4 border-b border-[#edd6bb]/15 pb-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#e1b329] via-[#ffb443] to-[#8a715e] p-0.5 shadow-lg shadow-[#e1b329]/20 shrink-0">
              <div className="w-full h-full bg-[#120e0b] dark:bg-[#120e0b] bg-[#f5ebe0] rounded-[10px] flex items-center justify-center overflow-hidden">
                {isCustomImageIcon ? (
                  <img src={appInit.appIcon} alt={appInit.appName || "App Logo"} className="w-6 h-6 object-contain" />
                ) : (
                  <AppIconComponent className="w-5 h-5 text-[#e1b329]" />
                )}
              </div>
            </div>
            {(!isManuallyCollapsed || isMobileDrawer) && (
              <div className={cn("min-w-0 transition-opacity", !isMobileDrawer && "hidden lg:block")}>
                <h1 className="text-lg font-extrabold tracking-tight gradient-text truncate">{appInit.appName || "Callcraft"}</h1>
                <p className="text-[10px] text-[#8b7e6d] font-medium tracking-wide truncate">{appInit.tagline || "Drawing Book Gateway"}</p>
              </div>
            )}
          </div>

          {/* Close button for mobile drawer view */}
          {onCloseMobile && isMobileDrawer && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-[#edd6bb]/15"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Manual Collapse Toggle Button for Desktop/Tablet */}
          {!isMobileDrawer && (
            <button
              type="button"
              onClick={() => setIsManuallyCollapsed(!isManuallyCollapsed)}
              title={isManuallyCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden md:flex p-1.5 rounded-lg text-[#8a715e] dark:text-[#edd6bb] hover:bg-[#e1b329]/15 border border-[#edd6bb]/15 transition-all shrink-0"
            >
              {isManuallyCollapsed ? <ChevronRight className="w-4 h-4 text-[#e1b329]" /> : <ChevronLeft className="w-4 h-4 text-[#e1b329]" />}
            </button>
          )}
        </div>

        {/* Active Project Switcher */}
        <ProjectSwitcher collapsed={isManuallyCollapsed && !isMobileDrawer} />

        {/* Navigation Items */}
        <nav className="space-y-1.5">
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
                  onClick={onCloseMobile}
                  title={item.name}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-[#8a715e] dark:text-[#edd6bb] hover:bg-[#e1b329]/15 border border-[#edd6bb]/15 hover:border-[#e1b329]/40 transition-all duration-200",
                    !isManuallyCollapsed && !isMobileDrawer ? "md:justify-center lg:justify-between lg:px-3.5" : "justify-center px-2.5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-[#e1b329] shrink-0" />
                    {(!isManuallyCollapsed || isMobileDrawer) && (
                      <span className={cn("truncate", !isMobileDrawer && "hidden lg:inline")}>{item.name}</span>
                    )}
                  </div>
                  {(!isManuallyCollapsed || isMobileDrawer) && (
                    <ExternalLink className={cn("w-3.5 h-3.5 text-[#e1b329] shrink-0", !isMobileDrawer && "hidden lg:block")} />
                  )}
                </a>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onCloseMobile}
                title={item.name}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-xl text-xs font-bold transition-all duration-200",
                  isActive
                    ? "bg-[#e1b329]/20 text-[#8a715e] dark:text-[#edd6bb] border border-[#e1b329]/40 shadow-sm shadow-[#e1b329]/10"
                    : "text-[#8b7e6d] hover:text-[#8a715e] dark:hover:text-[#edd6bb] hover:bg-[#edd6bb]/10",
                  !isManuallyCollapsed && !isMobileDrawer ? "md:justify-center lg:justify-start lg:px-3.5" : "justify-center px-2.5"
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-[#e1b329]" : "text-[#8b7e6d]")} />
                {(!isManuallyCollapsed || isMobileDrawer) && (
                  <span className={cn("truncate", !isMobileDrawer && "hidden lg:inline")}>{item.name}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Session & Logout Footer */}
      <div className="glass-panel rounded-xl p-2 border border-[#edd6bb]/15 flex items-center justify-between gap-1.5 overflow-hidden">
        <Link
          href="/settings"
          onClick={onCloseMobile}
          className="flex items-center gap-2 overflow-hidden hover:opacity-80 transition-opacity cursor-pointer flex-1 group"
          title="Buka Pengaturan Akun"
        >
          <div className="w-7 h-7 rounded-lg bg-[#e1b329]/20 text-[#e1b329] font-bold text-xs flex items-center justify-center shrink-0 border border-[#e1b329]/30 group-hover:border-[#e1b329]">
            {user?.avatar || "U"}
          </div>
          {(!isManuallyCollapsed || isMobileDrawer) && (
            <div className={cn("truncate", !isMobileDrawer && "hidden lg:block")}>
              <p className="text-xs font-bold truncate group-hover:text-[#e1b329] transition-colors">{user?.name || "Developer"}</p>
              <p className="text-[10px] opacity-60 truncate">{user?.email || "dev@callcraft.io"}</p>
            </div>
          )}
        </Link>

        <button
          onClick={logout}
          title="Log Out"
          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/15 transition-all shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop & Tablet Sticky Sidebar (Auto-collapse on tablet md:w-16, full on desktop lg:w-64) */}
      <aside
        className={cn(
          "hidden md:flex glass-panel border-r border-[#edd6bb]/15 sticky top-0 h-screen shrink-0 overflow-y-auto z-30 transition-all duration-300 flex-col",
          isManuallyCollapsed ? "w-16" : "w-16 lg:w-64"
        )}
      >
        {sidebarContent(false)}
      </aside>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <aside className="relative w-72 max-w-[80vw] bg-[#17120e] dark:bg-[#120e0b] border-r border-[#edd6bb]/20 h-full flex flex-col z-50 shadow-2xl overflow-y-auto">
            {sidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}
