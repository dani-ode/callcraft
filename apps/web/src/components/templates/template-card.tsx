"use client";

import Link from "next/link";
import { Star, MessageSquare, Heart, Copy, Eye, User as UserIcon, Settings } from "lucide-react";
import { Template } from "@/lib/types";
import { extractPlainTextFromMarkdown } from "@/components/markdown-editor";

interface TemplateCardProps {
  template: Template;
  currentUserId: string;
  onLikeToggle: (tmpl: Template) => void;
  onFork: (tmpl: Template) => void;
}

export function TemplateCard({ template, currentUserId, onLikeToggle, onFork }: TemplateCardProps) {
  const categoriesToDisplay = (
    template.categories && template.categories.length > 0
      ? template.categories
      : [template.category]
  ).slice(0, 3);

  const plainDescription = extractPlainTextFromMarkdown(template.description);

  return (
    <div className="glass-panel glass-panel-hover p-6 rounded-3xl border border-[#edd6bb]/20 flex flex-col justify-between space-y-4 relative group">
      <div className="space-y-3">
        {/* Author Link & Category Badges */}
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/users/${template.userId || "usr_default_dev_01"}`}
            className="text-xs font-bold text-[#e1b329] hover:underline flex items-center gap-1.5 shrink-0"
          >
            <UserIcon className="w-3.5 h-3.5 text-[#e1b329]" />
            <span>by {template.authorName || "Callcraft Developer"}</span>
          </Link>

          <div className="flex flex-wrap items-center justify-end gap-1 overflow-hidden">
            {categoriesToDisplay.map((cat, idx) => (
              <span
                key={idx}
                className="text-[9px] font-mono font-bold text-[#e1b329] bg-[#e1b329]/15 px-2 py-0.5 rounded-md border border-[#e1b329]/30 uppercase"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="text-base font-extrabold text-[#edd6bb] group-hover:text-[#ffb443] transition-colors">
            {template.name}
          </h3>
          <p className="text-xs text-[#8b7e6d] dark:text-[#edd6bb]/70 mt-1 line-clamp-2 leading-relaxed">
            {plainDescription}
          </p>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center justify-between py-2 border-y border-[#edd6bb]/15 text-xs text-[#8b7e6d]">
          <div className="flex items-center gap-1 font-extrabold text-amber-400" title="Rating Average">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{template.ratingAvg?.toFixed(1) || "5.0"}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 font-extrabold text-sky-400" title="Total Ulasan">
              <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
              <span>{template.reviewsCount || 0}</span>
            </div>

            <button
              type="button"
              onClick={() => onLikeToggle(template)}
              className={`flex items-center gap-1 font-extrabold transition-all ${
                template.isLiked ? "text-rose-500" : "hover:text-rose-400"
              }`}
              title="Total Suka"
            >
              <Heart className={`w-3.5 h-3.5 ${template.isLiked ? "fill-rose-500" : ""}`} />
              <span>{template.likesCount || 0}</span>
            </button>

            <div className="flex items-center gap-1 font-extrabold text-emerald-400" title="Total Clone">
              <Copy className="w-3.5 h-3.5" />
              <span>{template.forkCount || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex items-center justify-between gap-3">
        <Link
          href={`/templates/${template.id}`}
          className="px-3.5 py-2.5 rounded-xl glass-panel hover:bg-[#edd6bb]/15 text-xs font-extrabold text-[#edd6bb] flex items-center justify-center gap-1.5 border border-[#edd6bb]/25 transition-all hover:border-[#e1b329]/40"
        >
          <Eye className="w-3.5 h-3.5 text-[#e1b329]" />
          <span>Detail</span>
        </Link>

        {template.userId === currentUserId ? (
          <Link
            href={`/specs/${template.specId || template.id}/publish`}
            className="flex-1 py-2.5 rounded-xl bg-[#e1b329]/20 hover:bg-[#e1b329]/35 text-[#614600] dark:text-[#ffb443] font-extrabold text-xs flex items-center justify-center gap-1.5 border border-[#e1b329]/50 transition-all shadow-sm"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Configure</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => onFork(template)}
            className="flex-1 py-2.5 rounded-xl bg-[#e1b329] hover:bg-[#ffb443] text-slate-950 font-extrabold text-xs shadow-md shadow-[#e1b329]/20 flex items-center justify-center gap-1.5 transition-all transform active:scale-95"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Clone</span>
          </button>
        )}
      </div>
    </div>
  );
}
