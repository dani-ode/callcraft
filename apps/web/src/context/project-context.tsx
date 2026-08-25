"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { Project } from "@/lib/types";
import { fetchProjects } from "@/lib/api/projects";
import { useAuth } from "@/context/auth-context";

const ACTIVE_PROJECT_KEY = "callcraft_active_project_id";

interface ProjectContextValue {
  projects: Project[];
  activeProject: Project | null;
  isLoading: boolean;
  hasNoProject: boolean;
  setActiveProject: (project: Project) => void;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasNoProject, setHasNoProject] = useState(false);

  const refreshProjects = useCallback(async () => {
    if (!user || user.status !== "active") {
      setIsLoading(false);
      return;
    }
    try {
      const fetched = await fetchProjects();
      setProjects(fetched);

      if (fetched.length === 0) {
        setHasNoProject(true);
        setActiveProjectState(null);
        setIsLoading(false);
        return;
      }

      setHasNoProject(false);

      // Restore persisted active project
      const persistedId = typeof window !== "undefined"
        ? localStorage.getItem(ACTIVE_PROJECT_KEY)
        : null;

      if (persistedId) {
        const found = fetched.find((p) => p.id === persistedId);
        if (found) {
          setActiveProjectState(found);
          setIsLoading(false);
          return;
        }
      }

      // Default to first project
      setActiveProjectState(fetched[0]);
      if (typeof window !== "undefined") {
        localStorage.setItem(ACTIVE_PROJECT_KEY, fetched[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.status === "active") {
      refreshProjects();
    } else {
      setIsLoading(false);
    }
  }, [user, refreshProjects]);

  // Redirect to onboarding if user has no project and is in the dashboard
  useEffect(() => {
    if (
      !isLoading &&
      hasNoProject &&
      pathname !== "/onboarding/project" &&
      !pathname.startsWith("/login") &&
      !pathname.startsWith("/register") &&
      !pathname.startsWith("/verify-email")
    ) {
      router.replace("/onboarding/project");
    }
  }, [isLoading, hasNoProject, pathname, router]);

  const setActiveProject = useCallback((project: Project) => {
    setActiveProjectState(project);
    if (typeof window !== "undefined") {
      localStorage.setItem(ACTIVE_PROJECT_KEY, project.id);
    }
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProject,
        isLoading,
        hasNoProject,
        setActiveProject,
        refreshProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return ctx;
}
