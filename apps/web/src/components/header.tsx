"use client";

import { Bell, Search, User, ShieldCheck } from "lucide-react";

export function Header() {
  return (
    <header className="h-16 glass-panel border-b border-slate-800/60 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search Input */}
      <div className="relative w-72">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search Call Specs, keys, logs..."
          className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"
        />
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>RAM Storage Engine Active</span>
        </div>

        <button className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all">
          <Bell className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-800"></div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-0.5">
            <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center text-xs font-semibold text-indigo-300">
              CC
            </div>
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-semibold text-slate-200">Callcraft Admin</p>
            <p className="text-[10px] text-slate-400">dev@callcraft.io</p>
          </div>
        </div>
      </div>
    </header>
  );
}
