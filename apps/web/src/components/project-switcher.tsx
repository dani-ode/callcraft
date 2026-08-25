"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Boxes, Feather, Wrench, ShieldCheck, Stethoscope, Rocket,
  Layers, Globe, Code2, Cpu, ChevronDown, Check, Plus, Settings
} from "lucide-react";
import { Project } from "@/lib/types";
import { useProject } from "@/context/project-context";

const ICON_MAP: Record<string, React.ElementType> = {
  Boxes,
  Feather,
  Wrench,
  ShieldCheck,
  Stethoscope,
  Rocket,
  Layers,
  Globe,
  Code2,
  Cpu,
};

function ProjectIcon({ icon, color, className }: { icon: string; color: string; className?: string }) {
  const Icon = ICON_MAP[icon] ?? Boxes;
  return <Icon className={className} style={{ color }} />;
}

interface ProjectSwitcherProps {
  collapsed?: boolean;
}

export function ProjectSwitcher({ collapsed = false }: ProjectSwitcherProps) {
  const { projects, activeProject, setActiveProject, isLoading } = useProject();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (isLoading) {
    return (
      <div className="px-2 mb-3">
        <div className="h-10 rounded-xl bg-[#8a715e]/10 animate-pulse" />
      </div>
    );
  }

  if (!activeProject) return null;

  return (
    <div className="relative px-2 mb-3" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        id="project-switcher-btn"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl border transition-all group hover:bg-[#8a715e]/10 dark:hover:bg-[#edd6bb]/8 ${
          open
            ? "border-[#8a715e]/30 dark:border-[#edd6bb]/20 bg-[#8a715e]/10 dark:bg-[#edd6bb]/8"
            : "border-transparent"
        }`}
        aria-label="Switch active project"
      >
        {/* Project icon badge */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
          style={{ backgroundColor: `${activeProject.color}25` }}
        >
          <ProjectIcon icon={activeProject.icon} color={activeProject.color} className="w-3.5 h-3.5" />
        </div>

        {!collapsed && (
          <>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-bold text-slate-800 dark:text-[#edd6bb] truncate leading-tight">
                {activeProject.name}
              </p>
              <p className="text-[10px] text-[#8b7e6d] font-mono truncate leading-tight">
                {activeProject.slug}
              </p>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#8b7e6d] transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
            />
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 glass-panel border border-[#8a715e]/20 dark:border-[#edd6bb]/15 rounded-2xl shadow-2xl overflow-hidden">
          {/* Projects label */}
          <div className="px-3 pt-2.5 pb-1">
            <p className="text-[10px] font-extrabold text-[#8b7e6d] uppercase tracking-wider">My Projects</p>
          </div>

          {/* Project list */}
          <div className="max-h-52 overflow-y-auto">
            {projects.map((project) => (
              <button
                key={project.id}
                id={`project-option-${project.id}`}
                onClick={() => {
                  setActiveProject(project);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 transition-colors text-left group ${
                  activeProject.id === project.id
                    ? "bg-[#8a715e]/10 dark:bg-[#edd6bb]/8"
                    : "hover:bg-[#8a715e]/8 dark:hover:bg-[#edd6bb]/5"
                }`}
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${project.color}25` }}
                >
                  <ProjectIcon icon={project.icon} color={project.color} className="w-3 h-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-[#edd6bb] truncate">{project.name}</p>
                </div>
                {activeProject.id === project.id && (
                  <Check className="w-3.5 h-3.5 shrink-0" style={{ color: project.color }} />
                )}
              </button>
            ))}
          </div>

          {/* Footer actions */}
          <div className="border-t border-[#8a715e]/15 dark:border-[#edd6bb]/10 p-1.5 space-y-0.5">
            <button
              id="new-project-btn"
              onClick={() => {
                setOpen(false);
                router.push("/projects/new");
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#e1b329] hover:bg-[#e1b329]/10 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Project Baru</span>
            </button>
            <button
              id="manage-projects-btn"
              onClick={() => {
                setOpen(false);
                router.push("/projects");
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#8a715e] dark:text-[#8b7e6d] hover:bg-[#8a715e]/10 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Kelola Projects</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
