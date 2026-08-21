"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Edit3,
  Plus,
  Trash2,
  FileText,
  Key,
  Shield,
  Layers,
  Loader2,
  Globe,
  Lock,
  Heart,
  GitFork,
  Star,
  Settings,
  Upload,
} from "lucide-react";
import { fetchCallSpecs } from "@/lib/api-client";
import { CallSpec } from "@/lib/types";

export default function CallSpecsPage() {
  const [specs, setSpecs] = useState<CallSpec[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCallSpecs().then((data) => {
      setSpecs(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-[#e1b329]" />
            <span>Callcraft API Specifications</span>
          </h1>
          <p className="text-xs text-[#8b7e6d] dark:text-[#edd6bb]/70">
            Design dynamic response schemas, extraction prompts, PDF inputs, and Marketplace publication rules
          </p>
        </div>
        <Link
          href="/specs/new/builder"
          className="px-4 py-2.5 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 font-bold text-xs shadow-lg shadow-[#e1b329]/20 flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Call Spec</span>
        </Link>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#e1b329]" />
          <p className="text-xs mt-2">Loading Call Specifications...</p>
        </div>
      ) : specs.length === 0 ? (
        <div className="py-16 text-center text-slate-400 space-y-2 glass-panel p-8 rounded-2xl border border-[#edd6bb]/20">
          <Layers className="w-8 h-8 mx-auto text-slate-600" />
          <p className="text-xs font-semibold text-slate-300">No Call Specifications found in database.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {specs.map((spec) => (
            <div
              key={spec.id}
              className={`glass-panel glass-panel-hover p-6 rounded-3xl space-y-4 flex flex-col justify-between transition-all ${
                spec.isPublished
                  ? "border border-emerald-500/40 bg-gradient-to-b from-emerald-500/5 to-transparent"
                  : "border border-[#edd6bb]/20"
              }`}
            >
              <div className="space-y-3">
                {/* Status Badges Header */}
                <div className="flex items-center justify-between">
                  {spec.isPublished ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold border border-emerald-500/40 flex items-center gap-1.5 shadow-sm shadow-emerald-500/20">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Published to Marketplace</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-[#8b7e6d]/15 text-[#8b7e6d] dark:text-[#edd6bb]/70 text-[10px] font-bold border border-[#edd6bb]/20 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>Private Spec</span>
                    </span>
                  )}
                  <span className="text-[10px] font-mono opacity-60 font-semibold">{spec.slug}</span>
                </div>

                <h3 className="text-base font-bold text-slate-100">{spec.name}</h3>
                <p className="text-xs text-[#8b7e6d] dark:text-[#edd6bb]/70 line-clamp-2">
                  {spec.description || "No description provided."}
                </p>

                {/* Capability Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    <span>PDF & Vision</span>
                  </span>

                  {spec.useExternalApiKey ? (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold flex items-center gap-1">
                      <Key className="w-3 h-3" />
                      <span>Bring-Your-Own Key</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      <span>System Model</span>
                    </span>
                  )}
                </div>

                {/* Marketplace Metrics if Published */}
                {spec.isPublished && (
                  <div className="flex items-center gap-3 pt-2 text-xs font-bold text-[#8b7e6d] border-t border-[#edd6bb]/10">
                    <span className="flex items-center gap-1 text-rose-400">
                      <Heart className="w-3.5 h-3.5 fill-rose-400" />
                      <span>{spec.likesCount || 0}</span>
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400">
                      <GitFork className="w-3.5 h-3.5" />
                      <span>{spec.forkCount || 0}</span>
                    </span>
                    <span className="flex items-center gap-1 text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{spec.ratingAvg?.toFixed(1) || "5.0"}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons Bar */}
              <div className="pt-4 border-t border-[#edd6bb]/15 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/specs/${spec.id}/builder`}
                    className="text-xs font-bold text-[#e1b329] hover:underline flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Open Visual Builder</span>
                  </Link>

                  <button className="opacity-50 hover:opacity-100 hover:text-rose-500 transition-all p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Single Publication Page Link */}
                <Link
                  href={`/specs/${spec.id}/publish`}
                  className={`w-full py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                    spec.isPublished
                      ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30"
                      : "bg-[#e1b329]/15 text-[#e1b329] hover:bg-[#e1b329]/25 border border-[#e1b329]/30"
                  }`}
                >
                  {spec.isPublished ? (
                    <>
                      <Settings className="w-3.5 h-3.5" />
                      <span>Kelola Marketplace & Komentar</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-3.5 h-3.5" />
                      <span>Publikasikan ke Marketplace</span>
                    </>
                  )}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
