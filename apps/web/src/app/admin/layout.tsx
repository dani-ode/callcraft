"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Bot,
  Key,
  FileText,
  Settings,
  ShieldCheck,
  ArrowLeft,
  Bell,
  Server,
  Lock,
  LogOut,
  Feather,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/context/auth-context";

const adminNavigation = [
  { name: "Admin Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "User Management & RBAC", href: "/admin/users", icon: Users },
  { name: "AI Models Taxonomy (17)", href: "/admin/models", icon: Bot },
  { name: "AI Provider Keys", href: "/admin/providers", icon: Key },
  { name: "System Audit Logs", href: "/admin/logs", icon: FileText },
  { name: "Platform Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { adminSession, adminLogout, isLoading } = useAuth();

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (!isLoginPage && !isLoading && !adminSession) {
      router.push("/admin/login");
    }
  }, [isLoginPage, isLoading, adminSession, router]);

  // If viewing the admin login page directly, render without sidebar layout
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#e1b329] via-[#ffb443] to-[#8a715e] p-0.5 animate-bounce">
          <div className="w-full h-full bg-[#120e0b] rounded-[10px] flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-[#e1b329]" />
          </div>
        </div>
        <p className="text-xs font-bold text-[#8a715e] dark:text-[#edd6bb]">Verifying Super Admin Credentials...</p>
      </div>
    );
  }

  if (!adminSession) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200 flex font-sans antialiased">
      {/* Standalone Admin Sidebar */}
      <aside className="w-64 glass-panel border-r border-[#edd6bb]/15 min-h-screen flex flex-col justify-between p-4 z-40">
        <div>
          {/* Admin Brand Header */}
          <div className="flex items-center gap-3 px-3 py-4 mb-6 border-b border-[#edd6bb]/15 pb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#e1b329] via-[#ffb443] to-[#8a715e] p-0.5 shadow-lg shadow-[#e1b329]/20">
              <div className="w-full h-full bg-[#120e0b] rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-[#e1b329]" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight flex items-center gap-1.5">
                <span>Callcraft</span>
                <span className="px-1.5 py-0.5 rounded bg-[#e1b329]/20 text-[#ffb443] text-[10px] font-extrabold uppercase border border-[#e1b329]/30">
                  ADMIN
                </span>
              </h1>
              <p className="text-[10px] opacity-70 font-medium">Drawing Console</p>
            </div>
          </div>

          {/* Admin Navigation Links */}
          <nav className="space-y-1">
            {adminNavigation.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200",
                    isActive
                      ? "bg-[#e1b329]/20 text-[#8a715e] dark:text-[#edd6bb] border border-[#e1b329]/40 shadow-sm shadow-[#e1b329]/10"
                      : "opacity-70 hover:opacity-100 hover:bg-[#edd6bb]/10"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? "text-[#e1b329]" : "opacity-70")} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Action: Return to User Dashboard & Logout */}
        <div className="space-y-3 pt-4 border-t border-[#edd6bb]/15">
          <Link
            href="/specs"
            className="flex items-center justify-between p-3 rounded-xl glass-panel hover:bg-[#edd6bb]/10 border border-[#edd6bb]/15 text-xs font-bold transition-all group"
          >
            <div className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4 text-[#e1b329] group-hover:-translate-x-1 transition-transform" />
              <span>Exit Admin Panel</span>
            </div>
            <span className="text-[10px] opacity-60">User App</span>
          </Link>

          <div className="p-3 rounded-xl glass-panel border border-[#edd6bb]/15 flex items-center justify-between">
            <div className="truncate">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <span>{adminSession?.name || "Super Admin"}</span>
              </div>
              <p className="text-[10px] text-[#ffb443] font-mono truncate">{adminSession?.email || "admin@callcraft.io"}</p>
            </div>
            <button
              onClick={adminLogout}
              title="Logout Admin Session"
              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/15 border border-rose-500/20 transition-all shrink-0 ml-1"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Standalone Admin Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Admin Header */}
        <header className="h-16 glass-panel border-b border-[#edd6bb]/15 px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-lg bg-[#e1b329]/10 text-[#ffb443] border border-[#e1b329]/30 text-xs font-mono font-bold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#e1b329]" />
              <span>STANDALONE DRAWING ADMIN CONSOLE</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <Server className="w-3.5 h-3.5" />
              <span>PostgreSQL & Redis Cluster OK</span>
            </div>

            <ThemeToggle />

            <button className="p-2 rounded-xl opacity-70 hover:opacity-100 hover:bg-[#edd6bb]/10 transition-all">
              <Bell className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-[#edd6bb]/15"></div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#e1b329] via-[#ffb443] to-[#8a715e] p-0.5">
                <div className="w-full h-full bg-[#120e0b] rounded-full flex items-center justify-center text-xs font-bold text-[#e1b329]">
                  {adminSession?.avatar || "SA"}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold">{adminSession?.name || "Super Administrator"}</p>
                <p className="text-[10px] text-[#ffb443] font-mono">{adminSession?.email || "admin@callcraft.io"}</p>
              </div>

              {/* Admin Header Logout Button */}
              <button
                onClick={adminLogout}
                title="Log Out Admin"
                className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/15 border border-rose-500/20 transition-all ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Admin Page Body */}
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
