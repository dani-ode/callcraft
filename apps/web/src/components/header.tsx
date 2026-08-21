"use client";

import { useState } from "react";
import { Bell, ShieldCheck, BookOpen, ExternalLink, Copy, Check, Fingerprint, LogOut, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/context/auth-context";

interface HeaderProps {
  onOpenMobileSidebar?: () => void;
}

export function Header({ onOpenMobileSidebar }: HeaderProps) {
  const [copiedUserId, setCopiedUserId] = useState(false);
  const { user, logout } = useAuth();
  const userId = user?.id || "usr_guest_active";

  const handleCopyUserId = () => {
    navigator.clipboard.writeText(userId);
    setCopiedUserId(true);
    setTimeout(() => setCopiedUserId(false), 2000);
  };

  return (
    <header className="h-16 glass-panel border-b border-[#edd6bb]/15 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 shrink-0">
      {/* Mobile Sidebar Menu Button & Brand Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden p-2 rounded-xl glass-panel border border-[#edd6bb]/20 text-[#e1b329] hover:bg-[#e1b329]/15 transition-all"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="md:hidden flex items-center gap-2">
          <span className="font-extrabold text-sm gradient-text">Callcraft</span>
        </div>
      </div>

      {/* User Actions & System Badges */}
      <div className="flex items-center gap-2 sm:gap-4">
        <a
          href="http://127.0.0.1:8080/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-panel hover:bg-[#e1b329]/15 text-xs font-semibold border border-[#edd6bb]/20 hover:border-[#e1b329]/50 transition-all"
        >
          <BookOpen className="w-3.5 h-3.5 text-[#e1b329]" />
          <span className="hidden md:inline">API Docs (Swagger)</span>
          <span className="md:hidden">Docs</span>
          <ExternalLink className="w-3 h-3 text-[#e1b329]" />
        </a>

        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#e1b329]/10 border border-[#e1b329]/20 text-[#ffb443] text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-[#e1b329]" />
          <span>RAM Storage Active</span>
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        <button className="p-2 rounded-xl opacity-60 hover:opacity-100 hover:bg-[#edd6bb]/10 transition-all">
          <Bell className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-[#edd6bb]/15 hidden sm:block"></div>

        {/* User Account Info & Logout Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-[#e1b329] via-[#ffb443] to-[#8a715e] p-0.5 shadow-md shrink-0">
            <div className="w-full h-full bg-[#120e0b] dark:bg-[#120e0b] bg-[#f5ebe0] rounded-full flex items-center justify-center text-xs font-bold text-[#e1b329]">
              {user?.avatar || "CC"}
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold truncate max-w-[120px]">{user?.name || "Callcraft Developer"}</span>
              <button
                type="button"
                onClick={handleCopyUserId}
                title="Copy User ID"
                className="px-1.5 py-0.5 rounded bg-[#e1b329]/15 hover:bg-[#e1b329]/25 text-[#8a715e] dark:text-[#ffb443] text-[10px] font-mono border border-[#e1b329]/30 flex items-center gap-1 transition-colors"
              >
                <Fingerprint className="w-3 h-3 text-[#e1b329]" />
                <span>{copiedUserId ? "Copied!" : "ID"}</span>
                {copiedUserId ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <p className="text-[10px] opacity-60 font-mono truncate max-w-[140px]">{user?.email || "dev@callcraft.io"}</p>
          </div>

          {/* User Logout Button */}
          <button
            onClick={logout}
            title="Log Out of Callcraft"
            className="p-1.5 sm:p-2 rounded-xl text-rose-500 hover:bg-rose-500/15 border border-rose-500/20 transition-all shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
